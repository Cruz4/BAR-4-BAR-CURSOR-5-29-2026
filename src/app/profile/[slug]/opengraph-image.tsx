import { ImageResponse } from 'next/og';
import { getPublicArtistAvatar, getPublicProfile } from '@/lib/server/gamification';
import { rankFromXp } from '@/lib/gamification/ranks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Bar 4 Bar Artist Home';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type ImageProps = { params: Promise<{ slug: string }> };

function isUsableImg(url: string | undefined): url is string {
  if (!url?.trim()) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function ProfileOpenGraphImage({ params }: ImageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.trim() || '';

  let displayName = 'Artist';
  let rankLabel = 'Studio';
  let portrait: string | undefined;

  if (slug) {
    try {
      const profile = await getPublicProfile(slug);
      if (profile) {
        const data = profile as Record<string, unknown>;
        if (typeof data.displayName === 'string' && data.displayName.trim()) {
          displayName = data.displayName.trim();
        }
        const xp = Number(data.xp || 0);
        const rank = rankFromXp(xp, true);
        rankLabel =
          typeof data.rankLabel === 'string' && data.rankLabel.trim()
            ? data.rankLabel.trim()
            : rank.label;
        const avatar = await getPublicArtistAvatar(slug);
        const cover = Array.isArray(data.albumCoverUrls)
          ? data.albumCoverUrls.find((u): u is string => typeof u === 'string' && isUsableImg(u))
          : undefined;
        portrait = isUsableImg(avatar) ? avatar : isUsableImg(cover) ? cover : undefined;
      }
    } catch {
      /* fall through to branded defaults */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 56,
          background: 'linear-gradient(145deg, #061018 0%, #0b1c2e 45%, #020617 100%)',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 18% 20%, rgba(56,189,248,0.22), transparent 42%), radial-gradient(circle at 88% 78%, rgba(167,139,250,0.18), transparent 40%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#7dd3fc',
            }}
          >
            BAR 4 BAR
          </div>
          <div style={{ fontSize: 20, color: 'rgba(248,250,252,0.45)' }}>Artist Home</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 40, zIndex: 1 }}>
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portrait}
              alt=""
              width={220}
              height={220}
              style={{
                width: 220,
                height: 220,
                borderRadius: 28,
                objectFit: 'cover',
                border: '3px solid rgba(125,211,252,0.45)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
              }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(14,165,233,0.15)',
                border: '3px solid rgba(125,211,252,0.35)',
                fontSize: 84,
                fontWeight: 800,
                color: '#7dd3fc',
              }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#38bdf8',
              }}
            >
              {rankLabel}
            </div>
            <div style={{ fontSize: 24, color: 'rgba(248,250,252,0.62)', lineHeight: 1.35 }}>
              Studio profile on bar4bar.ink — trophies, live drops, and Artist Home.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1,
            fontSize: 22,
            color: 'rgba(248,250,252,0.5)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span>Open profile</span>
          <span>bar4bar.ink/profile/{slug || '…'}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
