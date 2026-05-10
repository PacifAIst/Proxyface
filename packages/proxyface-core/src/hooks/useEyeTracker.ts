/**
 * useEyeTracker — camera-based head tracking, smoothed and normalized.
 *
 * Lifecycle:
 *   1. Starts in 'idle'. Does NOTHING until start() is called.
 *      This is critical for the privacy contract: no getUserMedia,
 *      no model download, no network activity until the user clicks.
 *   2. start() → requestUserMedia() → load MediaPipe → begin rAF loop.
 *   3. stop() → end tracks, halt loop, release the FaceLandmarker.
 *
 * Heavy dependency:
 *   `@mediapipe/tasks-vision` — lazy-loaded inside start() via dynamic
 *   import so the tracker contributes zero bytes to the initial bundle.
 *   Only users who enable the camera pay the cost.
 *
 * Model source:
 *   The WASM binary and .task model are loaded from a configurable
 *   base URL. Default resolves to CDN (jsdelivr) for zero-config dev.
 *   For the packaged extension / web app, step 8 will copy these into
 *   the bundle and override the base URL for full offline operation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HeadPosition, EyeTrackerStatus, TrackerState } from '../vision/types';
import {
  headPoseFromLandmarks,
  lerpPose,
  mirrorX,
  type HeadPose,
  type Landmark,
} from '../vision/landmarks';

/** Smoothing factor per frame (see spec). */
const LERP_FACTOR = 0.15;

/**
 * MediaPipe asset resolution.
 *
 * For dev convenience, defaults to the jsDelivr CDN. Step 8 replaces
 * this with a bundled copy (like we did for the emotion model in step 3).
 * Callers can override at any time via the `assetsBaseUrl` option.
 */
const DEFAULT_WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const DEFAULT_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export interface UseEyeTrackerOptions {
  /**
   * Base URL for MediaPipe's WASM binaries. Defaults to the jsDelivr CDN.
   * For production extensions, point this at a bundled directory.
   */
  wasmBaseUrl?: string;
  /**
   * URL for the FaceLandmarker .task model. Defaults to Google's CDN.
   * Override for offline / extension builds.
   */
  modelUrl?: string;
  /**
   * Mirror the horizontal axis so pupils follow the user's perception,
   * not the raw video. Default: true.
   */
  mirror?: boolean;
  /**
   * If the parent already has a video element (e.g. for a preview),
   * pass it here. Otherwise a detached <video> is created internally.
   */
  videoEl?: HTMLVideoElement | null;
}

export interface UseEyeTrackerReturn extends EyeTrackerStatus {
  /** Prompt the user for camera permission and start tracking. */
  start: () => Promise<void>;
  /** Stop tracking and release the camera. */
  stop: () => void;
}

