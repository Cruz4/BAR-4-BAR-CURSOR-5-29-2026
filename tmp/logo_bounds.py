from PIL import Image
import numpy as np

im = Image.open(r"G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\public\Logo.png").convert("L")
a = np.array(im)
ink = a < 180

# text-ish band
band = ink[310:740, :]
cols = band.sum(axis=0)
rows = band.sum(axis=1)
xs = np.where(cols > 8)[0]
ys = np.where(rows > 8)[0]
print("text x", int(xs[0]), int(xs[-1]))
print("text y", 310 + int(ys[0]), 310 + int(ys[-1]))

# full ink excluding border
core = ink[24:1000, 24:1000]
cxs = np.where(core.sum(axis=0) > 4)[0]
cys = np.where(core.sum(axis=1) > 4)[0]
print("core x", 24 + int(cxs[0]), 24 + int(cxs[-1]))
print("core y", 24 + int(cys[0]), 24 + int(cys[-1]))
