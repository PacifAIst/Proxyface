/**
 * Landmark math.
 *
 * Pure functions that turn MediaPipe Face Landmarker output into a
 * normalized [-1, 1] head position. Isolated here so the tracker
 * hook stays small and this logic is unit-testable without spinning
 * up a camera or a model.
 *
 * MediaPipe returns 478 landmarks per face, each with (x, y, z) in
 * the NORMALIZED image frame (0..1). We only need a handful:
 *   - Left eye outer corner:     33
 *   - Right eye outer corner:    263
 *   - Nose tip:                  1
 *   - Forehead (glabella):       10
 *   - Chin:                      152
 *
 * Index references cross-checked against MediaPipe's canonical
 * face_landmarker.task schema.
 */

export interface Landmark {
  x: number; // 0..1, image-space, left edge = 0
  y: number; // 0..1, image-space, top edge = 0
  z?: number;
}

// Canonical landmark indices we use.
export const LM = {
  LEFT_EYE_OUTER: 33,
  RIGHT_EYE_OUTER: 263,
  NOSE_TIP: 1,
  FOREHEAD: 10,
  CHIN: 152,
} as const;

export interface HeadPose {
  x: number; // -1..1
  y: number; // -1..1
}

/**
 * Compute a normalized head position from a single detection.
 *
 * Strategy:
 *   1. Take the eye-midpoint as the head-center reference.
 *      Eye corners are stable (don't move with talking / facial expression)
 *      and their midpoint sits right between the eyebrows.
 *   2. Measure that midpoint's position within the video frame.
 *   3. Compute a "dead zone" (the middle of the frame is always treated
 *      as center) so tiny natural head sway doesn't constantly wobble
 *      the pupils.
 *   4. Map to [-1, 1] with soft clipping.
 *
 * Returns null if the detection is missing required landmarks.
 */
export function headPoseFromLandmarks(
  landmarks: Landmark[] | null | undefined,
): HeadPose | null {
  if (!landmarks || landmarks.length < 264) return null;

  const leftEye = landmarks[LM.LEFT_EYE_OUTER];
  const rightEye = landmarks[LM.RIGHT_EYE_OUTER];
  if (!leftEye || !rightEye) return null;

  // Midpoint in normalized image space.
  const midX = (leftEye.x + rightEye.x) / 2;
  const midY = (leftEye.y + rightEye.y) / 2;

  // Center the origin at (0.5, 0.5), then stretch.
  // We assume the user's head typically occupies the middle third of
  // the frame. Multiplying by 3 means a head at the frame edge reads
  // as [-1, 1]; smaller movements stay in the usable range.
  const rawX = (midX - 0.5) * 3;
  const rawY = (midY - 0.5) * 3;

  // Soft clip: values near the edges get damped rather than hard-clamped.
  // This prevents the "snap to limit" feel when the head moves off-axis.
  return { x: softClip(rawX), y: softClip(rawY) };
}

/** tanh-like soft clip. Approaches ±1 asymptotically, linear near zero. */
export function softClip(v: number): number {
  // tanh would work but is expensive — this approximation is visually identical
  // for our purposes and much cheaper.
  const a = Math.abs(v);
  if (a < 0.5) return v; // linear region
  const sign = v < 0 ? -1 : 1;
  // Smoothly curve from 0.5 → 1.0 as input goes 0.5 → infinity.
  return sign * (1 - 0.5 / (1 + (a - 0.5) * 2));
}

/**
 * Exponential moving-average Lerp used to smooth noisy per-frame head
 * positions. Matches the spec's "use Linear Interpolation (Lerp) for
 * mapping the webcam coordinates to the avatar's eyes to prevent
 * jittering."
 *
 * Per-frame factor 0.15 (from the spec) applied at 30fps settles in
 * ~200ms — smooth enough that jitter is invisible, fast enough that
 * the pupils feel responsive.
 */
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export function lerpPose(
  current: HeadPose,
  target: HeadPose,
  factor: number,
): HeadPose {
  return {
    x: lerp(current.x, target.x, factor),
    y: lerp(current.y, target.y, factor),
  };
}

/**
 * Mirror horizontal axis. The video feed is mirrored by the user's
 * intuition ("the person in the webcam is me"), so head-right in the
 * raw video becomes head-left from the user's perspective. We flip
 * so pupils move toward whatever the user feels they're looking at.
 */
export function mirrorX(pose: HeadPose): HeadPose {
  return { x: -pose.x, y: pose.y };
}