export function useEyeTracker(options: UseEyeTrackerOptions = {}): UseEyeTrackerReturn {
  const {
    wasmBaseUrl = DEFAULT_WASM_BASE,
    modelUrl = DEFAULT_MODEL_URL,
    mirror = true,
    videoEl,
  } = options;

  const [state, setState] = useState<TrackerState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<HeadPosition>({ x: 0, y: 0 });
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);

  // --- refs (never trigger re-render) ---
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ownsVideoRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  // `unknown` because the types only exist once the dynamic import resolves.
  const landmarkerRef = useRef<{ detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks?: Landmark[][] }; close?: () => void } | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<HeadPose>({ x: 0, y: 0 });
  const lastTickRef = useRef<number>(0);
  const fpsBucketStartRef = useRef<number>(0);
  const fpsBucketFramesRef = useRef<number>(0);
  const totalFramesRef = useRef<number>(0);

  // Keep the external videoEl ref in sync.
  useEffect(() => {
    if (videoEl) {
      videoRef.current = videoEl;
      ownsVideoRef.current = false;
    }
  }, [videoEl]);

  // --- teardown ---
  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    if (landmarkerRef.current?.close) {
      try {
        landmarkerRef.current.close();
      } catch {
        /* ignore; some versions of the task don't expose close() */
      }
    }
    landmarkerRef.current = null;
    if (ownsVideoRef.current && videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.remove();
      videoRef.current = null;
      ownsVideoRef.current = false;
    }
    smoothedRef.current = { x: 0, y: 0 };
    setPosition({ x: 0, y: 0 });
    setFps(0);
    setState('idle');
    setError(null);
  }, []);

  // Tear down automatically on unmount.
  useEffect(() => stop, [stop]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker) return;

    const now = performance.now();

    // MediaPipe's `detectForVideo` expects a monotonic timestamp in ms.
    // It ignores frames with timestamps that don't advance, so we
    // guard against back-to-back calls on the same frame.
    if (now <= lastTickRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    lastTickRef.current = now;

    try {
      const result = landmarker.detectForVideo(video, now);
      const landmarks = result.faceLandmarks?.[0];
      const raw = headPoseFromLandmarks(landmarks);
      if (raw) {
        const posed = mirror ? mirrorX(raw) : raw;
        smoothedRef.current = lerpPose(smoothedRef.current, posed, LERP_FACTOR);
        // Only commit to React state on changes above the rendering noise
        // floor (~0.5% of the -1..1 range). Avoids setState storms.
        const prev = positionRef.current;
        const next = smoothedRef.current;
        if (Math.abs(prev.x - next.x) > 0.005 || Math.abs(prev.y - next.y) > 0.005) {
          positionRef.current = next;
          setPosition(next);
        }
      } else {
        // No face detected — drift back to center.
        smoothedRef.current = lerpPose(smoothedRef.current, { x: 0, y: 0 }, LERP_FACTOR / 2);
      }
    } catch (err) {
      console.warn('[ProxyFace eyeTracker] detect error:', err);
    }

    // FPS bucket: roll every 1000ms.
    totalFramesRef.current += 1;
    fpsBucketFramesRef.current += 1;
    if (now - fpsBucketStartRef.current >= 1000) {
      const secs = (now - fpsBucketStartRef.current) / 1000;
      setFps(Math.round(fpsBucketFramesRef.current / secs));
      setFrameCount(totalFramesRef.current);
      fpsBucketStartRef.current = now;
      fpsBucketFramesRef.current = 0;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [mirror]);

  // Mirror for the "don't re-render on tiny changes" check above.
  const positionRef = useRef<HeadPosition>({ x: 0, y: 0 });

  const start = useCallback(async () => {
    if (state === 'active' || state === 'requesting' || state === 'loading-model') return;
    setError(null);
    setState('requesting');

    // --- 1. request camera ---
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // Low-ish resolution is fine for face tracking and keeps CPU
          // pressure down. MediaPipe resamples internally anyway.
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: false,
      });
    } catch (err) {
      const name = (err as { name?: string }).name ?? 'Error';
      // NotAllowedError → user clicked deny (or a permissions policy blocked it).
      // NotFoundError → no camera hardware.
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setState('denied');
      } else {
        setError((err as Error).message ?? name);
        setState('error');
      }
      return;
    }
    streamRef.current = stream;

    // --- 2. prepare video element ---
    let video = videoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      // Keep it off-DOM — MediaPipe only needs the HTMLVideoElement,
      // not the DOM-rendered pixels.
      videoRef.current = video;
      ownsVideoRef.current = true;
    }
    video.srcObject = stream;
    try {
      await video.play();
    } catch (err) {
      setError(`video.play() failed: ${(err as Error).message}`);
      setState('error');
      return;
    }

    // --- 3. load MediaPipe (dynamic import — pays no cost until now) ---
    setState('loading-model');
    let FilesetResolver: typeof import('@mediapipe/tasks-vision').FilesetResolver;
    let FaceLandmarker: typeof import('@mediapipe/tasks-vision').FaceLandmarker;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- dynamic import
      const mod = await import('@mediapipe/tasks-vision');
      FilesetResolver = mod.FilesetResolver;
      FaceLandmarker = mod.FaceLandmarker;
    } catch (err) {
      setError(`@mediapipe/tasks-vision failed to load: ${(err as Error).message}`);
      setState('error');
      for (const t of stream.getTracks()) t.stop();
      streamRef.current = null;
      return;
    }

    try {
      const fileset = await FilesetResolver.forVisionTasks(wasmBaseUrl);
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: modelUrl,
          // GPU delegate runs a lot faster when supported; falls back
          // to CPU automatically if WebGL isn't available.
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      landmarkerRef.current = landmarker as unknown as typeof landmarkerRef.current extends null ? never : typeof landmarker;
    } catch (err) {
      setError(`MediaPipe init failed: ${(err as Error).message}`);
      setState('error');
      for (const t of stream.getTracks()) t.stop();
      streamRef.current = null;
      return;
    }

    // --- 4. start the rAF loop ---
    fpsBucketStartRef.current = performance.now();
    fpsBucketFramesRef.current = 0;
    totalFramesRef.current = 0;
    setState('active');
    rafRef.current = requestAnimationFrame(tick);
  }, [state, wasmBaseUrl, modelUrl, tick]);

  return {
    state,
    error,
    position,
    frameCount,
    fps,
    start,
    stop,
  };
}
