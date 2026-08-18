from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path

root = Path(r"G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56")
original = Image.open(root / "public" / "Logo.png").convert("RGB")
word_path = Path(
    r"C:\Users\jcruz\.cursor\projects\g-Bar-4-Bar-App-BAR-4-BAR-FULL-APP-5-28-2026-YOYO-SAVE-VER56\assets\akasheet-wordmark.png"
)
word = Image.open(word_path).convert("RGB")

arr = np.array(original.convert("L"))
ink = arr < 180
# Drop the full-bleed black frame so spans are the artwork only.
ink[:, :28] = False
ink[:, -28:] = False
ink[:28, :] = False
ink[-28:, :] = False

def ink_span(y0, y1):
    cols = ink[y0:y1].sum(axis=0)
    xs = np.where(cols > 6)[0]
    return int(xs[0]), int(xs[-1])

print("bar1", ink_span(336, 448))
print("four", ink_span(400, 560))
print("bar2", ink_span(592, 688))
print("tip ", ink_span(56, 300))
print("ferr", ink_span(760, 900))

# Keep original tip + people and ferrule + swoosh as-is.
# Clear only the stacked BAR 4 BAR block.
TEXT_Y0, TEXT_Y1 = 322, 696
# Clear the full original lettering block, including the long 4 stroke.
body_left, body_right = 250, 780
print("clear", body_left, TEXT_Y0, body_right, TEXT_Y1)

base = original.copy()
pixels = np.array(base)
region = pixels[TEXT_Y0:TEXT_Y1, body_left:body_right]
gray = region.mean(axis=2)
from PIL import ImageFilter
erase = Image.fromarray(np.where(gray < 210, 255, 0).astype(np.uint8))
erase = erase.filter(ImageFilter.MaxFilter(11))
em = np.array(erase) > 0
region[em] = (255, 255, 255)
pixels[TEXT_Y0:TEXT_Y1, body_left:body_right] = region
base = Image.fromarray(pixels)

# Trim wordmark to ink
warr = np.array(word.convert("L"))
wink = warr < 200
ys, xs = np.where(wink)
wtrim = word.crop((int(xs.min()) - 6, int(ys.min()) - 6, int(xs.max()) + 7, int(ys.max()) + 7))

hole_w = body_right - body_left
hole_h = TEXT_Y1 - TEXT_Y0
# Fit inside the original body width; keep one line readable.
# One-line word is wider than BAR; let it get tall enough to bridge tip and ferrule.
max_w = 720
max_h = hole_h - 8
scale = min(max_w / wtrim.width, max_h / wtrim.height)
nw = max(1, int(wtrim.width * scale))
nh = max(1, int(wtrim.height * scale))
wfit = wtrim.resize((nw, nh), Image.Resampling.LANCZOS)

# Threshold leftover gray from the generator so it stays hard black/white
wf = np.array(wfit.convert("L"))
mask = Image.fromarray(np.where(wf < 210, 255, 0).astype(np.uint8))
inked = Image.new("RGB", wfit.size, (0, 0, 0))

cx = (body_left + body_right) // 2
cy = (TEXT_Y0 + TEXT_Y1) // 2
px = cx - nw // 2
py = cy - nh // 2
base.paste(inked, (px, py), mask)

out = root / "public" / "Logo5.png"
base.save(out, "PNG")
print("wrote", out, base.size)
