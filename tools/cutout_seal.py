#!/usr/bin/env python3
"""Cut a wax seal out of its white background and save a trimmed transparent PNG.

Gemini can't return transparency, so the seal is generated on pure white. Flood-filling
from the borders removes only background connected to the edge (highlights inside the
seal survive), then the alpha edge is feathered so it sits cleanly on the paper.

Usage: python3 tools/cutout_seal.py <in.png> <out.png> [size_px]
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def main(src, dst, size=640, tol=28):
    img = Image.open(src).convert("RGB")
    a = np.asarray(img).astype(np.int16)
    h, w, _ = a.shape
    # "Background-ish" = close to white and low saturation
    near_white = (a.min(axis=2) > 255 - tol * 2) & ((a.max(axis=2) - a.min(axis=2)) < tol)

    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        q.append((0, x)); q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0)); q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if bg[y, x] or not near_white[y, x]:
            continue
        bg[y, x] = True
        if y > 0: q.append((y - 1, x))
        if y < h - 1: q.append((y + 1, x))
        if x > 0: q.append((y, x - 1))
        if x < w - 1: q.append((y, x + 1))

    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = img.convert("RGBA")
    out.putalpha(alpha)
    out = out.crop(out.getbbox())
    out.thumbnail((size, size), Image.LANCZOS)
    out.save(dst, optimize=True)
    print(dst, out.size)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 640)
