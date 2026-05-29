'use server';

/**
 * @fileOverview A versatile Genkit flow for a suite of creative text effects.
 * Stability Lock (4/20/2026): Removed unstable server-side logging.
 */

import { ai, z } from '@/ai/genkit';
import { DirectionSchema } from './types';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { AI_COSTS } from '@/lib/costs';

export type AiSecuredInput = { idToken: string; userId: string };

// Define tool-specific input schemas
const SimileInputSchema = z.object({ subject: z.string() });
const SoundAlikeInputSchema = z.object({ word: z.string(), looseness: z.number().min(0).max(1) });
const TwistInputSchema = z.object({ seedPhrase: z.string(), surrealism: z.number().min(0).max(1) });
const ImageChainInputSchema = z.object({ rootConcept: z.string(), chainLength: z.number().min(3).max(12) });
const POVInputSchema = z.object({
  topic: z.string(),
  perspective: z.enum(['memory', 'future self', 'object', 'enemy', 'lover', 'city', 'universe']),
});
const AlliterationInputSchema = z.object({ seedLetter: z.string(), theme: z.string() });
const AcronymInputSchema = z.object({ word: z.string() });
const BlendInputSchema = z.object({ conceptA: z.string(), conceptB: z.string() });
const MetaphorInputSchema = z.object({ subject: z.string(), metaphorFor: z.string() });

// A discriminated union for all possible tool inputs
const ToolInputsSchema = z.discriminatedUnion('tool', [
  z.object({ tool: z.literal('simile'), inputs: SimileInputSchema }),
  z.object({ tool: z.literal('sound-alike'), inputs: SoundAlikeInputSchema }),
  z.object({ tool: z.literal('twist'), inputs: TwistInputSchema }),
  z.object({ tool: z.literal('image-chain'), inputs: ImageChainInputSchema }),
  z.object({ tool: z.literal('pov'), inputs: POVInputSchema }),
  z.object({ tool: z.literal('alliteration'), inputs: AlliterationInputSchema }),
  z.object({ tool: z.literal('acronym'), inputs: AcronymInputSchema }),
  z.object({ tool: z.literal('blend'), inputs: BlendInputSchema }),
  z.object({ tool: z.literal('metaphor'), inputs: MetaphorInputSchema }),
]);

export type CreativeTool = z.infer<typeof ToolInputsSchema>['tool'];

const CreativeEffectsInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  mergedDirection: DirectionSchema,
  vibe: z.object({
    genre: z.string(),
    tempoBPM: z.number(),
    feeling: z.array(z.string()),
  }),
  intents: z.array(z.string()),
  styleProfileProfile: z.object({ analysis: z.string() }),
  sectionContext: z.object({
    name: z.string(),
    priorLines: z.array(z.string()),
    nextLines: z.array(z.string()),
  }),
  editorConstraints: z.object({
    maxLineLen: z.number(),
    rhymePreset: z.string(),
    endWith: z.string().nullable(),
    startWith: z.string().nullable(),
    mustRhyme: z.boolean(),
  }),
  toolRequest: ToolInputsSchema,
  negativePrompt: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  mustIncludeWords: z.array(z.string()).optional(),
});
export type CreativeEffectsInput = z.infer<typeof CreativeEffectsInputSchema>;

// Schema for the prompt, adding boolean flags for the selected tool
const CreativeEffectsPromptInputSchema = CreativeEffectsInputSchema.extend({
    isSimile: z.boolean().optional(),
    isSoundAlike: z.boolean().optional(),
    isTwist: z.boolean().optional(),
    isImageChain: z.boolean().optional(),
    isPOV: z.boolean().optional(),
    isAlliteration: z.boolean().optional(),
    isAcronym: z.boolean().optional(),
    isBlend: z.boolean().optional(),
    isMetaphor: z.boolean().optional(),
});


const CreativeEffectsOutputSchema = z.object({
    options: z.array(z.string()),
    notes: z.string(),
    rhyme_hint: z.enum(['internal', 'end', 'slant', 'none']),
});
export type CreativeEffectsOutput = z.infer<typeof CreativeEffectsOutputSchema>;


export async function runCreativeEffect(input: CreativeEffectsInput & AiSecuredInput): Promise<CreativeEffectsOutput> {
    const flowInput = stripAiAuth(input);
    return runSecuredAiAction(
      { idToken: input.idToken, userId: input.userId, actionName: 'runCreativeEffect', inkCost: AI_COSTS.runCreativeEffect },
      () => creativeEffectsFlow(flowInput),
      input.userName
    );
}


