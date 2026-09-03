
# AKAsheet: Master Blueprint (The "4/20/2026 State")

This document serves as the absolute source of truth for the workstation's design, logic, and alignment. No updates shall deviate from these specifications. This state is permanently locked and serves as the master reference.

## 1. Lyrical Grid & Alignment (Notebook Lockdown)
- **Red Margin Line**: Stationary at exactly `100px`.
- **Line Numbers**: Anchored at `50px`. Dynamic font size matching (`text-[8px]`, `text-[10px]`, `text-xs`) to stay leveled with lyrics.
- **Text Start Line**: Strictly at `120px`.
- **Row Interactivity**: Action buttons (Arrows/Trash) are z-indexed (z-50) and precision-leveled with the text within a fixed line height.
- **Stationary Background**: The notebook lines and red margin ruling MUST remain fixed in the background while the lyrics scroll over them to maintain consistent focus and eliminate vertical drift.
- **Dynamic Spacing (FINAL LOCK 4/20/2026)**:
    - **MD (Perfect Size)**: Font `24px`, Line Height `32px`. (The "Screenshot Match")
    - **LG (Authoritative)**: Font `36px`, Line Height `42px`.
    - **SM (Compact)**: Font `16px`, Line Height `22px`.
- **Direct Editing**: Notepad-style permanent text areas on every line.
- **Backspace to Merge**: Pressing Backspace at the start of a line merges it into the previous line and removes the empty bar.
- **Enter to Split**: Pressing Enter in the middle of a line splits the text at the cursor, pushes the remainder to a new line, and places the cursor at the start of the next line.

## 2. Workstation Hierarchy
### Left Panel (4 Sections Only)
1. **Track Status**: Includes Title, Suggest Titles, Performance Mode, and Export.
2. **Structure**: Section management with **Plus Dropdown** for surgical section creation.
3. **Vibe Suggester**: Lyrical mood analysis.
4. **Scene / Cover Gen**: Cinematic prompt generator. Visible as "SCENE" in collapsed mode.

### Right Panel (7 Sections Only)
1. **DNA Suite**: Master direction questions.
2. **Track Vibe**: Instrumentation and Production calibration. Includes **Vibe Preset Vault** (Pro).
3. **Intents**: Motif management with "End With" precision lock.
4. **Guardrails**: Triple-layer restrictions: Negative Prompt, Forbidden Words, Must-Include Words.
5. **AI Co-Writer**: Neural sharpening tools.
6. **Creative Effects**: Specialized lyrical tools.
7. **Scratch Pad**: Temporary work area.

## 3. UI Branding & Visual Feedback
- **Header Label**: Strictly "RHYME HIGHLIGHTER (10 Ink)".
- **Progress System**: Global header progress bar + pulsating blue glow on active bars.
- **Neural Generation Glow**: Newly generated lines pulse with a primary backdrop glow that fades over 5 seconds.
- **Vertical Centering**: All highlights and glows must be perfectly centered vertically relative to the 32px line height.

## 4. AI Logic
- **Vocabulary Diversity**: AI must NEVER repeat the same rhyme/last word in adjacent or recent bars.
- **Chorus Awareness**: Synthesis engine identifies and repeats the exact same chorus lyrics throughout a draft.
- **Smart Paste**: High-fidelity structured import using [SECTION] markers.
- **Guardrail Priority**: Every synthesis request surgically injects forbidden/must-include words into model constraints.
