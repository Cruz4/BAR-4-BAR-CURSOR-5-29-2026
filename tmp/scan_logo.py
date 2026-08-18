from PIL import Image
import numpy as np

im = Image.open(r"G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\public\Logo.png").convert("L")
a = np.array(im)
ink = (a < 200).sum(axis=1)
for y in range(0, 1024, 16):
    bar = "*" * min(60, int(ink[y] // 8))
    print(f"{y:4d} {ink[y]:4d} {bar}")
