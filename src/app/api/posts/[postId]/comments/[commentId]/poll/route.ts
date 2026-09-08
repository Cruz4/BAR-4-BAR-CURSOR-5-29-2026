import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { parsePostPoll, type PostPoll, type PostPollViewerState } from '@/lib/profile/post-polls';

export const runtime = 'nodejs';

async function optionalViewerId(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return (await (await getAuth()).verifyIdToken(header.slice('Bearer '.length))).uid;
  } catch {
    return null;
  }
}

function normalizeCounts(raw: unknown, poll: PostPoll): Record<string, number> {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    poll.options.map((option) => {
      const value = Number(source[option.id] || 0);
      return [option.id, Number.isFinite(value) && value > 0 ? Math.floor(value) : 0];
    })
  );
}

function viewerState(input: {
  poll: PostPoll;
  selectedOptionId?: string;
  counts: Record<string, number>;
}): PostPollViewerState {
  const hasVoted = Boolean(input.selectedOptionId);
  const resultsVisible = hasVoted || input.poll.resultsVisibility === 'always';
  return {
    hasVoted,
    ...(input.selectedOptionId ? { selectedOptionId: input.selectedOptionId } : {}),
    resultsVisible,
    ...(resultsVisible
      ? {
          counts: input.counts,
          totalVotes: Object.values(input.counts).reduce((sum, value) => sum + value, 0),
        }
      : {}),
  };
}

function validId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  try {
    const { postId, commentId } = await params;
    if (!validId(postId) || !validId(commentId)) {
      return NextResponse.json({ error: 'Invalid reply.' }, { status: 400 });
    }
    const uid = await optionalViewerId(req);
    const db = await getDb();
    const commentRef = db.doc(`posts/${postId}/comments/${commentId}`);
    const summaryRef = commentRef.collection('pollPrivate').doc('summary');
    const [commentSnap, summarySnap, voteSnap] = await Promise.all([
      commentRef.get(),
      summaryRef.get(),
      uid ? commentRef.collection('pollVotes').doc(uid).get() : Promise.resolve(null),
    ]);
    if (!commentSnap.exists) return NextResponse.json({ error: 'Reply not found.' }, { status: 404 });
    const poll = parsePostPoll(commentSnap.data()?.poll);
    if (!poll) return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
    const selectedOptionId = voteSnap?.exists && typeof voteSnap.data()?.optionId === 'string'
      ? voteSnap.data()!.optionId
      : undefined;
    const counts = normalizeCounts(summarySnap.data()?.counts, poll);
    return NextResponse.json(viewerState({ poll, selectedOptionId, counts }), {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
    });
  } catch (error) {
    console.error('[comment-poll/get]', error);
    return NextResponse.json({ error: 'Could not load poll.' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  try {
    const uid = await optionalViewerId(req);
    if (!uid) return NextResponse.json({ error: 'Sign in to vote.' }, { status: 401 });
    const { postId, commentId } = await params;
    if (!validId(postId) || !validId(commentId)) {
      return NextResponse.json({ error: 'Invalid reply.' }, { status: 400 });
    }
    const body = (await req.json().catch(() => ({}))) as { optionId?: unknown };
    const optionId = typeof body.optionId === 'string' ? body.optionId.trim() : '';
    const db = await getDb();
    const commentRef = db.doc(`posts/${postId}/comments/${commentId}`);
    const voteRef = commentRef.collection('pollVotes').doc(uid);
    const summaryRef = commentRef.collection('pollPrivate').doc('summary');

    const result = await db.runTransaction(async (tx) => {
      const [commentSnap, voteSnap, summarySnap] = await Promise.all([
        tx.get(commentRef),
        tx.get(voteRef),
        tx.get(summaryRef),
      ]);
      if (!commentSnap.exists) return { error: 'Reply not found.', status: 404 as const };
      const poll = parsePostPoll(commentSnap.data()?.poll);
      if (!poll) return { error: 'Poll not found.', status: 404 as const };
      const counts = normalizeCounts(summarySnap.data()?.counts, poll);
      if (voteSnap.exists) {
        const selectedOptionId = String(voteSnap.data()?.optionId || '');
        return {
          state: viewerState({ poll, selectedOptionId, counts }),
          unchanged: true,
        };
      }
      if (!poll.options.some((option) => option.id === optionId)) {
        return { error: 'Choose a valid poll option.', status: 400 as const };
      }
      counts[optionId] = (counts[optionId] || 0) + 1;
      const now = new Date().toISOString();
      tx.create(voteRef, { optionId, createdAt: now });
      tx.set(summaryRef, {
        counts,
        totalVotes: Object.values(counts).reduce((sum, value) => sum + value, 0),
        updatedAt: now,
      });
      return { state: viewerState({ poll, selectedOptionId: optionId, counts }) };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.state, {
      status: result.unchanged ? 409 : 200,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[comment-poll/vote]', error);
    return NextResponse.json({ error: 'Could not save vote.' }, { status: 500 });
  }
}
