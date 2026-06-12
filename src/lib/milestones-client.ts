import { getAiAuth } from '@/lib/ai-client';

export async function claimMilestone(
  userId: string,
  milestone: 'track_complete' | 'studio_draft_complete',
  userName?: string
): Promise<void> {
  try {
    const auth = await getAiAuth();
    await fetch('/api/milestones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.idToken}`,
      },
      body: JSON.stringify({ userId, milestone, userName }),
    });
  } catch (e) {
    console.warn('[milestones]', milestone, e);
  }
}
