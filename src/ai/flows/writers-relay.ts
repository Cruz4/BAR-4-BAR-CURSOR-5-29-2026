'use server';

/**
 * @fileOverview WRITER'S RELAY: AI-to-AI Architectural Transfer Workstation.
 * 
 * PHASE 1: DECONSTRUCTION - Extract DNA Patterns (suggestRelayDirections).
 * PHASE 2: SYNTHESIS - Generate Original Lyrical Body (generateRelayDraft).
 * 
 * Blueprint Lockdown (4/20/2026): ESSENCE OVER LITERALISM.
 * Update (5/23/2026): LITERAL SPECIFICITY HARDENING. AI must recognize concrete settings (e.g. McDonalds).
 * Update (5/24/2026): MANDATORY PIVOT PROTOCOL. Forcing AI to strictly follow selected paths to ensure originality.
 */

import { ai, z } from '@/ai/genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { computeRelayDraftInkCostFromRates } from '@/lib/studio-costs';
import { getStudioCosts } from '@/lib/server/studio-costs';
import { AI_COSTS } from '@/lib/costs';
import type { AiSecuredInput } from '@/lib/ai-secured';
import { normalizeRelayDirections } from '@/lib/dna-strands';
import { sanitizeLinesBannedWords, sanitizeSectionLinesRepetition } from '@/lib/server/lyric-guardrails';

// --- Phase 1 Schemas ---

const AnalysisSchema = z.object({
  themes: z.array(z.string()).default([]),
  motifs: z.array(z.string()).default([]),
  emotionalTone: z.object({
    primaryEmotion: z.string().default('neutral'),
    secondaryEmotion: z.string().default('none'),
    valence: z.coerce.number().default(50),
    intensity: z.coerce.number().default(50),
  }).default({ primaryEmotion: 'neutral', secondaryEmotion: 'none', valence: 50, intensity: 50 }),
  emotionalShift: z.string().default('N/A'),
  narrativeArc: z.string().default('N/A'),
  structure: z.string().default('N/A'),
  pov: z.string().default('First Person'),
  tense: z.string().default('Present'),
  voiceStyle: z.string().default('Modern'),
  whatMakesItWork: z.string().default('Strong rhythmic cohesion.'),
  styleAnalysis: z.string().default(''),
  styleMetrics: z.object({
    vocabularyScore: z.coerce.number().default(50),
    rhymeComplexity: z.coerce.number().default(50),
    cadenceMap: z.string().default('Neutral'),
  }).default({ vocabularyScore: 50, rhymeComplexity: 50, cadenceMap: 'Neutral' }),
});

const RelayDirectionSchema = z.object({
  name: z.string().default('Remix Direction'),
  description: z.string().default('A fresh take on the source material.'),
});

const SuggestDirectionsOutputSchema = z.object({
  analysis: AnalysisSchema,
  directions: z.array(RelayDirectionSchema).default([]),
});

// --- Phase 2 Schemas ---

const GeneratedVariantSchema = z.object({
  title: z.string().default('Untitled Draft'),
  sections: z.array(z.object({
    name: z.string(),
    bars: z.array(z.string()),
  })),
});

// --- Flow 1: Phase 1 Deconstruction ---

export async function suggestRelayDirections(input: { lyrics: string, userId?: string, userName?: string } & AiSecuredInput) {
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'analyzeRelayAssets', inkCost: AI_COSTS.analyzeRelayAssets, customApiKey: input.customApiKey },
    async () => {
      try {
        const sanitizedLyrics = (input.lyrics || '').slice(0, 8000);
        if (sanitizedLyrics.trim().length < 5) throw new Error("Lyrical input too short.");
        
        const response = await suggestDirectionsPrompt({ lyrics: sanitizedLyrics }, getGenkitPromptOptions());
        
        if (!response || !response.output) {
          throw new Error("Neural analysis returned no data.");
        }
        
        const result = response.output;
        if (!result.analysis) {
          throw new Error("DNA Extraction failed to produce analytical strains.");
        }

        const directions = normalizeRelayDirections(result.directions, result.analysis);
        if (!result.directions?.length && directions.length) {
          console.warn('[RELAY ANALYZE] Model returned no directions; using fallback pivots from analysis.');
        }

        return { analysis: result.analysis, directions };
      } catch (error: any) { 
        console.error("[RELAY ANALYZE ERROR]", error);
        throw new Error(`DNA Extraction Error: ${error.message || "The neural engine encountered an internal sync issue."}`); 
      }
    },
    input.userName
  );
}

