import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { requireBearerUid } from '@/lib/server/render/auth';
import { assertSongGenerationEnabled } from '@/lib/server/render/feature-flags';
import { isSongGenerationSurfaceLive } from '@/lib/product-surface-modes';
import { isFalAceConfiguredAsync } from '@/lib/server/render/fal-ace-step';
import {
  isManagedRenderWorkerEnabled,
  scheduleManagedRenderJob,
  shouldAutoProcessRenderJob,
} from '@/lib/server/render/managed-worker';
import { assertCloudRenderAllowed } from '@/lib/server/render/kill-switch';
import { assertRenderQuota } from '@/lib/server/render/quota';
import { loadOwnerTrack } from '@/lib/server/render/track-loader';
import { createRenderJob } from '@/lib/server/render/job-service';
import type { RenderRoute } from '@/lib/song-generation/types';
import {
  compileInstrumentalRenderRecipe,
  compileSongRenderRecipe,
} from '@/lib/song-generation/prompt-compiler';
import { canAccessSongGeneration } from '@/lib/song-generation/entitlements';
import type { User } from '@/lib/types';
import { isStudioMaxUser } from '@/lib/subscription-products';

export const runtime = 'nodejs';

async function loadUser(uid: string): Promise<User | null> {
  const db = await getDb();
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return { ...(snap.data() as User), id: uid };
}

export async function GET(request: Request) {
  try {
    const uid = await requireBearerUid(request);
    const url = new URL(request.url);
    const albumId = url.searchParams.get('albumId')?.trim() || '';
    const trackId = url.searchParams.get('trackId')?.trim() || '';
    const db = await getDb();
    const snap = await db
      .collection(`users/${uid}/renderJobs`)
      .orderBy('createdAt', 'desc')
      .limit(40)
      .get();
    let jobs = snap.docs.map((d) => d.data());
    if (albumId) jobs = jobs.filter((j) => j.albumId === albumId);
    if (trackId) jobs = jobs.filter((j) => j.trackId === trackId);
    return NextResponse.json({ jobs });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const surfaces = await import('@/lib/server/render/feature-flags').then((m) =>
      m.getSongGenerationSurfaces()
    );
    await assertSongGenerationEnabled();
    const uid = await requireBearerUid(request);
    const user = await loadUser(uid);
    const songSurfaceLive = isSongGenerationSurfaceLive(surfaces.songGeneration);
    if (!user || !canAccessSongGeneration(user, songSurfaceLive)) {
      return NextResponse.json({ error: 'Studio Max required for song generation.' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const albumId = String(body.albumId || '');
    const trackId = String(body.trackId || '');
    let route: RenderRoute = body.route === 'local' ? 'local' : 'cloud';
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId : null;
    const seed = typeof body.seed === 'number' ? body.seed : undefined;
    const durationSec = typeof body.durationSec === 'number' ? body.durationSec : 240;

    const songGenLive = surfaces.songGeneration !== 'off';
    const cloudSurfaceLive = isSongGenerationSurfaceLive(surfaces.cloudRendering);
    const autoProcess = await shouldAutoProcessRenderJob();

    // Same-machine ACE (managed worker / local API) is not a metered cloud render.
    if (
      route === 'cloud' &&
      autoProcess &&
      (isManagedRenderWorkerEnabled() || !cloudSurfaceLive)
    ) {
      route = 'local';
    }

    if (route === 'cloud') {
      if (!songGenLive && !cloudSurfaceLive && !isManagedRenderWorkerEnabled()) {
        return NextResponse.json({ error: 'Song rendering is not enabled.' }, { status: 403 });
      }
      if (!isStudioMaxUser(user)) {
        return NextResponse.json({ error: 'Studio Max is required for song rendering.' }, { status: 403 });
      }
      if (cloudSurfaceLive && !autoProcess) {
        await assertCloudRenderAllowed();
      }
    }

    if (!(await isFalAceConfiguredAsync())) {
      return NextResponse.json(
        {
          error:
            'No song engine configured. At your desk: npm run render:local-ace. Away or PC off: use akasheet.com with Song generation on (studio cloud / Firestore fal key). Or set RENDER_ACE_MODE=auto in .env.local.',
        },
        { status: 503 }
      );
    }

    await assertRenderQuota(uid, user, route);

    const loaded = await loadOwnerTrack(uid, albumId, trackId);
    if (!loaded) return NextResponse.json({ error: 'Track not found' }, { status: 404 });

    const workKind =
      loaded.track.workKind === 'instrumental' || body.workKind === 'instrumental'
        ? 'instrumental'
        : 'song';

    const recipe =
      workKind === 'instrumental'
        ? compileInstrumentalRenderRecipe({
            track: loaded.track,
            album: loaded.album,
            durationSec,
            seed,
            musicStyleSignatureId:
              typeof body.artistSignatureId === 'string' ? body.artistSignatureId : null,
          })
        : compileSongRenderRecipe({
            track: loaded.track,
            album: loaded.album,
            durationSec,
            seed,
            artistSignatureId:
              typeof body.artistSignatureId === 'string' ? body.artistSignatureId : null,
          });

    const job = await createRenderJob({
      uid,
      user,
      albumId,
      trackId,
      kind: workKind === 'instrumental' ? 'instrumental' : 'full_song',
      workKind,
      route,
      recipe,
      deviceId,
      variantMode:
        body.variantMode === 'variation' || body.variantMode === 'refresh_sheet'
          ? body.variantMode
          : 'same_recipe',
    });

    scheduleManagedRenderJob(uid, job.id);

    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Could not create render job';
    console.error('[render/jobs POST]', err);
    if (/not connected|FAL_KEY/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    const clientError =
      /sheet needs|lyrics before|insufficient ink|cap reached|not found/i.test(message);
    return NextResponse.json({ error: message }, { status: clientError ? 400 : 500 });
  }
}
