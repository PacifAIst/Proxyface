import { useEffect, useRef, useState } from 'react';
import { useCharacterIndex, type CharacterIndexEntry } from '../hooks/useCharacterIndex';
import { ProxyFaceCanvas } from './ProxyFaceCanvas';
import type { Emotion } from '../types';
import { RELEASES_URL } from './SiteShell';

const ROTATE_MS = 4000;
const EMOTIONS: Emotion[] = ['IDLE','THINKING','HAPPY','SAD','ANGRY','SURPRISED','EXPLAINING','ERROR'];

interface Props {
  onSelect: (id: string) => void;
  selectedId?: string;
  compact?: boolean;
  hideSelectButton?: boolean;
  onSubmitArt?: () => void;
}

export function CharacterShowroom({ onSelect, selectedId, compact = false, hideSelectButton = false, onSubmitArt }: Props) {
  const { index, loading, error } = useCharacterIndex();
  const characters = index.characters;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [emotion, setEmotion] = useState<Emotion>('IDLE');
  const [tick, setTick] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const initializedRef = useRef(false);

  const safeIdx = characters.length > 0 ? currentIdx % characters.length : 0;
  const current: CharacterIndexEntry | undefined = characters[safeIdx];

  useEffect(() => {
    if (characters.length > 1 && !initializedRef.current) {
      initializedRef.current = true;
      setCurrentIdx(Math.floor(Math.random() * characters.length));
    }
  }, [characters.length]);

  useEffect(() => {
    if (!autoRotate || characters.length <= 1) { setTick(0); return; }
    startRef.current = performance.now();
    const loop = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / ROTATE_MS);
      setTick(t);
      if (t >= 1) {
        setCurrentIdx(i => {
          const len = characters.length;
          if (len <= 1) return i;
          let next;
          do { next = Math.floor(Math.random() * len); } while (next === i);
          return next;
        });
        startRef.current = performance.now();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [autoRotate, characters.length, currentIdx]);

  useEffect(() => { setEmotion('IDLE'); }, [current?.id]);

  function pickCharacter(idx: number) { setCurrentIdx(idx); setAutoRotate(false); setTick(0); }
  function handleSelect() { if (current) onSelect(current.id); }
  function handleShare() {
    if (!current) return;
    const url = `${window.location.origin}${window.location.pathname}?proxyface=${current.id}#/demo`;
    navigator.clipboard.writeText(url).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  if (loading) return (
    <div className="rounded-sm border border-crt-700 bg-crt-900/70 p-4 text-xs text-phosphor-dim">
      loading character index...
    </div>
  );

  return (
    <div className="flex flex-col gap-3 font-mono text-phosphor">

      {/* Header */}
      {!compact && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] uppercase tracking-widest text-phosphor-glow leading-snug">
              ✦✦ Your AI Now Has a Face with Emotions, Ears, Voice and Eyes! ✦✦
            </h2>
            <p className="mt-1 text-[13px] italic text-phosphor-dim/70">
              Click "USE THIS PROXYFACE" to Select 40+ Designs + "Settings" for a local LLM (e.g., LM Studio Server) or API-based
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-[9px] uppercase tracking-widest text-phosphor-dim">
            <input type="checkbox" checked={autoRotate}
              onChange={e => setAutoRotate(e.target.checked)} className="accent-phosphor" />
            auto {ROTATE_MS / 1000}s
          </label>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-sm bg-crt-700">
        <div className="h-full bg-phosphor transition-[width] ease-linear"
          style={{ width: autoRotate ? Math.round(tick * 100) + '%' : '0%', transitionDuration: autoRotate ? '120ms' : '0ms' }} />
      </div>

      <div className="flex gap-4">

        {/* LEFT — list + buttons pinned to bottom */}
        <div className="flex w-56 min-w-56 flex-col gap-1">
          {/* Character list — fixed height so buttons stay put */}
          <ul className="flex flex-col gap-1 overflow-y-auto border border-crt-700 bg-crt-900/60 p-1 text-[11px]"
            style={{ height: '200px' }}>
            {characters.map((ch, idx) => {
              const isCurrent = idx === safeIdx;
              const isSaved = ch.id === selectedId;
              return (
                <li key={ch.id}>
                  <button type="button" onClick={() => pickCharacter(idx)}
                    className={[
                      'w-full px-2 py-1 text-left uppercase tracking-widest transition-colors',
                      isCurrent ? 'bg-phosphor/15 text-phosphor-glow' : 'text-phosphor-dim hover:bg-crt-700/40 hover:text-phosphor',
                      isSaved ? 'border-l-2 border-phosphor' : 'border-l-2 border-transparent',
                    ].join(' ')} title={ch.description || ch.name}>
                    {ch.name}{isSaved && <span className="ml-1 text-phosphor"> *</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ↓ Spacer height between list and buttons — tune this number by eye */}
          <div style={{ height: '58px' }} />

          {/* Fixed-position buttons — always same Y regardless of list content */}
          {onSubmitArt && !compact && (
            <button type="button" onClick={onSubmitArt}
              className="w-full rounded-sm border border-crt-700 bg-crt-900 py-2 text-[9px] uppercase tracking-widest text-phosphor-dim transition-colors hover:border-phosphor hover:text-phosphor">
              Submit your own art
            </button>
          )}
          {!compact && (
            <div className="flex flex-col gap-0.5">
              <a href={RELEASES_URL}
                className="flex items-center justify-center gap-2 rounded-sm border border-crt-600 bg-crt-950 py-2 text-[9px] uppercase tracking-widest text-phosphor-dim transition-colors hover:border-signal hover:bg-signal/10 hover:text-signal">
                <span>⊞ Windows</span>
                <span className="text-crt-700">·</span>
                <span>🐧 Linux</span>
              </a>
              <p className="text-center text-[7px] leading-tight text-phosphor-dim/40">
                Windows SmartScreen: More Info → Run Anyway
              </p>
            </div>
          )}
        </div>

        {/* CENTER — face + emotion buttons */}
        <div className="flex flex-1 flex-col items-center gap-3">
          {current ? (
            <ProxyFaceCanvas manifestUrl={current.manifestUrl} emotion={emotion} size={280}
              forceEmotionChange={true}
              fallback={<div className="flex h-[280px] w-[280px] items-center justify-center border border-crt-700 bg-crt-900 text-xs text-phosphor-dim">loading...</div>} />
          ) : (
            <div className="flex h-[280px] w-[280px] items-center justify-center border border-crt-700 bg-crt-900 text-xs text-phosphor-dim">no character</div>
          )}
          <div className="grid grid-cols-4 gap-1">
            {EMOTIONS.map(em => (
              <button key={em} type="button" onClick={() => setEmotion(em)}
                className={['rounded-sm border px-2 py-1 text-[9px] uppercase tracking-widest',
                  emotion === em ? 'border-phosphor bg-phosphor/15 text-phosphor-glow' : 'border-crt-700 text-phosphor-dim hover:border-phosphor hover:text-phosphor',
                ].join(' ')}>{em}</button>
            ))}
          </div>
        </div>

        {/* RIGHT — metadata on top, buttons FIXED at bottom */}
        <div className="flex w-56 min-w-56 flex-col">
          {/* Metadata — scrollable, takes available space */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {current ? (
              <div className="space-y-1.5">
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-phosphor-dim">name</div>
                  <div className="text-[14px] font-bold text-phosphor-glow">{current.name}</div>
                </div>
                {current.author && (
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-phosphor-dim">author</div>
                    <div className="text-[11px] text-phosphor">{current.author}</div>
                  </div>
                )}
                {current.description && (
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-phosphor-dim">about</div>
                    <div className="text-[11px] italic text-phosphor">{current.description}</div>
                  </div>
                )}
                {current.url && (
                  <a href={current.url} target="_blank" rel="noreferrer"
                    className="block text-[10px] text-phosphor-dim underline hover:text-phosphor">link ↗</a>
                )}
              </div>
            ) : (
              <div className="text-xs text-phosphor-dim">no characters available</div>
            )}
            {error && <div className="mt-1 text-[10px] text-mood-error">index error: {error}</div>}
          </div>

          {/* ↓ Spacer height between metadata and buttons — tune this number by eye (matches left spacer) */}
          <div style={{ height: '48px' }} />

          {/* Buttons — ALWAYS at bottom, same Y as left column buttons */}
          {current && (
            <div className="flex flex-col gap-1 shrink-0">
              {!hideSelectButton && (
                <button type="button" onClick={handleSelect}
                  className="w-full rounded-sm border border-phosphor bg-crt-900 py-2 text-[10px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-crt-950">
                  Use this ProxyFace
                </button>
              )}
              <div className="relative">
                <button type="button" onClick={handleShare}
                  className="w-full rounded-sm border border-crt-700 bg-crt-900 py-2 text-[10px] uppercase tracking-widest text-phosphor-dim transition-colors hover:border-phosphor hover:text-phosphor">
                  Share this ProxyFace ↗
                </button>
                <p className="text-center text-[7px] leading-tight text-phosphor-dim/40">
                  A link to your Proxyface will be copied
                </p>
                {shareCopied && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-mood-happy bg-crt-900 px-3 py-1 text-[9px] uppercase tracking-widest text-mood-happy shadow-lg">
                    Link copied! ✓
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
