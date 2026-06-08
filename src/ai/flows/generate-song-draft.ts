'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a full song draft.
 * Stability Lock (4/20/2026): Removed unstable server-side logging.
 * Update (5/14/2026): Hardened Special Instructions and Intent weaving priority.
 * Update (5/14): Restored Guardrail enforcement in the prompt template.
 */

import { ai, z } from '@/ai/genkit';
import { DirectionSchema } from './types';
import { mergeDirection } from '@/lib/utils';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { computeDraftInkCostFromRates } from '@/lib/studio-costs';
import { getStudioCosts } from '@/lib/server/studio-costs';
import type { AiSecuredInput } from '@/lib/ai-secured';

const StyleProfileSchema = z.object({
  analysis: z.string().describe('A concise summary of the lyrical style analysis.'),
});

const SectionTemplateSchema = z.object({
  name: z.string(),
  bars: z.number(),
});

const GenerateDraftInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  albumDirection: DirectionSchema.optional(),
  trackDirection: DirectionSchema.optional(),
  useAlbumDirection: z.boolean(),
  useTrackDirection: z.boolean(),
  vibe: z.object({
    enabled: z.boolean().optional(),
    genre: z.string(),
    tempoBPM: z.number(),
    feeling: z.array(z.string()),
    instrumentation: z.string().optional(),
    productionNotes: z.string().optional(),
  }),
  intents: z.array(z.string()),
  styleProfile: StyleProfileSchema,
  sectionTemplate: z.array(SectionTemplateSchema),
  sectionsToGenerate: z.array(z.string()),
  rhymePreset: z.enum(['mantra-cadence', 'trap-soul', 'alt-rnb', 'story-aa/bb', 'custom']),
  customSchemeHint: z.string().optional(),
  constraints: z.object({
    endWith: z.record(z.string()).optional(),
    maxLineLen: z.number().optional().default(120),
  }),
  lyricsAbout: z.string().optional(),
  stylePreset: z.string().optional(),
  customStyle: z.string().optional(),
  customInstructions: z.string().optional(),
  negativePrompt: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  mustIncludeWords: z.array(z.string()).optional(),
});

export type GenerateDraftInput = z.infer<typeof GenerateDraftInputSchema>;

const GeneratedSectionSchema = z.object({
  name: z.string(),
  bars: z.number(),
  lines: z.array(z.string()),
  rhyme_notes: z.string(),
});

const GenerateDraftOutputSchema = z.object({
  sections: z.array(GeneratedSectionSchema),
  meta: z.object({
    scheme_used: z.string(),
    album_track_direction_snapshot: DirectionSchema,
    notes_for_editor: z.string(),
  }),
});

export type GenerateDraftOutput = z.infer<typeof GenerateDraftOutputSchema>;

const DraftPromptInputSchema = GenerateDraftInputSchema.extend({
  sectionTemplateString: z.string(),
  endWithConstraintsString: z.string(),
  intentsString: z.string(),
  mergedDirection: DirectionSchema,
});

export async function generateSongDraft(input: GenerateDraftInput & AiSecuredInput): Promise<GenerateDraftOutput> {
  try {
    const flowInput = stripAiAuth(input);
    const costs = await getStudioCosts();
    const inkCost = computeDraftInkCostFromRates(
      input.sectionTemplate,
      input.sectionsToGenerate,
      costs.generateDraftPerBar
    );
    return await runSecuredAiAction(
      { idToken: input.idToken, userId: input.userId, actionName: 'generateSongDraft', inkCost, customApiKey: input.customApiKey },
      () => generateDraftFlow(flowInput),
      input.userName
    );
  } catch (error: any) {
    console.error('--- DRAFT GENERATION FAILED ---', error);
    throw new Error(`Draft Failed: ${error.message || "Creative Sync Interrupted"}`);
  }
}

const draftPrompt = ai.definePrompt({
  name: 'generateDraftPrompt',
  input: { schema: DraftPromptInputSchema },
  output: { schema: GenerateDraftOutputSchema },
  prompt: `You are LyricAI Studio’s co-writer. Generate musical, modern lyrics.

**MANDATORY: STRICT ADHERENCE TO SPECIAL INSTRUCTIONS**
If the user provides specific formatting or content instructions in the 'SPECIAL INSTRUCTIONS' section, you MUST comply 100%. This takes absolute precedence.

**STRICT INTENT WEAVING:**
Incorporate the following MOTIFS (Intents) throughout the lyrics: {{{intentsString}}}. Use these concepts to drive the narrative, metaphors, and imagery of the sections. Ensure they appear naturally but frequently.

**STRICT SONG AWARENESS & REPETITION:**
1. Identify the Hook/Chorus lyrics ONCE.
2. REUSE THE EXACT SAME LYRICS for every subsequent Hook/Chorus section.

**STRICT RHYME DIVERSITY:** Do not repeat end-rhymes within sections.

{{#if negativePrompt}}
**NEGATIVE PROMPT (AVOID THESE THEMES/IDEAS):**
"{{{negativePrompt}}}"
{{/if}}

{{#if forbiddenWords.length}}
**FORBIDDEN WORDS (DO NOT USE):**
{{#each forbiddenWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}

{{#if mustIncludeWords.length}}
**MUST-INCLUDE WORDS (INTEGRATE NATURALLY):**
You MUST use the following words throughout the draft, integrating them naturally into the lyrics: {{#each mustIncludeWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}

SPECIAL INSTRUCTIONS: 
{{{lyricsAbout}}}

DIRECTION (MASTER ARCHITECTURE — merged from active Inherit Album / Track DNA toggles):
- World: {{mergedDirection.setting_world}}
- Emotion: {{mergedDirection.emotion_core}}
- Trigger: {{mergedDirection.trigger_moment}}
- Truth: {{mergedDirection.message_truth}}
- Palette: {{mergedDirection.tone_palette}}

VIBE:
- Genre: {{vibe.genre}} | BPM: {{vibe.tempoBPM}}
- Instrumentation: {{vibe.instrumentation}}

SETTINGS:
- Structure: {{{sectionTemplateString}}}

Return STRICT JSON ONLY.`,
});

const generateDraftFlow = ai.defineFlow(
  {
    name: 'generateDraftFlow',
    inputSchema: GenerateDraftInputSchema,
    outputSchema: GenerateDraftOutputSchema,
  },
  async (input) => {
    const albumDirection = input.useAlbumDirection ? (input.albumDirection ?? {}) : {};
    let trackDirection: GenerateDraftInput['trackDirection'];
    if (input.useTrackDirection) {
      trackDirection = { ...(input.trackDirection ?? {}), inheritFromAlbum: input.useAlbumDirection };
    } else if (input.useAlbumDirection) {
      trackDirection = { inheritFromAlbum: true };
    } else {
      trackDirection = { inheritFromAlbum: false };
    }
    const mergedDirection = mergeDirection(albumDirection, trackDirection);

    const promptInput: any = {
      ...input,
      mergedDirection,
      sectionTemplateString: JSON.stringify(input.sectionTemplate),
      endWithConstraintsString: JSON.stringify(input.constraints.endWith || {}),
      intentsString: JSON.stringify(input.intents || []),
    };
    
    const { output } = await draftPrompt(promptInput, getGenkitPromptOptions());
    if (!output) throw new Error("No output from drafting engine.");
    return output;
  }
);
