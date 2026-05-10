import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEyeTracker } from '../hooks/useEyeTracker';
import { useExtensionStreamBridge } from '../hooks/useExtensionStreamBridge';
import { useLocalEmotion } from '../hooks/useLocalEmotion';
import { useMockEmotion } from '../hooks/useMockEmotion';
import { usePlatform } from '../hooks/usePlatform';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { EngineDebugPanel } from './EngineDebugPanel';
import { EyeTrackerControls } from './EyeTrackerControls';
import { PixelFrame } from './PixelFrame';
import { ProxyFaceCanvas } from './ProxyFaceCanvas';
import { VoiceControls } from './VoiceControls';

export interface ProxyFaceWithEngineProps {
  useMock?: boolean;
  modelBaseUrl?: string;
  manifestUrl?: string;
  spritesBaseUrl?: string;
  visionWasmBaseUrl?: string;
  visionModelUrl?: string;
  avatarSize?: number;
  hideDebugPanel?: boolean;
  disableEyeTracker?: boolean;
  pupilTravelPx?: number;
  disableVoice?: boolean;
  speakEmotions?: boolean;
  /**
   * If true, listen for delta broadcasts from the extension's
   * background script and pipe them into the engine. Lets the
   * fullpage / popup react to text being streamed by ChatGPT,
   * Claude, Gemini in another tab.
   *
   * No-op outside of an extension context. Default: false.
   */
  enableExtensionBridge?: boolean;
}

/**
 * Headline composite. Wires together:
 *   - Step 3: emotion classification
 *   - Step 4: avatar canvas
 *   - Step 5: eye tracker → pupil offset
 *   - Step 6: voice (STT/TTS) and the extension content-script
 *     bridge (LLM page text → engine)
 */
export function ProxyFaceWithEngine({
  useMock = false,
  modelBaseUrl,
  manifestUrl,
  spritesBaseUrl = '/sprites/',
  visionWasmBaseUrl,
  visionModelUrl,
  avatarSize = 224,
  hideDebugPanel = false,
  disableEyeTracker = false,
  disableVoice = false,
  speakEmotions = false,
  pupilTravelPx = 8,
  enableExtensionBridge = false,
}: ProxyFaceWithEngineProps) {
  const { label, platform } = usePlatform();
  const resolvedManifestUrl = manifestUrl ?? `${spritesBaseUrl}art/placeholder/manifest.json`;

  const shared = {
    label,
    platform,
    manifestUrl: resolvedManifestUrl,
    avatarSize,
    hideDebugPanel,
    disableEyeTracker,
    disableVoice,
    speakEmotions,
    pupilTravelPx,
    visionWasmBaseUrl,
    visionModelUrl,
    enableExtensionBridge,
  };

  return useMock ? (
    <MockEngineContent {...shared} />
  ) : (
    <RealEngineContent {...shared} modelBaseUrl={modelBaseUrl} />
  );
}

interface SharedProps {
  label: string;
  platform: string;
  manifestUrl: string;
  avatarSize: number;
  hideDebugPanel: boolean;
  disableEyeTracker: boolean;
  disableVoice: boolean;
  speakEmotions: boolean;
  pupilTravelPx: number;
  visionWasmBaseUrl?: string;
  visionModelUrl?: string;
  enableExtensionBridge: boolean;
}

function RealEngineContent({
  modelBaseUrl,
  ...rest
}: SharedProps & { modelBaseUrl?: string }) {
  const engine = useLocalEmotion({ modelBaseUrl });
  return <EngineContent engine={engine} {...rest} />;
}

function MockEngineContent(props: SharedProps) {
  const engine = useMockEmotion();
  return <EngineContent engine={engine} {...props} />;
}

function EngineContent({
  engine,
  label,
  platform,
  manifestUrl,
  avatarSize,
  hideDebugPanel,
  disableEyeTracker,
  disableVoice,
  speakEmotions,
  pupilTravelPx,
  visionWasmBaseUrl,
  visionModelUrl,
  enableExtensionBridge,
}: SharedProps & { engine: ReturnType<typeof useLocalEmotion> }) {
  const tracker = useEyeTracker({
    wasmBaseUrl: visionWasmBaseUrl,
    modelUrl: visionModelUrl,
  });

  const stt = useSpeechToText({
    onSegment: (seg) => {
      // Append a period so the debouncer fires immediately on a
      // completed STT segment instead of waiting for an idle timeout.
      engine.pushText(seg.transcript + '. ');
    },
  });

  // Extension bridge: deltas from content scripts on LLM tabs.
  const onBridgeDelta = useCallback(
    (delta: string) => engine.pushText(delta),
    [engine],
  );
  const onBridgeStreamStart = useCallback(() => engine.reset(), [engine]);
  useExtensionStreamBridge({
    onDelta: onBridgeDelta,
    onStreamStart: onBridgeStreamStart,
    disabled: !enableExtensionBridge,
  });

  // TTS — speak emotion changes (demo / accessibility opt-in).
  const tts = useTextToSpeech();
  const lastSpokenEmotionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!speakEmotions || !engine.result) return;
    if (engine.result.emotion === lastSpokenEmotionRef.current) return;
    lastSpokenEmotionRef.current = engine.result.emotion;
    tts.speak(engine.result.emotion.toLowerCase());
  }, [speakEmotions, engine.result, tts]);

  const pupilOffset = useMemo(
    () => ({
      x: tracker.position.x * pupilTravelPx,
      y: tracker.position.y * pupilTravelPx,
    }),
    [tracker.position.x, tracker.position.y, pupilTravelPx],
  );

  return (
    <PixelFrame>
      <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
        <ProxyFaceCanvas
          manifestUrl={manifestUrl}
          emotion={engine.result?.emotion ?? null}
          pupilOffset={pupilOffset}
          size={avatarSize}
        />

        <h1 className="font-pixel text-[10px] uppercase tracking-[0.25em] text-phosphor [text-shadow:_0_0_8px_rgba(245,185,66,0.6)]">
          ProxyFace
        </h1>

        <div className="flex flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-signal-dim">
          <span>
            <span className="text-signal">›</span> surface: {label}
          </span>
          <span>
            <span className="text-signal">›</span> build: 0.1.0 · step 6
          </span>
        </div>

        {!hideDebugPanel && <EngineDebugPanel engine={engine} />}
        {!disableEyeTracker && <EyeTrackerControls tracker={tracker} />}
        {!disableVoice && <VoiceControls stt={stt} tts={tts} />}

        <span
          className="rounded-sm border border-crt-700 bg-crt-900/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-phosphor-dim"
          data-platform={platform}
        >
          {platform}
        </span>
      </div>
    </PixelFrame>
  );
}
