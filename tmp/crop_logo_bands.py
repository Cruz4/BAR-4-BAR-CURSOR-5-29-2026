from PIL import Image

src = r"G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\public\Logo.png"
out = r"G:\Bar 4 Bar App $\BAR 4 BAR FULL APP 5-28-2026 YOYO SAVE VER56\tmp"
im = Image.open(src)
bands = [
    (0, 200, "a_top"),
    (180, 340, "b_people"),
    (320, 500, "c_bar1"),
    (480, 640, "d_four"),
    (620, 760, "e_bar2"),
    (740, 1024, "f_bottom"),
]
for y0, y1, name in bands:
    im.crop((0, y0, 1024, y1)).save(f"{out}\\logo_band_{name}.png")
    print(name, y1 - y0)