const suggestDirectionsPrompt = ai.definePrompt({
  name: 'suggestRelayDirectionsPrompt',
  input: { schema: z.object({ lyrics: z.string() }) },
  output: { schema: SuggestDirectionsOutputSchema }, 
  config: { temperature: 0.7 },
  prompt: `You are a Professional Music Analyst for a high-end record label. Perform a DEEP DNA EXTRACTION.

**MANDATORY PROTOCOL: LITERAL SPECIFICITY**
Do not ignore the concrete physical world of the lyrics. If the lyrics mention a specific setting (e.g. McDonalds), specific objects (e.g. Cigarettes, plastic tables), or specific actions, anchor your analysis in those LITERAL details first.

**INPUT SOURCE:**
"{{{lyrics}}}"

**GOAL:**
Read for both literal imagery and technical DNA. Identify the concrete setting, specific objects, and sensory details present in the text, then translate those into writing strategies.

**REQUIRED JSON OUTPUT FIELDS:**
1. Themes: 3-6 concepts derived directly from the setting/actions (e.g., "Youthful rebellion", "Corporate sterility").
2. Emotional Tone: Primary feeling, secondary feeling, valence (0-100), intensity (0-100).
3. Emotional Shift: Detailed mood trajectory based on the input's logic.
4. Narrative Arc: Potential story progression (Beginning → Turning Point → Resolution).
5. Structure Insight: A specific songwriting structure suggested by the concept.
6. Technical Constraints: The most effective POV (First Person, Observer, etc.) and Tense (Present, Past).
7. Motifs: 4-8 literal physical objects, sensory details, or imagery patterns found or implied by the input (e.g., "Fluorescent lights", "Plastic tables", "Smoke").
8. What Makes It Work: Analysis of the "Magic" (e.g., the striking juxtaposition of the mundane and the illicit).
9. Style Extraction (styleAnalysis + styleMetrics): Capture HOW the writer writes — flow pattern, vocabulary complexity, rhyme architecture, cadence. Use the AURA-ONLY protocol: describe technique only (e.g. "staccato internal chains", "sparse declarative lines"). NEVER quote literal phrases, slang, or recurring words from the input. Provide vocabularyScore (0-100), rhymeComplexity (0-100), and cadenceMap (2-3 word rhythm label, e.g. "Lazy Couplets").

**IDEATION (12 Songwriting Pivots):**
Generate 12 HIGHLY VARIED songwriting directions. Frames these as Actionable Strategies, not just genre descriptions. These must be tied to the literal content of the input.
Examples:
- "POV Shift - The Observer" (witnessing the act)
- "Imagery Palette - Gritty Realism" (focusing on the smells/sights of the specific setting)
- "Outcome Shift - The Epiphany"
- "Tense Shift - Nostalgic Past"
- "POV Shift - Object's Perspective" (seeing the act from the perspective of an object in the room)

Each pivot should have a punchy Name and a 2-sentence Description explaining how it flips the source material creatively.

Return STRICT JSON with two top-level keys: "analysis" (object) and "directions" (array of 8–12 objects). Every directions item MUST include "name" and "description". The directions array MUST NOT be empty.`,
});

// --- Flow 2: Phase 2 Synthesis ---

export async function generateRelayDraft(input: { 
  analysis: string, 
  direction: string, 
  distanceFromSource: string,
  delivery: string,
  cleanliness: string,
  intents?: string[],
  vibe?: any,
  directionSuite?: any,
  useAlbumDirection?: boolean,
  useTrackDirection?: boolean,
  albumDirection?: any,
  trackDirection?: any,
  styleProfile?: { analysis?: string },
  specialInstructions?: string,
  negativePrompt?: string,
  forbiddenWords?: string[],
  mustIncludeWords?: string[],
  structure?: any[],
  structureGuide?: string,
  userId?: string,
  userName?: string 
} & AiSecuredInput) {
  const costs = await getStudioCosts();
  const inkCost = computeRelayDraftInkCostFromRates(input.structure, costs.generateRelayDraft);
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'generateRelayDraft', inkCost, customApiKey: input.customApiKey },
    async () => {
      try {
        const styleAnalysis = (input.styleProfile?.analysis || '').trim();
        const response = await generateRelayDraftPrompt({
          ...input,
          intentsStr: (input.intents || []).join(', '),
          vibeStr: JSON.stringify(input.vibe || {}),
          dnaStr: JSON.stringify(input.directionSuite || {}),
          albumDnaStr: input.useAlbumDirection ? JSON.stringify(input.albumDirection || {}) : '',
          trackDnaStr: input.useTrackDirection ? JSON.stringify(input.trackDirection || {}) : '',
          useAlbumDirection: !!input.useAlbumDirection,
          useTrackDirection: !!input.useTrackDirection,
          styleStr: styleAnalysis || 'NONE — do not apply artist style DNA.',
          forbiddenWords: input.forbiddenWords || [],
          mustIncludeWords: input.mustIncludeWords || [],
          specialInstructions: input.specialInstructions || 'N/A',
          structureStr: input.structure ? JSON.stringify(input.structure) : undefined,
          structureGuide: input.structureGuide?.trim() || undefined
        }, getGenkitPromptOptions());
        if (!response || !response.output) throw new Error("Synthesis failed.");

        // Hard guardrail enforcement on every generated bar.
        const forbidden = input.forbiddenWords ?? [];
        response.output.sections = response.output.sections.map((section) => {
          let bars = section.bars;
          if (forbidden.length > 0) {
            bars = sanitizeLinesBannedWords(bars, forbidden).lines;
          }
          bars = sanitizeSectionLinesRepetition(bars, { sectionName: section.name }).lines;
          return { ...section, bars };
        });
        return response.output;
      } catch (error: any) { 
        console.error("[RELAY SYNTHESIS ERROR]", error);
        throw new Error(`Synthesis Failed: ${error.message || "The workstation could not complete the neural draft."}`); 
      }
    },
    input.userName
  );
}

