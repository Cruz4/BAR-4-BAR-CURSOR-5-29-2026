from PIL import Image
import numpy as np

im = Image.open(r"G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\public\Logo5.png").convert("L")
a = np.array(im)
ink = a < 180
ink[:, :28] = False
ink[:, -28:] = False
for y in range(280, 760, 12):
    n = int(ink[y].sum())
    print(f"{y:4d} {n:4d} {'*' * min(50, n // 6)}")
