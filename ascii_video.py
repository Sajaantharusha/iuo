"""
Red Glowing ASCII Video Converter (Horror Edition)
Converts input videos into glowing ASCII-art MP4 with preserved audio.

Install:
    python -m pip install numpy opencv-python pillow imageio-ffmpeg

Run:
    python ascii_video.py --input input.mp4 --output red_ascii.mp4

Optional:
    python ascii_video.py --input input.mp4 --output red_ascii.mp4 --width 120 --glow 1.4 --theme red
"""

import argparse
import functools
import os
import subprocess
import sys
import tempfile
from typing import Callable, Optional

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ASCII_RAMP = " .'`^,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

THEMES = {
    "red": {
        "glow": (255.0, 3.0, 2.0),
        "crisp": (90.0, 12.0, 0.0),
    },
    "green": {
        "glow": (10.0, 255.0, 30.0),
        "crisp": (40.0, 120.0, 30.0),
    },
    "amber": {
        "glow": (255.0, 160.0, 10.0),
        "crisp": (110.0, 60.0, 0.0),
    },
    "cyan": {
        "glow": (20.0, 230.0, 255.0),
        "crisp": (0.0, 80.0, 110.0),
    },
    "white": {
        "glow": (240.0, 240.0, 240.0),
        "crisp": (100.0, 100.0, 100.0),
    },
}


