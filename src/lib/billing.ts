/**
 * Utility for calculating real-world USD costs for services.
 * Prices are based on current Google Gemini 2.5 Flash and Stripe rates.
 * 
 * Gemini 2.5 Flash is highly optimized and cheap:
 * - $0.10 per 1 million tokens (input)
 * - $0.40 per 1 million tokens (output)
 */

export const SERVICE_RATES = {
  // Gemini 2.5 Flash (Raw Cost)
  GEMINI_FLASH_INPUT_PER_1M: 0.10,
  GEMINI_FLASH_OUTPUT_PER_1M: 0.40,
  
  // Stripe Processing (2.9% + $0.30)
  STRIPE_PERCENTAGE: 0.029,
  STRIPE_FIXED: 0.30,

  // Firestore (Negligible but tracked for depth)
  FIRESTORE_WRITE: 0.0000006, 
};

/**
 * Estimates the USD cost of an AI action.
 * Most actions cost less than $0.0001 USD.
 */
export function estimateAiCost(action: string, responseLength: number = 100): number {
  switch (action) {
    case 'generateNextLine':
      return 0.00001; // Tiny cost for single lines
    case 'generateSongDraft':
      return 0.00008; // Average for a full song
    case 'findRhymes':
      return 0.000005; 
    case 'improveMyStyle':
      return 0.00005;
    case 'suggestVibe':
      return 0.00002;
    default:
      return 0.00001;
  }
}

/**
 * Calculates net revenue after Stripe fees.
 */
export function calculateNetRevenue(grossAmount: number): number {
  if (grossAmount <= 0) return 0;
  return grossAmount - (grossAmount * SERVICE_RATES.STRIPE_PERCENTAGE + SERVICE_RATES.STRIPE_FIXED);
}
