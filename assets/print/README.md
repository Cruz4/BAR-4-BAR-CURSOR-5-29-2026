# AKAsheet print assets

## Business card (`akasheet-business-card.html`)

**Creative DNA** style (pink/violet/cyan, DNA wave, stacked logo frames) using **`public/Logo.png`**.

Front copy matches `src/lib/brand.ts`: **Put Your World Within Reach** + **Lyric App & Social Music Drop Platform**.

Other highlights:

- Free **home** at `akasheet.com` (guest pressing / Artist Home playground before signup)
- **250 Ink for AI** (Co-Writer, Rhyme Pulse — bar-by-bar, not full-song generation)
- QR: `https://akasheet.com/?ref=card` (use `/welcome?ref=card` for full marketing landing instead)

Replaces legacy **Bar 4 Bar / bar4bar.ink** card art.

### Open

From repo root, open in a browser:

`assets/print/akasheet-business-card.html`

(Logo loads from `public/Logo.png` via relative path.)

### Export PDF for print

1. Chrome or Edge → **Print** (`Ctrl+P`)
2. Destination: **Save as PDF**
3. Scale: **100%** (no “Fit to page” unless your shop asks)
4. Each card includes **0.125 in bleed** on all sides (3.75 × 2.25 in total per side)

### Vendor handoff

- **Trim size:** 3.5 × 2 in  
- **Bleed:** 0.125 in  
- **Safe text:** keep copy inside ~0.1 in from trim (already padded in layout)  
- **Colors:** RGB in HTML; convert to CMYK in Illustrator/InDesign for offset print  

### Customize

- QR URL: edit the `data=` parameter in the QR `img` `src` on the back  
- Instagram handle: replace `@AKAsheet` in the back contact block  
- Copy constants also live in `src/lib/brand.ts` and `src/lib/subscription.ts` (250 Ink, support email)