@functools.lru_cache(maxsize=16)
def load_font(font_size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load a monospace font available on the current OS."""
    candidates = [
        # Windows
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\lucon.ttf",
        r"C:\Windows\Fonts\cour.ttf",
        # macOS
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/Monaco.ttf",
        # Linux
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf",
    ]
    for path in candidates:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, font_size)
            except OSError:
                continue
    return ImageFont.load_default()


def render_ascii_frame(
    frame_bgr: np.ndarray,
    output_width: int,
    font_size: int,
    glow_strength: float,
    frame_index: int,
    theme: str = "red",
) -> np.ndarray:
    """Render one BGR video frame as a glowing ASCII image."""
    frame_h, frame_w = frame_bgr.shape[:2]

    # Monospaced glyphs are taller than they are wide; compensate to preserve shape.
    cell_w = max(4, int(font_size * 0.62))
    cell_h = max(7, int(font_size * 1.18))
    # If output_width <= 250, interpret as character columns (ASCII density);
    # otherwise interpret as target pixel width.
    if output_width <= 250:
        columns = max(20, output_width)
    else:
        columns = max(20, output_width // cell_w)
    rows = max(10, int(columns * frame_h / frame_w * cell_w / cell_h))

    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (columns, rows), interpolation=cv2.INTER_AREA)

    # Slight contrast enhancement makes details more legible in ASCII.
    gray = cv2.equalizeHist(gray)
    indices = (gray.astype(np.float32) / 255.0 * (len(ASCII_RAMP) - 1)).astype(np.int32)

    canvas_w = columns * cell_w
    canvas_h = rows * cell_h
    font = load_font(font_size)

    # Draw bright characters into a grayscale mask; intensity drives glow strength.
    mask_img = Image.new("L", (canvas_w, canvas_h), 0)
    draw = ImageDraw.Draw(mask_img)

    for y in range(rows):
        for x in range(columns):
            char = ASCII_RAMP[indices[y, x]]
            # Dark pixels become sparse/dim glyphs; bright areas use dense glyphs.
            brightness = int(65 + (gray[y, x] / 255.0) * 190)
            draw.text((x * cell_w, y * cell_h - 1), char, fill=brightness, font=font)

    # Glow layer: blur the glyph mask, then combine with a crisp character layer.
    blur_radius = max(2, int(font_size * 0.45 * max(0.6, glow_strength)))
    glow_mask = mask_img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    crisp = np.asarray(mask_img, dtype=np.float32) / 255.0
    glow = np.asarray(glow_mask, dtype=np.float32) / 255.0

    # Very subtle animated pulse, avoiding large changes from frame to frame.
    pulse = 0.88 + 0.12 * np.sin(frame_index * 0.12)
    glow = np.clip(glow * glow_strength * pulse, 0, 1)
    crisp = np.clip(crisp * 1.2, 0, 1)

    # Color composition based on selected theme
    t = THEMES.get(theme.lower(), THEMES["red"])
    out = np.zeros((canvas_h, canvas_w, 3), dtype=np.float32)
    out[:, :, 0] = np.clip(glow * t["glow"][0] + crisp * t["crisp"][0], 0, 255)
    out[:, :, 1] = np.clip(glow * t["glow"][1] + crisp * t["crisp"][1], 0, 255)
    out[:, :, 2] = np.clip(glow * t["glow"][2] + crisp * t["crisp"][2], 0, 255)

    # Dark vignette adds a cinematic look.
    yy, xx = np.mgrid[0:canvas_h, 0:canvas_w]
    nx = (xx - canvas_w / 2) / max(canvas_w / 2, 1)
    ny = (yy - canvas_h / 2) / max(canvas_h / 2, 1)
    vignette = np.clip(1.0 - 0.45 * (nx * nx + ny * ny), 0.45, 1.0)
    out *= vignette[:, :, None]

    rgb = np.clip(out, 0, 255).astype(np.uint8)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def convert_video(
    input_path: str,
    output_path: str,
    width: int = 120,
    font_size: int = 12,
    glow: float = 1.25,
    max_fps: Optional[float] = 24.0,
    theme: str = "red",
    progress_callback: Optional[Callable[[int, int, float], None]] = None,
):
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Input video not found: {input_path}")

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError("Could not open input video. Check the file format/path.")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0 or fps > 240:
        fps = 30.0
    if max_fps and max_fps > 0:
        fps = min(fps, max_fps)

    source_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    source_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    source_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if source_w <= 0 or source_h <= 0:
        cap.release()
        raise RuntimeError("Could not read video dimensions.")

    cell_w = max(4, int(font_size * 0.62))
    cell_h = max(7, int(font_size * 1.18))
    if width <= 250:
        columns = max(20, width)
    else:
        columns = max(20, width // cell_w)
    rows = max(10, int(columns * source_h / source_w * cell_w / cell_h))
    out_w = ((columns * cell_w) // 2) * 2
    out_h = ((rows * cell_h) // 2) * 2

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # Merge audio from input video if present (-map 1:a:0? avoids failure if silent)
    command = [
        ffmpeg, "-y",
        "-loglevel", "error",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "bgr24",
        "-s", f"{out_w}x{out_h}",
        "-r", f"{fps:.6f}",
        "-i", "-",
        "-i", input_path,
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        "-movflags", "+faststart",
        output_path,
    ]

    stderr_file = tempfile.TemporaryFile()
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=stderr_file)
    processed = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            source_fps = cap.get(cv2.CAP_PROP_FPS) or fps
            if max_fps and source_fps > max_fps:
                source_index = int(cap.get(cv2.CAP_PROP_POS_FRAMES)) - 1
                step = source_fps / max_fps
                if int(source_index / step) != int((source_index - 1) / step) and source_index > 0:
                    continue

            ascii_bgr = render_ascii_frame(frame, width, font_size, glow, processed, theme=theme)
            if ascii_bgr.shape[1] != out_w or ascii_bgr.shape[0] != out_h:
                ascii_bgr = cv2.resize(ascii_bgr, (out_w, out_h), interpolation=cv2.INTER_AREA)
            process.stdin.write(ascii_bgr.tobytes())
            processed += 1

            if processed % 15 == 0 or processed == source_total:
                pct = min(100.0, (processed / source_total * 100.0)) if source_total > 0 else 0.0
                if progress_callback:
                    progress_callback(processed, source_total, pct)
                if source_total > 0:
                    print(f"\rProcessing: {processed}/{source_total} frames ({pct:.1f}%)", end="", flush=True)
                else:
                    print(f"\rProcessed {processed} frames", end="", flush=True)

        process.stdin.close()
        return_code = process.wait()
        if return_code != 0:
            stderr_file.seek(0)
            err_output = stderr_file.read().decode("utf-8", errors="replace")
            raise RuntimeError("FFmpeg failed:\n" + err_output[-4000:])
    except Exception:
        if process.stdin and not process.stdin.closed:
            process.stdin.close()
        process.kill()
        process.wait()
        raise
    finally:
        stderr_file.close()
        cap.release()

    print()
    if processed == 0:
        raise RuntimeError("No frames were processed.")
    print(f"Done! Saved {processed} frames to: {os.path.abspath(output_path)}")


def main():
    parser = argparse.ArgumentParser(description="Convert a video to glowing horror ASCII-art MP4.")
    parser.add_argument("--input", "-i", required=True, help="Path to your source video")
    parser.add_argument("--output", "-o", default="red_ascii.mp4", help="Output MP4 path")
    parser.add_argument("--width", type=int, default=120, help="ASCII density / character columns (80-180 recommended)")
    parser.add_argument("--font-size", type=int, default=12, help="ASCII character size in pixels (8-16 recommended)")
    parser.add_argument("--glow", type=float, default=1.25, help="Glow strength (0.5-2.0 recommended)")
    parser.add_argument("--theme", choices=["red", "green", "amber", "cyan", "white"], default="red", help="Horror color theme")
    parser.add_argument("--max-fps", type=float, default=24, help="Maximum processed FPS; use 0 to keep source FPS")
    args = parser.parse_args()

    if args.width < 20:
        parser.error("--width should be at least 20")
    if args.font_size < 6:
        parser.error("--font-size should be at least 6")
    if args.glow <= 0:
        parser.error("--glow must be greater than 0")

    try:
        convert_video(
            args.input,
            args.output,
            args.width,
            args.font_size,
            args.glow,
            args.max_fps if args.max_fps > 0 else None,
            theme=args.theme,
        )
    except (FileNotFoundError, RuntimeError, OSError, BrokenPipeError) as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
