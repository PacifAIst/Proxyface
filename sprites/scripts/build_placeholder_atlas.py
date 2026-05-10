#!/usr/bin/env python3
"""Generate the placeholder sprite atlas.

This is the *placeholder* artwork used by the runtime until your real
Scenario.gg → Aseprite pipeline produces a replacement. The real atlas
will drop into the same location (`packages/proxyface-core/src/assets/
sprites/`) with the same manifest shape and the runtime won't notice.

Output:
    packages/proxyface-core/src/assets/sprites/placeholder.png
    packages/proxyface-core/src/assets/sprites/placeholder.pupil.png
    packages/proxyface-core/src/assets/sprites/placeholder.manifest.json

Dimensions:
    - Frame: 256x256
    - Frames per emotion: 16 (breathing + blink cycle)
    - Emotions: 8
    - Atlas: 4096 x 2048 (16 cols × 8 rows × 256 px)
    - Pupil sprite: 48x48 (separate small image)

The artwork itself is deliberately minimal — geometric pixel shapes
in the CRT amber palette from tailwind.preset.cjs. Each emotion gets
a distinct mouth shape and eye style; breathing is a 2px bob, blink
occupies frames 7-8 of each row.

Regenerating:
    python3 sprites/scripts/build_placeholder_atlas.py
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
FRAME_W = 256
FRAME_H = 256
FRAME_COUNT = 16
EMOTIONS = [
    "IDLE", "THINKING", "HAPPY", "SAD",
    "ANGRY", "SURPRISED", "EXPLAINING", "ERROR",
]
ATLAS_W = FRAME_W * FRAME_COUNT   # 4096
ATLAS_H = FRAME_H * len(EMOTIONS)  # 2048
BLINK_FRAMES = [7, 8]  # where eyelids close

# ---------------------------------------------------------------------------
# Palette — matches packages/proxyface-core/tailwind.preset.cjs
# ---------------------------------------------------------------------------
BG = (6, 7, 13, 0)         # transparent background (alpha=0)
PHOSPHOR = (245, 185, 66)  # primary amber
PHOSPHOR_DIM = (138, 102, 31)
PHOSPHOR_GLOW = (255, 217, 122)
SHADOW = (40, 28, 8)
EYE_DARK = (6, 7, 13)
MOUTH_DARK = (20, 14, 5)

# Per-emotion accent (used for mouth color / eye effects)
EMOTION_ACCENT = {
    "IDLE":       PHOSPHOR,
    "THINKING":   (122, 215, 240),   # signal cyan
    "HAPPY":      (155, 225, 93),    # mood.happy
    "SAD":        (112, 144, 208),   # mood.sad
    "ANGRY":      (226, 85, 74),     # mood.error
    "SURPRISED":  (245, 185, 66),    # phosphor
    "EXPLAINING": (122, 215, 240),
    "ERROR":      (216, 58, 69),
}


@dataclass(frozen=True)
class DrawCtx:
    """Per-frame drawing context passed to emotion renderers."""
    draw: ImageDraw.ImageDraw
    frame_idx: int
    emotion: str
    cx: int           # frame center x (within the frame, not atlas)
    cy: int           # frame center y
    breathe_y: int    # vertical offset for breathing (0 to -2)
    is_blinking: bool


# ---------------------------------------------------------------------------
# Shape helpers — everything is pixel-aligned rectangles
# ---------------------------------------------------------------------------

def px_rect(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, color) -> None:
    """Draw a filled rect by its top-left corner + dimensions."""
    if w <= 0 or h <= 0:
        return
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=color)


def px_circle(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color) -> None:
    """Pixel-perfect circle using per-row widths (no antialiasing)."""
    for dy in range(-r, r + 1):
        # Chord half-width at this row
        chord = int(math.sqrt(max(0, r * r - dy * dy)))
        y = cy + dy
        px_rect(d, cx - chord, y, chord * 2 + 1, 1, color)


def draw_face_base(ctx: DrawCtx) -> None:
    """The phosphor head shape. Consistent across all emotions."""
    d, cx, cy = ctx.draw, ctx.cx, ctx.cy + ctx.breathe_y

    # Large soft-edged circular head (68px radius for a 256px frame — fills ~53%).
    head_r = 68
    # Rim shadow underneath gives it weight.
    px_circle(d, cx, cy + 6, head_r, SHADOW)
    px_circle(d, cx, cy, head_r, PHOSPHOR)

    # Inner highlight arc on top-left gives dimension.
    for dy in range(-head_r + 4, -head_r // 2):
        chord = int(math.sqrt(max(0, (head_r - 6) ** 2 - dy * dy)))
        y = cy + dy
        # Left quarter only
        px_rect(d, cx - chord, y, chord - 4, 1, PHOSPHOR_GLOW)


def draw_eyes(ctx: DrawCtx) -> None:
    """Eye shapes vary per emotion. Pupils are handled as a separate sprite at runtime."""
    d = ctx.draw
    cx, cy = ctx.cx, ctx.cy + ctx.breathe_y

    # Eye socket positions — same across emotions for perfect alignment
    left_ex = cx - 22
    right_ex = cx + 22
    ey = cy - 10

    if ctx.is_blinking:
        # Horizontal line for closed eyes
        px_rect(d, left_ex - 10, ey, 20, 2, EYE_DARK)
        px_rect(d, right_ex - 10, ey, 20, 2, EYE_DARK)
        return

    emotion = ctx.emotion

    if emotion == "ANGRY":
        # Narrowed slits with angry brow
        px_rect(d, left_ex - 10, ey + 2, 20, 4, EYE_DARK)
        px_rect(d, right_ex - 10, ey + 2, 20, 4, EYE_DARK)
        # Eyebrows (converging inward)
        for i in range(12):
            px_rect(d, left_ex - 12 + i, ey - 6 - (i // 3), 2, 2, EMOTION_ACCENT[emotion])
            px_rect(d, right_ex + 2 - i + 10, ey - 6 - (i // 3), 2, 2, EMOTION_ACCENT[emotion])
    elif emotion == "SAD":
        # Drooping eyes
        px_circle(d, left_ex, ey + 2, 7, EYE_DARK)
        px_circle(d, right_ex, ey + 2, 7, EYE_DARK)
        # Drooping eyebrows (outer high, inner low)
        px_rect(d, left_ex - 10, ey - 10, 12, 2, PHOSPHOR_DIM)
        px_rect(d, left_ex - 4, ey - 8, 6, 2, PHOSPHOR_DIM)
        px_rect(d, right_ex - 2, ey - 10, 12, 2, PHOSPHOR_DIM)
        px_rect(d, right_ex - 2, ey - 8, 6, 2, PHOSPHOR_DIM)
    elif emotion == "SURPRISED":
        # Wide round eyes
        px_circle(d, left_ex, ey, 10, EYE_DARK)
        px_circle(d, right_ex, ey, 10, EYE_DARK)
        # White highlight
        px_rect(d, left_ex - 3, ey - 4, 3, 3, PHOSPHOR_GLOW)
        px_rect(d, right_ex - 3, ey - 4, 3, 3, PHOSPHOR_GLOW)
    elif emotion == "HAPPY":
        # Happy arc eyes (^^)
        for i in range(11):
            dy = abs(i - 5) // 2
            px_rect(d, left_ex - 8 + i, ey - 2 + dy, 2, 2, EYE_DARK)
            px_rect(d, right_ex - 8 + i, ey - 2 + dy, 2, 2, EYE_DARK)
    elif emotion == "ERROR":
        # X-eyes (glitch)
        for i in range(-6, 7):
            px_rect(d, left_ex + i, ey + i, 2, 2, EMOTION_ACCENT[emotion])
            px_rect(d, left_ex + i, ey - i, 2, 2, EMOTION_ACCENT[emotion])
            px_rect(d, right_ex + i, ey + i, 2, 2, EMOTION_ACCENT[emotion])
            px_rect(d, right_ex + i, ey - i, 2, 2, EMOTION_ACCENT[emotion])
    else:
        # IDLE / THINKING / EXPLAINING — standard round eyes with pupils
        px_circle(d, left_ex, ey, 8, EYE_DARK)
        px_circle(d, right_ex, ey, 8, EYE_DARK)


def draw_mouth(ctx: DrawCtx) -> None:
    d = ctx.draw
    cx, cy = ctx.cx, ctx.cy + ctx.breathe_y
    my = cy + 22
    accent = EMOTION_ACCENT[ctx.emotion]
    emotion = ctx.emotion

    if emotion == "HAPPY":
        # Upward smile — arc of 16 pixels wide
        for i in range(-14, 15):
            dy = (abs(i) // 3) - 4
            px_rect(d, cx + i, my - dy, 2, 2, MOUTH_DARK)
        # Teeth highlight
        px_rect(d, cx - 10, my - 2, 20, 2, PHOSPHOR_GLOW)
    elif emotion == "SAD":
        # Downward frown
        for i in range(-12, 13):
            dy = (abs(i) // 3)
            px_rect(d, cx + i, my + dy - 2, 2, 2, MOUTH_DARK)
    elif emotion == "ANGRY":
        # Tight scowl — flat line with downward corners
        px_rect(d, cx - 14, my, 28, 3, MOUTH_DARK)
        px_rect(d, cx - 16, my + 2, 4, 2, MOUTH_DARK)
        px_rect(d, cx + 12, my + 2, 4, 2, MOUTH_DARK)
    elif emotion == "SURPRISED":
        # Circular open mouth (O)
        px_circle(d, cx, my + 2, 7, MOUTH_DARK)
        px_circle(d, cx, my + 2, 4, (60, 20, 0))
    elif emotion == "THINKING":
        # Slight asymmetric half-open — animates with frame_idx
        offset = 1 if ctx.frame_idx % 4 < 2 else 0
        px_rect(d, cx - 10, my + offset, 14, 3, MOUTH_DARK)
    elif emotion == "EXPLAINING":
        # Talking mouth — opens/closes on frame index
        opening = 1 + (ctx.frame_idx % 4)
        px_rect(d, cx - 10, my, 20, opening + 1, MOUTH_DARK)
        if opening >= 3:
            px_rect(d, cx - 8, my + 1, 16, opening - 1, (60, 40, 10))
    elif emotion == "ERROR":
        # Zigzag/glitch mouth
        for i, dy in enumerate([0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0]):
            px_rect(d, cx - 12 + i * 2, my + dy, 2, 2, MOUTH_DARK)
    else:  # IDLE
        # Calm flat-ish line with slight curve
        px_rect(d, cx - 10, my, 20, 2, MOUTH_DARK)

    # Subtle accent below the mouth (color swatch hint — helps distinguish emotions)
    px_rect(d, cx - 6, my + 14, 12, 1, accent)


def draw_emotion_extras(ctx: DrawCtx) -> None:
    """Emotion-specific accessories — tears, steam, sparkles, etc."""
    d = ctx.draw
    cx, cy = ctx.cx, ctx.cy + ctx.breathe_y
    emotion = ctx.emotion

    if emotion == "SAD":
        # Tears drop with frame cycle
        drop_y = cy + (ctx.frame_idx * 3) % 20
        px_rect(d, cx - 28, cy + drop_y - 20, 2, 3, EMOTION_ACCENT["SAD"])
        px_rect(d, cx + 28, cy + drop_y - 18, 2, 3, EMOTION_ACCENT["SAD"])
    elif emotion == "ANGRY":
        # Pulsing steam marks
        if ctx.frame_idx % 4 < 2:
            px_rect(d, cx - 50, cy - 40, 2, 6, EMOTION_ACCENT["ANGRY"])
            px_rect(d, cx - 52, cy - 42, 6, 2, EMOTION_ACCENT["ANGRY"])
            px_rect(d, cx + 48, cy - 40, 2, 6, EMOTION_ACCENT["ANGRY"])
            px_rect(d, cx + 48, cy - 42, 6, 2, EMOTION_ACCENT["ANGRY"])
    elif emotion == "SURPRISED":
        # "!" above head
        if ctx.frame_idx % 8 < 4:
            px_rect(d, cx + 42, cy - 58, 3, 10, EMOTION_ACCENT["SURPRISED"])
            px_rect(d, cx + 42, cy - 44, 3, 3, EMOTION_ACCENT["SURPRISED"])
    elif emotion == "THINKING":
        # Rotating dots above head
        angle = ctx.frame_idx * (math.pi / 8)
        for i, phase in enumerate([0, 2.1, 4.2]):
            a = angle + phase
            dx = int(18 * math.cos(a))
            dy = int(6 * math.sin(a))
            px_rect(d, cx + dx - 1, cy - 60 + dy, 3, 3, EMOTION_ACCENT["THINKING"])
    elif emotion == "HAPPY":
        # Sparkles cycling around
        if ctx.frame_idx % 4 == 0:
            px_rect(d, cx - 46, cy - 30, 2, 2, PHOSPHOR_GLOW)
            px_rect(d, cx + 48, cy - 34, 2, 2, PHOSPHOR_GLOW)
        elif ctx.frame_idx % 4 == 2:
            px_rect(d, cx - 50, cy + 10, 2, 2, PHOSPHOR_GLOW)
            px_rect(d, cx + 52, cy + 8, 2, 2, PHOSPHOR_GLOW)
    elif emotion == "ERROR":
        # Glitch scan bars
        bar_y = (ctx.frame_idx * 8) % FRAME_H
        px_rect(d, 0, bar_y, FRAME_W, 2, (216, 58, 69, 60))
    elif emotion == "EXPLAINING":
        # Hovering bullet point indicator
        if ctx.frame_idx % 4 < 2:
            px_rect(d, cx - 56, cy - 20, 3, 3, EMOTION_ACCENT["EXPLAINING"])
            px_rect(d, cx - 52, cy - 4, 3, 3, EMOTION_ACCENT["EXPLAINING"])
            px_rect(d, cx - 56, cy + 12, 3, 3, EMOTION_ACCENT["EXPLAINING"])


# ---------------------------------------------------------------------------
# Frame / atlas assembly
# ---------------------------------------------------------------------------

def build_frame(emotion: str, frame_idx: int) -> Image.Image:
    """Render a single frame into a transparent RGBA canvas."""
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")

    # Breathing: 2-frame up, 2-frame down over the 16-frame cycle
    breathe_y = 0
    phase = frame_idx % 16
    if 4 <= phase < 12:
        breathe_y = -2
    if 6 <= phase < 10:
        breathe_y = -3

    ctx = DrawCtx(
        draw=d,
        frame_idx=frame_idx,
        emotion=emotion,
        cx=FRAME_W // 2,
        cy=FRAME_H // 2,
        breathe_y=breathe_y,
        is_blinking=frame_idx in BLINK_FRAMES,
    )

    draw_face_base(ctx)
    draw_emotion_extras(ctx)
    draw_eyes(ctx)
    draw_mouth(ctx)

    return img


def build_atlas(out_png: Path) -> None:
    atlas = Image.new("RGBA", (ATLAS_W, ATLAS_H), (0, 0, 0, 0))
    for row, emotion in enumerate(EMOTIONS):
        for col in range(FRAME_COUNT):
            frame = build_frame(emotion, col)
            atlas.paste(frame, (col * FRAME_W, row * FRAME_H), frame)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    # Optimize + palette-quantize to keep the PNG small.
    # We keep RGBA because the runtime composites onto the CRT background.
    atlas.save(out_png, optimize=True)


def build_pupil_sprite(out_png: Path) -> None:
    """Separate small sprite: the mobile pupil layer that step 5 moves."""
    img = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # Phosphor-glow pupil with dark core
    px_circle(d, 24, 24, 10, PHOSPHOR_GLOW)
    px_circle(d, 24, 24, 7, EYE_DARK)
    # Small highlight dot
    px_rect(d, 20, 20, 2, 2, PHOSPHOR_GLOW)
    img.save(out_png, optimize=True)


def build_manifest(out_json: Path) -> None:
    """Write the JSON manifest matching the atlas."""
    # Per-emotion pupil anchors (same position across emotions thanks to
    # the alignment discipline, but the manifest keeps this per-row so
    # real Scenario.gg art can use different anchors if needed).
    frame_cx = FRAME_W // 2
    frame_cy = FRAME_H // 2
    anchor_left = {"x": frame_cx - 22, "y": frame_cy - 10}
    anchor_right = {"x": frame_cx + 22, "y": frame_cy - 10}

    # Emotions whose eyes don't move (narrowed, X'd, closed)
    NO_MOVE = {"ANGRY", "ERROR"}

    rows = []
    for idx, emotion in enumerate(EMOTIONS):
        if emotion in NO_MOVE:
            pupil_range = {"x": 0, "y": 0}
        else:
            pupil_range = {"x": 3, "y": 2}
        rows.append({
            "emotion": emotion,
            "row": idx,
            # Manifest declares ONE anchor per row (the face is symmetric);
            # the renderer mirrors it for the second eye at render time.
            # We use the left eye as canonical.
            "pupilAnchor": anchor_left,
            "pupilAnchorRight": anchor_right,
            "pupilRange": pupil_range,
            "blinkFrames": BLINK_FRAMES,
            "fps": {
                "IDLE": 8,
                "THINKING": 10,
                "HAPPY": 10,
                "SAD": 6,
                "ANGRY": 8,
                "SURPRISED": 12,
                "EXPLAINING": 12,
                "ERROR": 14,
            }.get(emotion, 8),
        })

    manifest = {
        "version": 1,
        "atlas": "placeholder.png",
        "pupilSprite": "placeholder.pupil.png",
        "frameSize": {"width": FRAME_W, "height": FRAME_H},
        "frameCount": FRAME_COUNT,
        "defaultFps": 8,
        "rows": rows,
        "meta": {
            "kind": "placeholder",
            "generator": "sprites/scripts/build_placeholder_atlas.py",
            "note": (
                "Replace with Scenario.gg → Aseprite output. "
                "Drop the new PNG + manifest at this path and the "
                "runtime will pick it up without code changes."
            ),
        },
    }
    out_json.write_text(json.dumps(manifest, indent=2))


def main() -> None:
    here = Path(__file__).resolve().parent
    out_dir = here.parents[1] / "packages/proxyface-core/src/assets/sprites"
    build_atlas(out_dir / "placeholder.png")
    build_pupil_sprite(out_dir / "placeholder.pupil.png")
    build_manifest(out_dir / "placeholder.manifest.json")
    atlas_size = (out_dir / "placeholder.png").stat().st_size / 1024
    print(f"Wrote atlas: {out_dir/'placeholder.png'} ({atlas_size:.1f} KB)")
    print(f"Wrote pupil: {out_dir/'placeholder.pupil.png'}")
    print(f"Wrote manifest: {out_dir/'placeholder.manifest.json'}")


if __name__ == "__main__":
    main()
