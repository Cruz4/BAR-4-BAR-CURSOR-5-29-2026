import { NextResponse } from 'next/server';
import { AiGateError } from '@/lib/server/ai-gate';

export const runtime = 'nodejs';

const FLOW_LOADERS = {
  findRhymes: () => import('@/ai/flows/find-rhymes').then((m) => m.findRhymes),
  suggestVibe: () => import('@/ai/flows/suggest-vibe').then((m) => m.suggestVibe),
  generateNextLine: () => import('@/ai/flows/generate-next-line').then((m) => m.generateNextLine),
  improveMyStyle: () => import('@/ai/flows/improve-my-style').then((m) => m.improveMyStyle),
  analyzeStructure: () => import('@/ai/flows/analyze-structure').then((m) => m.analyzeStructure),
  generateCoverArt: () => import('@/ai/flows/generate-cover-art').then((m) => m.generateCoverArt),
  runCreativeEffect: () => import('@/ai/flows/creative-effects').then((m) => m.runCreativeEffect),
  transcribeFreestyleAudio: () =>
    import('@/ai/flows/transcribe-freestyle-audio').then((m) => m.transcribeFreestyleAudio),
  suggestRelayDirections: () =>
    import('@/ai/flows/writers-relay').then((m) => m.suggestRelayDirections),
  generateRelayDraft: () => import('@/ai/flows/writers-relay').then((m) => m.generateRelayDraft),
  generateSongDraft: () => import('@/ai/flows/generate-song-draft').then((m) => m.generateSongDraft),
} as const;

type FlowAction = keyof typeof FLOW_LOADERS;

/** Run a secured Genkit flow without registering server actions on app pages. */
export async function POST(req: Request) {
  let body: { action?: string; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action as FlowAction;
  const input = body.input;
  const loader = action ? FLOW_LOADERS[action] : undefined;

  if (!loader || !input || typeof input !== 'object') {
    return NextResponse.json({ error: 'Invalid AI action payload' }, { status: 400 });
  }

  try {
    const run = await loader();
    const result = await run(input as never);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[api/ai/run] ${action}`, error);
    if (error instanceof AiGateError) {
      const status =
        error.code === 'RATE_LIMIT'
          ? 429
          : error.code === 'INSUFFICIENT_INK'
            ? 402
            : error.message.toLowerCase().includes('sign in')
              ? 401
              : 403;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    const message = error instanceof Error ? error.message : 'AI action failed';
    const status = message.toLowerCase().includes('sign in') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
