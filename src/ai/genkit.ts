import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const geminiApiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GOOGLE_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI(geminiApiKey ? { apiKey: geminiApiKey } : undefined),
  ],
  model: 'googleai/gemini-2.5-flash',
});

// Explicitly export z so it is available to all flows
export { z };