const effectsPrompt = ai.definePrompt({
    name: 'creativeEffectsPrompt',
    input: { schema: CreativeEffectsPromptInputSchema },
    output: { schema: CreativeEffectsOutputSchema },
    prompt: `You are LyricAI Studio’s creative co-writer. Your primary goal is to generate concise, musical, single-line lyrical suggestions that fit the provided context. Use imagery and subtext. Avoid literal exposition and corny phrasing.

CONTEXT HIERARCHY:
1. Base your response on the foundational ALBUM & TRACK DIRECTION.
2. Weave in the selected INTENTS thematically.
3. Adhere to the immediate SECTION CONTEXT and CONSTRAINTS.

**STRICT VOCABULARY UNIQUENESS: Do not reuse any last words from 'sectionContext.priorLines' or 'sectionContext.nextLines'. Every suggestion in the 'options' array must have a unique ending word that has not appeared recently. If a context line ended in 'misunderstood', you CANNOT end a suggestion with 'misunderstood'. Find a new rhyme.**

DIRECTION (merged album→track)
- Setting/World: {{mergedDirection.setting_world}}
- Emotion/Core: {{mergedDirection.emotion_core}}
- Trigger Moment: {{mergedDirection.trigger_moment}}
- Message/Truth: {{mergedDirection.message_truth}}
- Tone/Palette: {{mergedDirection.tone_palette}}

VIBE: Genre={{vibe.genre}} | BPM={{vibe.tempoBPM}} | Feeling={{vibe.feeling}}
INTENTS (light weave): {{{intents}}}
STYLE PROFILE: {{styleProfileProfile.analysis}}
SECTION CONTEXT: In a "{{sectionContext.name}}" section. Prior lines: "{{sectionContext.priorLines}}". Next lines: "{{sectionContext.nextLines}}".
CONSTRAINTS:
- Max Line Length: {{editorConstraints.maxLineLen}}
- Rhyme Preset: "{{editorConstraints.rhymePreset}}"
{{#if editorConstraints.mustRhyme}}- Must rhyme with context lines.{{/if}}
{{#if editorConstraints.startWith}}- Must start with: "{{editorConstraints.startWith}}"{{/if}}
{{#if editorConstraints.endWith}}- Must end with: "{{editorConstraints.endWith}}"{{/if}}

{{#if negativePrompt}}
NEGATIVE PROMPT: Absolutely avoid generating content related to the following themes or ideas: "{{negativePrompt}}"
{{/if}}
{{#if forbiddenWords.length}}
FORBIDDEN WORDS: Do not use any of the following words in your response: {{#each forbiddenWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}
{{#if mustIncludeWords.length}}
MUST-INCLUDE WORDS: You MUST use the following words in your response, integrating them naturally into the lyrics: {{#each mustIncludeWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}

DO:
• Respect Direction and Vibe implicitly.
• Maintain meter and rhyme feel of section.
• If endWith/startWith are set, ensure the generated line lands exactly on that phrase.
• Keep within maxLineLen.
• **Return ONLY single-line suggestions in the 'options' array. Do not generate paragraphs or multi-line verses.**

DON’T:
• Don’t overuse the same nouns.
• Don’t explain the theme; show it via images.
• Don’t return long paragraphs.

Your task is to execute the following creative tool and then **embed its output into 2-4 final, single-line lyrical suggestions** that fit the context above.

{{#if isSimile}}
Tool: Simile
Guidance: First, generate a few similes for the subject "{{toolRequest.inputs.subject}}". Then, weave the best ones into complete, context-aware lyrical lines.
{{/if}}

{{#if isSoundAlike}}
Tool: Sound-Alike
Guidance: First, generate 3-8 sound-alike/near-homophone flips for "{{toolRequest.inputs.word}}". Then, use these flips as the centerpiece for creative, context-aware lyrical lines.
{{/if}}

{{#if isTwist}}
Tool: Twist
Guidance: First, generate a few surprising twist ideas based on "{{toolRequest.inputs.seedPhrase}}". Then, format them as complete, poetic, context-aware lyrical lines.
{{/if}}

{{#if isImageChain}}
Tool: Image Chain
Guidance: First, create a {{toolRequest.inputs.chainLength}}-item associative chain from "{{toolRequest.inputs.rootConcept}}". Then, pick the most evocative items from the chain and build context-aware lyrical lines around them.
{{/if}}

{{#if isPOV}}
Tool: Point of View
Guidance: First, brainstorm a few lines about "{{toolRequest.inputs.topic}}" from the perspective of a "{{toolRequest.inputs.perspective}}". Then, refine them into complete, context-aware lyrical lines.
{{/if}}

{{#if isAlliteration}}
Tool: Alliteration
Guidance: Generate musical lines starting with "{{toolRequest.inputs.seedLetter}}" related to "{{toolRequest.inputs.theme}}". Ensure they are complete, context-aware lyrical lines.
{{/if}}

{{#if isAcronym}}
Tool: Acronym
Guidance: First, turn "{{toolRequest.inputs.word}}" into a few expanded phrases. Then, turn the best ones into complete, context-aware lyrical lines.
{{/if}}

{{#if isBlend}}
Tool: Blend
Guidance: First, blend concept A "{{toolRequest.inputs.conceptA}}" and concept B "{{toolRequest.inputs.conceptB}}". Then, use the resulting metaphors to write complete, context-aware lyrical lines.
{{/if}}

{{#if isMetaphor}}
Tool: Metaphor
Guidance: First, generate a few metaphors where "{{toolRequest.inputs.subject}}" is "{{toolRequest.inputs.metaphorFor}}". Then, weave the strongest ones into complete, context-aware lyrical lines. Avoid using "like" or "as".
{{/if}}


Return your response in STRICT JSON format with the 'options' array containing only single-line strings.
`,
});


const creativeEffectsFlow = ai.defineFlow(
    {
        name: 'creativeEffectsFlow',
        inputSchema: CreativeEffectsInputSchema,
        outputSchema: CreativeEffectsOutputSchema,
    },
    async (input) => {
        const promptInput: z.infer<typeof CreativeEffectsPromptInputSchema> = {
            ...input,
            isSimile: input.toolRequest.tool === 'simile',
            isSoundAlike: input.toolRequest.tool === 'sound-alike',
            isTwist: input.toolRequest.tool === 'twist',
            isImageChain: input.toolRequest.tool === 'image-chain',
            isPOV: input.toolRequest.tool === 'pov',
            isAlliteration: input.toolRequest.tool === 'alliteration',
            isAcronym: input.toolRequest.tool === 'acronym',
            isBlend: input.toolRequest.tool === 'blend',
            isMetaphor: input.toolRequest.tool === 'metaphor',
        };

        const { output } = await effectsPrompt(promptInput);
        return output!;
    }
);