const generateRelayDraftPrompt = ai.definePrompt({
  name: 'generateRelayDraftPrompt',
  input: { schema: z.object({ 
    analysis: z.string(), 
    direction: z.string(), 
    distanceFromSource: z.string(), 
    delivery: z.string(), 
    cleanliness: z.string(),
    specialInstructions: z.string().optional(),
    intentsStr: z.string().optional(),
    vibeStr: z.string().optional(),
    dnaStr: z.string().optional(),
    albumDnaStr: z.string().optional(),
    trackDnaStr: z.string().optional(),
    useAlbumDirection: z.boolean().optional(),
    useTrackDirection: z.boolean().optional(),
    styleStr: z.string().optional(),
    negativePrompt: z.string().optional(),
    forbiddenWords: z.array(z.string()).optional(),
    mustIncludeWords: z.array(z.string()).optional(),
    structureStr: z.string().optional(),
    structureGuide: z.string().optional()
  }) },
  output: { schema: GeneratedVariantSchema },
  config: { temperature: 0.8 },
  prompt: `You are a Professional Songwriter. Write a COMPLETELY ORIGINAL song based on the DNA analysis and selected motifs.

**WEIGHTED REMIX PROTOCOL:**
Follow the remix pivots below using each path's influence percentage. Blend them together — do not treat any single pivot as absolute unless its weight is clearly dominant.

**STRICT ANTI-PLAGIARISM & DIVERSIFICATION:**
Do NOT reuse the same bars or metaphors from previous generations. Use the DNA strains (themes/motifs), not the source words. If a pivot asks for a "POV Shift", you MUST rewrite the narrative from that new perspective.

**REMIX PIVOTS (WEIGHTED):**
{{{direction}}}

**USER SPECIAL INSTRUCTIONS (DIRECT CREATIVE BRIEF — follow literally when present):**
"{{{specialInstructions}}}"

**INTENT MOTIFS (STRICT WEAVING):**
You are strictly required to weave these motifs into the new lyrics to ground the remix in the track's core identity: {{intentsStr}}. Use them to drive imagery and punchlines.

**STRICT STRUCTURE ENFORCEMENT:**
You MUST ONLY generate the following sections and bar counts: {{{structureStr}}}. DO NOT generate any other sections.

{{#if structureGuide}}
**EXTRACTED STRUCTURE GUIDE (from DNA analysis):**
{{{structureGuide}}}
{{/if}}

**CONSTRAINTS:**
1. **METADATA INJECTION**: Use the 'Analysis' for mood, tense, and POV.

{{#if negativePrompt}}
**NEGATIVE PROMPT (AVOID THESE THEMES/IDEAS):**
"{{{negativePrompt}}}"
{{/if}}

{{#if forbiddenWords.length}}
**FORBIDDEN WORDS (DO NOT USE):**
{{#each forbiddenWords}}- {{this}}
{{/each}}
{{/if}}

{{#if mustIncludeWords.length}}
**MUST-INCLUDE WORDS (INTEGRATE NATURALLY):**
{{#each mustIncludeWords}}- {{this}}
{{/each}}
{{/if}}

**DNA ANCHORS:**
{{{analysis}}}

**CREATIVE DNA (respect active toggles — merged master direction):**
{{#if useAlbumDirection}}
- INHERIT ALBUM (active): {{{albumDnaStr}}}
{{/if}}
{{#if useTrackDirection}}
- TRACK DNA (active): {{{trackDnaStr}}}
{{/if}}
- MERGED DIRECTION (use this as the architectural blueprint): {{{dnaStr}}}

**CONTEXT:**
- Vibe: {{vibeStr}}

{{#if styleStr}}
**ARTIST STYLE DNA (ONLY IF NOT "NONE"):**
{{{styleStr}}}
If the style string is "NONE", ignore artist style entirely.
{{/if}}

Return ONLY JSON with "title" and "sections" (array of {name, bars}). Lines must be single-line strings.`,
});
