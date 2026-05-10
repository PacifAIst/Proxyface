/**
 * Eye tracker types.
 *
 * The eye tracker watches the user's face via webcam and produces a
 * normalized head position. Downstream, that position is scaled into
 * pupil-pixel offsets by the avatar canvas.
 *
 * Why separate concerns?
 *   - The tracker only knows about faces in a video stream.
 *   - The avatar only knows about pupil offsets in frame pixels.
 *   - The scale/clamp mapping lives in ProxyFaceCanvas so the tracker
 *     is reusable (you could hook it up to a different avatar system
 *     or an accessibility control without changes).
 */

/** Normalized head position — each axis in [-1, 1]. */
export interface HeadPosition {
  /** Horizontal: -1 = user looking full-left, +1 = full-right. */
  x: number;
  /** Vertical: -1 = looking up, +1 = looking down. */
  y: number;
}

export type TrackerState =
  /** Not yet asked for permission. */
  | 'idle'
  /** User clicked "enable camera"; requesting permission. */
  | 'requesting'
  /** Downloading MediaPipe model files. */
  | 'loading-model'
  /** Actively tracking. */
  | 'active'
  /** User declined, denied, or the OS blocked access. */
  | 'denied'
  /** Something else went wrong (no camera hardware, model load fail, ...). */
  | 'error';

export interface EyeTrackerStatus {
  state: TrackerState;
  /** Non-null only when state === 'error'. */
  error: string | null;
  /** Current smoothed head position. Zero vector when inactive. */
  position: HeadPosition;
  /** Frames processed since `active` was reached. Useful for debug. */
  frameCount: number;
  /**
   * Approximate FPS over the last ~1 second. Zero when inactive.
   * Watchdog: drops below ~15 means the main thread is struggling.
   */
  fps: number;
}
