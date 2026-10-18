#!/usr/bin/env python3
"""Extract the raised engraving lines of the seal as a white glow layer (transparent PNG/WebP).

High-pass on luminance: ridges brighter than their surroundings become opaque cream,
everything else transparent. Used for the "engraving lights up" moment on tap.

Usage: python3 tools/seal_lines.py assets/seal.webp assets/seal-lines.webp
"""
import sys

import numpy as np
from PIL import Image, ImageFilter


def main(src, dst, radius=5, gain=7.0):
    im = Image.open(src).convert("RGBA")
    alpha = np.asarray(im.split()[3]).astype(np.float32) / 255
    gray = im.convert("L")
    g = np.asarray(gray).astype(np.float32)
    blur = np.asarray(gray.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)
    hp = np.clip((g - blur) / 255 * gain, 0, 1)
    # keep the outer melted rim quieter than the stamped design
    h, w = hp.shape
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    hp *= np.clip((0.86 - r) / 0.08, 0.15, 1)
    # the empty centre disc only has brush texture, not engraving
    hp *= np.clip((r - 0.50) / 0.04, 0.05, 1)
    a = (hp * alpha * 255).astype(np.uint8)
    out = Image.new("RGBA", im.size, (255, 248, 228, 0))
    out.putalpha(Image.fromarray(a).filter(ImageFilter.GaussianBlur(.6)))
    out.save(dst, "WEBP", quality=90, method=6)
    print(dst, out.size)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
