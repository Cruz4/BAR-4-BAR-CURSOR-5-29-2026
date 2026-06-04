
# Bar 4 Bar Studio: Master Blueprint (The "5/14/2026 State")

> **Pricing & tier copy (2026):** `src/lib/studio-tiers.ts` + `src/lib/stripe-catalog.ts` are the live source of truth for membership prices, Ink amounts, and feature lists shown in-app.

This document serves as the absolute source of truth for the workstation's design, logic, and alignment. No updates shall deviate from these specifications. This state is permanently locked and serves as the master reference.

## 1. Lyrical Grid & Alignment (Notebook Lockdown)
- **Red Margin Line**: Stationary at exactly `100px`.
- **Text Start Line**: Strictly at `120px`.
- **Hanging Indents**: Wrapped lyrics automatically indent to `145px` (25px offset) to maintain structural clarity.
- **Stationary Background**: Notebook lines and red margin remain fixed in the background while lyrics scroll.
- **Direct Editing**: Notepad-style permanent text areas on every line.
- **Backspace to Merge**: Pressing Backspace at the start of a line merges it into the previous line.
- **Enter to Split**: Pressing Enter in the middle of a line splits the text and creates a new bar.

## 2. Professional Logic & Hierarchy
### Economic Refill Protocol (2026 State)
- **Visitor (Free)**: **300 signup Ink** + **200 monthly residency** (additive). **1 album · 2 tracks**. System DNA/Vibe/Style presets (load-only). Three Creative Effects free (Simile, Metaphor, Sound-Alike).
- **Studio Pro Monthly ($7.77/mo)**: **1,500 Ink** monthly residency refill. Unlimited projects, full vault, all Creative Effects, Performance Mode, Freestyle.
- **Studio Pro Yearly ($4.44/mo, $53.28/yr)**: **3,444 Ink** monthly residency. **50% permanent Ink pack discount** + BYO-API key (orchestration fee).
- **Permanent Ink Packs**: 280 ($3.44) · 1,000 ($8.88) · 1,800 ($14.44) · 4,000 ($24.44) — Yearly Pro pays half at checkout.
- **Task Scaling**: See `src/lib/costs.ts` (e.g. Studio Draft 2/bar, Rhyme Pulse 10, Style Training 35).

### Generation Workstation (The ∞ Loop)
- **Compact UI**: Header and Footer reduced by 40% (p-3) to maximize center visibility.
- **Flow**: Neural Extraction (DNA & REMIX) → Analytical Extraction → Calibration Grid → Synthesis.
- **Calibration Hub (Step 10)**: Non-linear control center for mixing AI suggestions with permanent track rules.
- **DNA Vault**: Archive analytical strains with **Track Name**, **Date**, and **Time**. Reusable across any track.
- **Selective Injection**: Users can pick specific strains (Themes, Arc, POV) to apply to active track rules via the **DNA Strain Mixer**.

### Center Panel Tools
- **Rhyme Pulse**: Round push-down button (20 Ink). Initiates a single deep phonetic scan. Neural rotation animation during scan.
- **Smart Structure**: "Lyrics" button (40 Ink). Deconstructs raw pasted text into song sections.
- **3-Way Neural System**: Hover buttons (Inline), Workstation (Footer), and Co-Writer (Right).

## 3. UI Branding & Color Sync
- **Dual DNA**: Badges are color-coded (Emerald for Album DNA, Green for Track DNA).
- **Control Badges**: Cyan for END WITH, Blue for INTENTS, Red for GUARD.
- **Ink Spent Animation**: Robotic pen pulses near interaction point showing `-X Ink`, followed by a Neural Bloom at the live cursor position.

## 4. Workstation Navigation
### Left Panel (4 Sections)
1. **Track Status**: Title, SUGGEST TITLES, Performance Mode.
2. **Structure**: Section management & sorting.
3. **Vibe Suggester**: ANALYZE VIBE (25 Ink).
4. **Scene / Cover Gen**: GENERATE SCENE (30 Ink).

### Right Panel (7 Sections)
1. **DNA Suite**: Master Direction questions + DNA VAULT folder.
2. **Track Vibe**: Instrumentation + VIBE PRESET VAULT folder.
3. **Intents**: Motif management with END WITH lock.
4. **Guardrails**: NEGATIVE PROMPT, FORBIDDEN, MUST-INCLUDE.
5. **AI Co-Writer**: PREV LINE / NEXT LINE (5 Ink) + Style Training (100 Ink).
6. **Creative Effects**: Specialized Lyrical Tools (15 Ink).
7. **Scratch Pad**: Persistent Work History & Image Chains.
