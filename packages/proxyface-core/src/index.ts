// Public surface of @proxyface/core.
// Anything imported from `@proxyface/core` by the apps must be re-exported here.

// Components
export { ProxyFacePlaceholder } from './components/ProxyFacePlaceholder';
export { ProxyFaceWithEngine } from './components/ProxyFaceWithEngine';
export { ProxyFaceWorkstation } from './components/ProxyFaceWorkstation';
export { ProxyFaceCanvas } from './components/ProxyFaceCanvas';
export { PixelFrame } from './components/PixelFrame';
export { PlaceholderFace } from './components/PlaceholderFace';
export { EngineDebugPanel } from './components/EngineDebugPanel';
export { EyeTrackerControls } from './components/EyeTrackerControls';
export { VoiceControls } from './components/VoiceControls';
export { LandingPage } from './components/LandingPage';
export { PerfMonitor } from './components/PerfMonitor';

// Platform abstraction
export {
  getURL,
  isExtensionContext,
  onMessage,
  openTab,
  sendMessage,
} from './platform/extensionApi';
export { resolveAssetUrls } from './platform/assets';
export type { AssetUrls, ResolveAssetUrlsOptions } from './platform/assets';

// Vision (eye tracking)
export {
  headPoseFromLandmarks,
  lerpPose,
  mirrorX,
  softClip,
  LM,
} from './vision/landmarks';
export type { HeadPose, Landmark } from './vision/landmarks';
export type { HeadPosition, EyeTrackerStatus, TrackerState } from './vision/types';

// Voice (STT + TTS)
export {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  getSpeechRecognitionCtor,
} from './voice/webspeech';
export type { ListenState, SpeechSegment, SpeakState, VoiceOption } from './voice/types';

// LLM page integration (host adapters + DOM stream observer)
// NOTE: kept to original 3 adapters. Web app doesn't use these but they
// stay exported for future re-introduction of the extensions.
export {
  BUILTIN_ADAPTERS,
  chatgptAdapter,
  claudeAdapter,
  geminiAdapter,
  pickAdapter,
  StreamObserver,
} from './integration';
export type { HostAdapter, StreamObserverOptions } from './integration';

// Hooks
export { PlatformProvider, usePlatform } from './hooks/usePlatform';
export { useLocalEmotion } from './hooks/useLocalEmotion';
export { useMockEmotion } from './hooks/useMockEmotion';
export { useProxyFaceState } from './hooks/useProxyFaceState';
export { useSpriteSheet } from './hooks/useSpriteSheet';
export { useEyeTracker } from './hooks/useEyeTracker';
export { useSpeechToText } from './hooks/useSpeechToText';
export { useTextToSpeech } from './hooks/useTextToSpeech';
export { useExtensionStreamBridge } from './hooks/useExtensionStreamBridge';
export type { UseExtensionStreamBridgeOptions } from './hooks/useExtensionStreamBridge';
export type { UseLocalEmotionOptions, UseLocalEmotionReturn } from './hooks/useLocalEmotion';
export type {
  UseProxyFaceStateOptions,
  UseProxyFaceStateReturn,
} from './hooks/useProxyFaceState';
export type {
  UseEyeTrackerOptions,
  UseEyeTrackerReturn,
} from './hooks/useEyeTracker';
export type {
  UseSpeechToTextOptions,
  UseSpeechToTextReturn,
} from './hooks/useSpeechToText';
export type {
  UseTextToSpeechOptions,
  UseTextToSpeechReturn,
} from './hooks/useTextToSpeech';

// Avatar rendering
export { AvatarRenderer } from './avatar/renderer';
export { loadSpriteSheet, SpriteLoadError } from './avatar/loader';
export type { RenderState } from './avatar/renderer';
export type { LoadedSpriteSheet } from './avatar/loader';
export type {
  EmotionSpriteRow,
  FrameSize,
  SpriteManifest,
  Vec2,
} from './avatar/manifest';

// ML primitives (advanced)
export { EmotionDebouncer } from './ml/debouncer';
export type { DebouncerOptions } from './ml/debouncer';
export { classifyMock } from './ml/mockClassifier';
export {
  DEFAULT_MODEL_BASE_URL,
  EMOTION_MODEL_DIR,
  REQUIRED_MODEL_FILES,
  isWebGPUSupported,
  pickPreferredBackend,
  resolveModelBaseUrl,
} from './ml/modelConfig';
export type {
  Backend,
  EmotionResult,
  EngineState,
  WorkerRequest,
  WorkerResponse,
} from './ml/types';

// Types
export { EMOTIONS } from './types';
export type { Emotion, EmotionLabel, Platform, PlatformContext } from './types';
