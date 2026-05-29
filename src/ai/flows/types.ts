
import { z } from 'genkit';

// This is a shared schema for creative direction.
export const DirectionSchema = z.object({
  setting_world: z.string().optional().describe('It takes place in ____.'),
  emotion_core: z.string().optional().describe('It feels like ____.'),
  trigger_moment: z.string().optional().describe('Everything changed when ____.'),
  message_truth: z.string().optional().describe('Deep down, it’s really about ____.'),
  tone_palette: z.string().optional().describe('It sounds/looks like ____.'),
});
