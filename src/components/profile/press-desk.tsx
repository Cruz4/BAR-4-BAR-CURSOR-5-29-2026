'use client';

/**
 * Edit Public Page — the one-panel Artist Home customizer.
 * Seed a bar → four faders → module deck. The skin is pressed from the
 * artist's own writing; this panel only mixes what the engine composes.
 */

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Disc3,
  Dna,
  ExternalLink,
  Eye,
  Fingerprint,
  LayoutGrid,
  Loader2,
  Lock,
  Mail,
  PenLine,
  Quote,
  Save,
  SlidersHorizontal,
  Sparkles,
  User,
  Wind,
  RotateCcw,
  Orbit,
  Link2,
  Trash2,
  Shuffle,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { useLockFeature } from '@/hooks/use-lock-feature';
import { firstDropsFeeCashoutLine, firstDropsPitch, shareCommerceFlags } from '@/lib/drop-commerce';
import { DataContext } from '@/context/data-context';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import type { Album, Track } from '@/lib/types';
import { processProfilePhotoFile } from '@/lib/cover-art';
import {
  pressTokens,
  pressingCssVars,
  pressingTypeClass,
  type PressingFaders,
} from '@/lib/profile/pressing';
import { LivingPressField } from '@/components/profile/living-press-field';
import {
  MODULE_META,
  defaultModules,
  type ArtistHomeConfig,
  type ProfileModuleSetting,
  type RhymeFingerprint,
} from '@/lib/profile/modules';
import { parseEmbedUrl, EMBED_HELP_TEXT } from '@/lib/profile/embeds';
import { SOCIAL_PROVIDERS } from '@/lib/profile/social-links';
import { CONTACT_MAX_CHARS } from '@/lib/profile/contact';
import { ProfileVoiceMemoEditor } from '@/components/profile/profile-voice-memo-editor';
import { deleteVoiceStorage } from '@/lib/profile/voice-notes';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { FingerprintSvg } from '@/components/profile/rhyme-fingerprint-svg';
import { BarBoardView } from '@/components/profile/bar-board-module';
import {
  BOARD_MAX_PINS,
  createBoardPin,
} from '@/lib/profile/bar-board';
import { AlbumCoverCollage } from '@/components/gamification/album-cover-collage';
import { ProfileInitialsStar } from '@/components/profile/profile-initials-star';
import { StudioLoader } from '@/components/studio-loader';
import {
  fetchArtistHomeConfig,
  saveArtistHomeConfigClient,
} from '@/lib/profile/artist-home-client';
import { fetchGamificationSummary, patchGamificationSettings } from '@/lib/gamification-client';
import type { GamificationSummary } from '@/lib/gamification/types';
import { STUDIO_RANKS } from '@/lib/gamification/ranks';
import { getAchievement } from '@/lib/gamification/achievements';
import { ArtistHome } from '@/components/profile/artist-home';
import { LiveDnaDropsManage } from '@/components/scene/scene-live-drops-strip';
import { PublishOpenLockPanel } from '@/components/lock/publish-open-lock-panel';
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import { studioChromeFromUser } from '@/lib/studio-tier-chrome';
import { VesperfoldForge } from '@/components/profile/vesperfold-forge';
import {
  normalizeVesperfoldSeed,
  sanitizeVesperfoldSlots,
  unpackVesperfold,
  VESPERFOLD_SLOT_LIMIT,
  type VesperfoldSlot,
} from '@/lib/profile/vesperfold';

const MAX_HERO_COLLAGE = 9;

// ---------------------------------------------------------------------------
// Vault flattening helpers
// ---------------------------------------------------------------------------

type VaultBar = {
  text: string;
  albumTitle: string;
  trackTitle: string;
  trackShareId?: string;
  rhymeKey?: string;
};

function collectVaultBars(albums: Album[]): VaultBar[] {
  const bars: VaultBar[] = [];
  for (const album of albums) {
    for (const track of album.tracks || []) {
      const shareId = track.isPublic && track.shareId ? track.shareId : undefined;
      for (const section of track.sections || []) {
        for (const bar of section.bars || []) {
          const text = (bar.text || '').trim();
          if (!text) continue;
          bars.push({
            text,
            albumTitle: album.title,
            trackTitle: track.title,
            trackShareId: shareId,
            rhymeKey: bar.rhymeKey,
          });
        }
      }
    }
  }
  return bars;
}

type DnaCandidate = { label: string; text: string };

const DIRECTION_LABELS: Array<[keyof NonNullable<Album['direction']>, string]> = [
  ['setting_world', 'World'],
  ['emotion_core', 'Feels like'],
  ['trigger_moment', 'The moment'],
  ['message_truth', 'The truth'],
  ['tone_palette', 'Tone'],
];

function collectDnaCandidates(albums: Album[]): DnaCandidate[] {
  const candidates: DnaCandidate[] = [];
  for (const album of albums) {
    const direction = album.direction;
    if (!direction) continue;
    for (const [key, label] of DIRECTION_LABELS) {
      const value = direction[key];
      if (typeof value === 'string' && value.trim()) {
        candidates.push({ label: `${album.title} · ${label}`, text: value.trim().slice(0, 160) });
      }
    }
  }
  return candidates.slice(0, 12);
}

function computeFingerprint(
  track: Track,
  meta?: { sourceLabel?: string; sourceKey?: string }
): RhymeFingerprint | null {
  const bars = (track.sections || [])
    .flatMap((s) => s.bars || [])
    .filter((b) => (b.text || '').trim())
    .slice(0, 16);
  if (bars.length < 2) return null;
  const groupByKey = new Map<string, number>();
  const rhyme: number[] = [];
  const syllables: number[] = [];
  for (const bar of bars) {
    const key = bar.rhymeKey && bar.rhymeKey !== '?' ? bar.rhymeKey : `solo-${rhyme.length}`;
    if (!groupByKey.has(key)) groupByKey.set(key, groupByKey.size % 16);
    rhyme.push(groupByKey.get(key)!);
    syllables.push(Math.max(1, Math.min(32, bar.syllables || 8)));
  }
  return {
    rhyme,
    syllables,
    sourceLabel: meta?.sourceLabel || track.title.trim() || 'Untitled',
    sourceKey: meta?.sourceKey,
  };
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function DeskSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </h2>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground/80">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BarPicker({
  bars,
  onPick,
  emptyHint,
}: {
  bars: VaultBar[];
  onPick: (bar: VaultBar) => void;
  emptyHint: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = q ? bars.filter((b) => b.text.toLowerCase().includes(q)) : bars;
    return source.slice(0, 40);
  }, [bars, search]);

  if (!bars.length) {
    return <p className="text-xs text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search your bars..."
        className="h-8 bg-black/30 text-sm"
      />
      <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
        {filtered.map((bar, i) => (
          <button
            key={`${bar.text}-${i}`}
            type="button"
            onClick={() => onPick(bar)}
            className="block w-full rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-left text-xs text-white/85 transition-colors hover:border-primary/50 hover:text-primary"
          >
            <span className="line-clamp-1">{bar.text}</span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70">
              {bar.albumTitle} · {bar.trackTitle}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** UI labels for pressing faders — keys stay stable in saved config. */
const FADER_META: Array<{ key: keyof PressingFaders; label: string; low: string; high: string }> = [
  // heat → saturation (+ a little layer punch)
  { key: 'heat', label: 'Color', low: 'washed', high: 'vivid' },
  // grain → film grain opacity + mesh warp
  { key: 'grain', label: 'Texture', low: 'clean', high: 'gritty' },
  // pace → motion / breath cycle speed
  { key: 'pace', label: 'Motion', low: 'calm', high: 'restless' },
  // ink → background darkness (not studio Ink currency)
  { key: 'ink', label: 'Depth', low: 'lifted', high: 'deep night' },
];

function PressingPreview({ config, displayName }: { config: ArtistHomeConfig; displayName: string }) {
  const tokens = useMemo(() => pressTokens(config.theme), [config.theme]);
  const vars = useMemo(() => pressingCssVars(tokens), [tokens]);
  return (
    <div
      className="relative overflow-hidden rounded-sm border p-6"
      style={{
        ...(vars as React.CSSProperties),
        backgroundColor: 'var(--ph-bg)',
        borderColor: 'var(--ph-border)',
        minHeight: 180,
      }}
    >
      <LivingPressField config={config.theme} compact />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.4em]" style={{ color: 'var(--ph-accent)' }}>
            Lacquer preview
          </p>
          <span className="font-code text-[8px] uppercase tracking-widest text-[var(--ph-muted)]">
            {tokens.plateSerial}
          </span>
        </div>
        <p
          className={cn('mt-2 text-3xl font-bold leading-none', pressingTypeClass(tokens.typeVariant))}
          style={{ color: 'var(--ph-text)' }}
        >
          {displayName}
        </p>
        <p className="mt-2 line-clamp-1 text-xs italic" style={{ color: 'var(--ph-muted)' }}>
          &ldquo;{config.theme.seedText}&rdquo;
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-bold uppercase tracking-widest text-[var(--ph-muted)]">
          {config.theme.alive !== false && (
            <span className="flex items-center gap-1 text-[var(--ph-accent2)]">
              <Wind className="h-3 w-3" /> Alive · {tokens.breathSec}s
            </span>
          )}
          {config.theme.autoDrift && (
            <span className="flex items-center gap-1 text-[var(--ph-accent)]">
              <Orbit className="h-3 w-3" /> Restless · {tokens.compositionId}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Live mini of Artist Home hero copy — tagline / name / bio. */
function IdentityPreview({ config, displayName }: { config: ArtistHomeConfig; displayName: string }) {
  const tokens = useMemo(() => pressTokens(config.theme), [config.theme]);
  const vars = useMemo(() => pressingCssVars(tokens), [tokens]);
  const tagline = (config.featured.tagline || '').trim();
  const bio = (config.featured.bio || '').trim();

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-4 sm:p-5"
      style={{
        ...(vars as React.CSSProperties),
        backgroundColor: 'var(--ph-bg)',
        borderColor: 'var(--ph-border)',
      }}
      aria-live="polite"
    >
      <LivingPressField config={config.theme} compact />
      <div className="relative space-y-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[var(--ph-muted)]">
          Hero preview
        </p>
        {tagline ? (
          <p
            className="text-[10px] font-bold uppercase tracking-[0.35em] sm:text-[11px] sm:tracking-[0.4em]"
            style={{ color: 'var(--ph-accent)' }}
          >
            {tagline}
          </p>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--ph-muted)]/50">
            Your tagline appears here
          </p>
        )}
        <h3
          className={cn(
            'text-[clamp(1.65rem,5vw,2.35rem)] font-bold leading-[0.94]',
            pressingTypeClass(tokens.typeVariant)
          )}
          style={{ color: 'var(--ph-text)' }}
        >
          {displayName}
        </h3>
        {bio ? (
          <p className="max-w-xl text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--ph-muted)' }}>
            {bio}
          </p>
        ) : (
          <p className="text-xs italic text-[var(--ph-muted)]/45">Your short bio appears under the name</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The desk
// ---------------------------------------------------------------------------

export function PressDesk() {
  const { user } = useAuth();
  const { albums, loading: vaultLoading } = useContext(DataContext);
  const { toast } = useToast();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const { enabled: lockOn } = useLockFeature();

  const [config, setConfig] = useState<ArtistHomeConfig | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [profileLive, setProfileLive] = useState(false);
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [photoMode, setPhotoMode] = useState<'collage' | 'custom' | 'initials'>('initials');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [collageAlbumIds, setCollageAlbumIds] = useState<string[]>([]);
  const [starMarkUseStar, setStarMarkUseStar] = useState(false);
  const [starMarkSeed, setStarMarkSeed] = useState(0);
  const [starMarkSlots, setStarMarkSlots] = useState<VesperfoldSlot[]>([]);
  const [starMarkPinnedSlotId, setStarMarkPinnedSlotId] = useState<string | null>(null);
  const [starBusy, setStarBusy] = useState(false);
  const [heroBusy, setHeroBusy] = useState(false);
  const [committedMemoPath, setCommittedMemoPath] = useState<string | undefined>();
  const heroFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchArtistHomeConfig()
      .then((next) => {
        setConfig(next);
        setCommittedMemoPath(next.featured.voiceMemo?.storagePath);
      })
      .catch(() => toast({ variant: 'destructive', title: 'Could not load your Artist Home config' }));
    void fetchGamificationSummary(user.id).then((next) => {
      if (!next) return;
      setSummary(next);
      if (next.profileSlug) setProfileSlug(next.profileSlug);
      setProfileLive(Boolean(next.publicProfile));
      setPhotoMode(
        next.profilePhotoMode === 'custom'
          ? 'custom'
          : next.profilePhotoMode === 'collage'
            ? 'collage'
            : 'initials'
      );
      setPhotoUrl(next.profilePhotoUrl?.trim() ? next.profilePhotoUrl : null);
      setCollageAlbumIds(
        Array.isArray(next.profileCollageAlbumIds)
          ? next.profileCollageAlbumIds.filter((id): id is string => typeof id === 'string')
          : []
      );
      setStarMarkUseStar(Boolean(next.starMarkUseStar));
      setStarMarkSeed(normalizeVesperfoldSeed(next.starMarkSeed ?? 0));
      setStarMarkSlots(sanitizeVesperfoldSlots(next.starMarkSlots));
      setStarMarkPinnedSlotId(
        typeof next.starMarkPinnedSlotId === 'string' && next.starMarkPinnedSlotId.trim()
          ? next.starMarkPinnedSlotId.trim()
          : null
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const vaultBars = useMemo(() => collectVaultBars(albums), [albums]);
  const dnaCandidates = useMemo(() => collectDnaCandidates(albums), [albums]);
  const albumsWithCovers = useMemo(
    () =>
      albums.filter(
        (a) => a.id !== 'unassigned' && typeof a.coverArtUrl === 'string' && a.coverArtUrl.trim()
      ),
    [albums]
  );
  const heroCollageUrls = useMemo(() => {
    if (collageAlbumIds.length > 0) {
      const byId = new Map(albumsWithCovers.map((a) => [a.id, a.coverArtUrl!.trim()]));
      return collageAlbumIds.map((id) => byId.get(id)).filter((u): u is string => Boolean(u));
    }
    return albumsWithCovers
      .slice()
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .map((a) => a.coverArtUrl!.trim())
      .slice(0, MAX_HERO_COLLAGE);
  }, [albumsWithCovers, collageAlbumIds]);
  const useCustomHero =
    photoMode === 'custom' && typeof photoUrl === 'string' && photoUrl.trim().length > 0;
  // Empty collage (common on older accounts) → same stock star as explicit initials.
  const useCollageHero = photoMode === 'collage' && heroCollageUrls.length > 0;
  const useInitialsHero = !useCustomHero && !useCollageHero;
  const allTracks = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ album: Album; track: Track; key: string }> = [];
    for (const album of albums) {
      for (const track of album.tracks || []) {
        if (!track?.id) continue;
        const key = `${album.id}::${track.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ album, track, key });
      }
    }
    return out;
  }, [albums]);
  const publicShares = useMemo(() => {
    const byId = new Map<
      string,
      {
        shareId: string;
        title: string;
        kind: 'Album DNA' | 'Track DNA';
        albumTitle?: string;
        albumShareId?: string;
        trackIndex?: number;
        trackCount?: number;
        hasDropAudio?: boolean;
        dropPriceSummary?: string;
      }
    >();

    for (const album of albums) {
      if (album.isPublic && album.shareId) {
        byId.set(album.shareId, {
          shareId: album.shareId,
          title: album.title,
          kind: 'Album DNA',
          trackCount: (album.tracks || []).length,
          ...shareCommerceFlags({
            dropPrice: album.dropPrice,
          }),
        });
      }
      // Tracks under a live album nest under that album on the Drop Shelf.
      const albumLive = Boolean(album.isPublic && album.shareId);
      (album.tracks || []).forEach((track, trackIndex) => {
        if (!(track.isPublic && track.shareId)) return;
        const existing = byId.get(track.shareId);
        const flags = shareCommerceFlags({
          dropAudio: track.dropAudio,
          dropPrice: track.dropPrice,
        });
        byId.set(track.shareId, {
          shareId: track.shareId,
          title: track.title,
          kind: 'Track DNA',
          ...(flags.hasDropAudio ? { hasDropAudio: true } : {}),
          ...(flags.dropPriceSummary ? { dropPriceSummary: flags.dropPriceSummary } : {}),
          ...(albumLive || existing?.albumTitle
            ? { albumTitle: albumLive ? album.title : existing?.albumTitle }
            : {}),
          ...(albumLive && album.shareId
            ? { albumShareId: album.shareId, trackIndex }
            : existing?.albumShareId
              ? {
                  albumShareId: existing.albumShareId,
                  ...(typeof existing.trackIndex === 'number'
                    ? { trackIndex: existing.trackIndex }
                    : {}),
                }
              : {}),
        });
      });
    }

    return [...byId.values()];
  }, [albums]);

  const previewProfile = useMemo((): PublicProfileData | null => {
    if (!user?.id || !summary) return null;
    const rank =
      STUDIO_RANKS.find((r) => r.id === summary.rankId) ?? STUDIO_RANKS[0]!;
    const badges = Object.keys(summary.unlockedAchievements || {})
      .map((id) => getAchievement(id))
      .filter((b): b is NonNullable<typeof b> => Boolean(b));
    return {
      displayName: user.displayName || 'Artist',
      rankLabel: rank.label,
      rankId: summary.rankId,
      xp: summary.xp,
      currentStreak: summary.currentStreak,
      longestStreak: summary.longestStreak,
      lifetimeBarsWritten: summary.lifetimeBarsWritten,
      lifetimeLinesGenerated: summary.lifetimeLinesGenerated || 0,
      albumCoverUrls: useInitialsHero ? [] : heroCollageUrls,
      badges,
      unlockedAchievements: summary.unlockedAchievements || {},
      userId: user.id,
      profilePhotoMode: photoMode,
      profilePhotoUrl: photoUrl,
      slug: summary.profileSlug || profileSlug || 'preview',
      studioBadge: studioChromeFromUser(user),
      starMarkUseStar,
      starMarkSeed,
      liveDnaDrops: publicShares.map((d) => ({
        shareId: d.shareId,
        title: d.title,
        type: d.kind.startsWith('Album') ? ('album' as const) : ('track' as const),
        ...(d.albumTitle ? { albumTitle: d.albumTitle } : {}),
        ...(d.albumShareId ? { albumShareId: d.albumShareId } : {}),
        ...(typeof d.trackIndex === 'number' ? { trackIndex: d.trackIndex } : {}),
        ...(typeof d.trackCount === 'number' ? { trackCount: d.trackCount } : {}),
        ...(d.hasDropAudio ? { hasDropAudio: true } : {}),
        ...(d.dropPriceSummary ? { dropPriceSummary: d.dropPriceSummary } : {}),
      })),
    };
  }, [
    user?.id,
    user?.displayName,
    user?.subscriptionStatus,
    summary,
    heroCollageUrls,
    useInitialsHero,
    photoMode,
    photoUrl,
    profileSlug,
    publicShares,
    starMarkUseStar,
    starMarkSeed,
  ]);

  const openPreview = () => {
    setPreviewing(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const update = (mutate: (draft: ArtistHomeConfig) => void) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next: ArtistHomeConfig = JSON.parse(JSON.stringify(prev));
      mutate(next);
      return next;
    });
    setDirty(true);
  };

  const saveHero = async (next: {
    profilePhotoMode?: 'collage' | 'custom' | 'initials';
    profilePhotoUrl?: string | null;
    profileCollageAlbumIds?: string[] | null;
  }) => {
    setHeroBusy(true);
    try {
      const data = await patchGamificationSettings(next);
      const nextSummary = data.summary;
      if (nextSummary) {
        setSummary(nextSummary);
        setPhotoMode(
          nextSummary.profilePhotoMode === 'custom'
            ? 'custom'
            : nextSummary.profilePhotoMode === 'collage'
              ? 'collage'
              : 'initials'
        );
        setPhotoUrl(nextSummary.profilePhotoUrl?.trim() ? nextSummary.profilePhotoUrl : null);
        setCollageAlbumIds(
          Array.isArray(nextSummary.profileCollageAlbumIds)
            ? nextSummary.profileCollageAlbumIds.filter((id: unknown): id is string => typeof id === 'string')
            : []
        );
      } else {
        if (next.profilePhotoMode) setPhotoMode(next.profilePhotoMode);
        if (next.profilePhotoUrl !== undefined) setPhotoUrl(next.profilePhotoUrl);
        if (next.profileCollageAlbumIds !== undefined) {
          setCollageAlbumIds(
            Array.isArray(next.profileCollageAlbumIds) ? next.profileCollageAlbumIds : []
          );
        }
      }
      toast({
        title:
          next.profilePhotoMode === 'initials'
            ? 'Initials star'
            : next.profilePhotoMode === 'custom'
              ? 'Custom photo saved'
              : next.profileCollageAlbumIds !== undefined
                ? 'Collage updated'
                : next.profilePhotoUrl === null
                  ? 'Photo cleared'
                  : 'Using album collage',
        description:
          next.profilePhotoMode === 'initials'
            ? 'Artist Home portrait is your 2-letter initials star. Feed uses the same stock mark unless your feed star is on.'
            : undefined,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save hero photo',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setHeroBusy(false);
    }
  };

  const handleHeroUpload = async (file: File) => {
    setHeroBusy(true);
    try {
      const { dataUrl } = await processProfilePhotoFile(file);
      await saveHero({ profilePhotoMode: 'custom', profilePhotoUrl: dataUrl });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Image not accepted',
        description: e instanceof Error ? e.message : 'Could not process image.',
      });
      setHeroBusy(false);
    }
  };

  const toggleCollageAlbum = (albumId: string) => {
    setCollageAlbumIds((prev) => {
      if (prev.includes(albumId)) return prev.filter((id) => id !== albumId);
      if (prev.length >= MAX_HERO_COLLAGE) {
        toast({
          title: `Up to ${MAX_HERO_COLLAGE} covers`,
          description: 'Deselect one to add another.',
        });
        return prev;
      }
      return [...prev, albumId];
    });
  };

  const applyCollageSelection = () => {
    void saveHero({
      profilePhotoMode: 'collage',
      profilePhotoUrl: null,
      profileCollageAlbumIds: collageAlbumIds.length > 0 ? collageAlbumIds : null,
    });
  };

  const persistStarMark = async (next: {
    starMarkUseStar?: boolean;
    starMarkSeed?: number;
    starMarkSlots?: VesperfoldSlot[];
    starMarkPinnedSlotId?: string | null;
  }) => {
    setStarBusy(true);
    try {
      const data = await patchGamificationSettings(next);
      const s = data.summary as GamificationSummary | undefined;
      if (s) {
        setSummary(s);
        setStarMarkUseStar(Boolean(s.starMarkUseStar));
        setStarMarkSeed(normalizeVesperfoldSeed(s.starMarkSeed ?? 0));
        setStarMarkSlots(sanitizeVesperfoldSlots(s.starMarkSlots));
        setStarMarkPinnedSlotId(
          typeof s.starMarkPinnedSlotId === 'string' && s.starMarkPinnedSlotId.trim()
            ? s.starMarkPinnedSlotId.trim()
            : null
        );
      } else {
        if (typeof next.starMarkUseStar === 'boolean') setStarMarkUseStar(next.starMarkUseStar);
        if (next.starMarkSeed !== undefined) setStarMarkSeed(normalizeVesperfoldSeed(next.starMarkSeed));
        if (next.starMarkSlots) setStarMarkSlots(sanitizeVesperfoldSlots(next.starMarkSlots));
        if (next.starMarkPinnedSlotId !== undefined) {
          setStarMarkPinnedSlotId(next.starMarkPinnedSlotId);
        }
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save your star',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setStarBusy(false);
    }
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const previousMemoPath = committedMemoPath;
      const saved = await saveArtistHomeConfigClient(config);
      setConfig(saved);
      setCommittedMemoPath(saved.featured.voiceMemo?.storagePath);
      if (previousMemoPath && previousMemoPath !== saved.featured.voiceMemo?.storagePath) {
        void deleteVoiceStorage(previousMemoPath);
      }
      setDirty(false);
      toast({ title: 'Artist Home pressed', description: 'Your page is updated.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-muted-foreground">Sign in to press your Artist Home.</p>
        <Button className="mt-4 font-bold uppercase" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!config) {
    return <StudioLoader size="lg" fullscreen />;
  }

  if (previewing && previewProfile) {
    return (
      <div className="relative min-h-screen pb-28">
        <div className="sticky top-0 z-50 border-b border-primary/25 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
            <p className="font-code text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Full preview
              {dirty ? ' · unsaved edits' : ' · current draft'}
              {!profileLive ? ' · not public yet' : ''}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Looks good? Press it — or go back and keep editing.
            </p>
          </div>
        </div>
        <ArtistHome
          profile={previewProfile}
          config={config}
          isOwner
          previewMode
          onExitPreview={() => setPreviewing(false)}
        />
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Button
              size="sm"
              variant="outline"
              className="h-10 gap-1.5 font-bold uppercase"
              onClick={() => setPreviewing(false)}
            >
              <PenLine className="h-4 w-4" /> Back to edit
            </Button>
            <Button
              className="h-10 gap-2 px-6 font-bold uppercase"
              disabled={saving || !dirty}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {dirty ? 'Press it' : 'Pressed'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const embedPreview = parseEmbedUrl(config.featured.embedUrl || '');
  const displayName = user.displayName || 'Artist';

  return (
    <div className="container mx-auto max-w-3xl space-y-5 px-4 pb-32 pt-8">
      <header className="space-y-2">
        <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">Edit Public Page</h1>
        <p className="text-sm text-muted-foreground">
          Artist Home is completely free — no Pro required for the page. Seed a bar, ride four faders, stack your modules.
          {firstDropsOn ? ` ${firstDropsPitch()}` : ''}
        </p>
        {!profileLive && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Your public profile is currently off. Your pressing is saved and goes live the moment you
            enable Public profile in Studio Progress → Sharing, or from the Artist Home dock on The Vault.
          </p>
        )}
      </header>

      <VesperfoldForge
        useStar={starMarkUseStar}
        seed={starMarkSeed}
        slots={starMarkSlots}
        pinnedSlotId={starMarkPinnedSlotId}
        displayName={displayName}
        photoUrl={useCustomHero ? photoUrl : null}
        studioChrome={studioChromeFromUser(user)}
        busy={starBusy}
        onToggleUseStar={(on) => {
          if (starMarkPinnedSlotId) return;
          setStarMarkUseStar(on);
          void persistStarMark({ starMarkUseStar: on, starMarkSeed });
        }}
        onSeedChange={(seed) => {
          if (starMarkPinnedSlotId) return;
          setStarMarkSeed(seed);
          void persistStarMark({ starMarkSeed: seed, starMarkUseStar });
        }}
        onLockSlot={() => {
          if (starMarkPinnedSlotId) return;
          if (starMarkSlots.length >= VESPERFOLD_SLOT_LIMIT) {
            toast({
              title: 'Vault full',
              description: `You can lock ${VESPERFOLD_SLOT_LIMIT} stars. Clear one to lock another.`,
            });
            return;
          }
          if (starMarkSlots.some((s) => s.seed === starMarkSeed)) {
            toast({ title: 'Already locked', description: 'This fold is already in your vault.' });
            return;
          }
          const stack = unpackVesperfold(starMarkSeed);
          const nextSlots = sanitizeVesperfoldSlots([
            ...starMarkSlots,
            {
              id: `vf-${starMarkSeed}-${Date.now().toString(36)}`,
              seed: starMarkSeed,
              lockedAt: new Date().toISOString(),
              label: stack.label,
            },
          ]);
          setStarMarkSlots(nextSlots);
          void persistStarMark({
            starMarkSlots: nextSlots,
            starMarkSeed,
            starMarkUseStar: true,
          }).then(() => toast({ title: 'Star locked', description: stack.label }));
        }}
        onLoadSlot={(slot) => {
          if (starMarkPinnedSlotId) return;
          setStarMarkSeed(slot.seed);
          setStarMarkUseStar(true);
          void persistStarMark({
            starMarkSeed: slot.seed,
            starMarkUseStar: true,
          }).then(() => toast({ title: 'Star loaded', description: slot.label }));
        }}
        onPinSlot={(slot) => {
          setStarMarkPinnedSlotId(slot.id);
          setStarMarkSeed(slot.seed);
          setStarMarkUseStar(true);
          void persistStarMark({
            starMarkPinnedSlotId: slot.id,
            starMarkSeed: slot.seed,
            starMarkUseStar: true,
          }).then(() =>
            toast({
              title: 'Star pinned',
              description: `${slot.label} stays on until you unlock.`,
            })
          );
        }}
        onUnpin={() => {
          setStarMarkPinnedSlotId(null);
          void persistStarMark({ starMarkPinnedSlotId: null }).then(() =>
            toast({ title: 'Star unlocked', description: 'You can randomize or switch again.' })
          );
        }}
        onClearSlot={(slotId) => {
          if (starMarkPinnedSlotId === slotId) return;
          const nextSlots = starMarkSlots.filter((s) => s.id !== slotId);
          setStarMarkSlots(nextSlots);
          void persistStarMark({ starMarkSlots: nextSlots });
        }}
        onUseStockStar={() => {
          setStarMarkPinnedSlotId(null);
          setStarMarkUseStar(false);
          void persistStarMark({
            starMarkUseStar: false,
            starMarkPinnedSlotId: null,
          }).then(() =>
            toast({
              title: useCustomHero ? 'Photo on feed' : 'Initials star on feed',
              description: useCustomHero
                ? 'Feed star off — Scene shows your square photo. Artist Home portrait unchanged.'
                : 'Feed star off — Scene shows your stock initials star until you upload a photo.',
            })
          );
        }}
      />

      {/* 2. Hero photo */}
      <DeskSection
        icon={Camera}
        title="Hero photo"
        hint="Artist Home portrait (the big photo on your profile). Clear it anytime for a stock 2-letter initials star. Pairs with the feed star mark above."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="mx-auto w-full max-w-[11rem] shrink-0 sm:mx-0">
            <div className="aspect-square overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-lg">
              {useCustomHero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl!} alt="" className="h-full w-full object-cover" />
              ) : useInitialsHero ? (
                <ProfileInitialsStar
                  displayName={displayName}
                  className="h-full w-full border-0 shadow-none"
                  active
                  studioChrome={studioChromeFromUser(user)}
                />
              ) : (
                <AlbumCoverCollage
                  urls={heroCollageUrls}
                  displayName={displayName}
                  className="h-full w-full border-0 shadow-none"
                  studioChrome={studioChromeFromUser(user)}
                />
              )}
            </div>
            <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {useCustomHero
                ? 'Custom photo'
                : useInitialsHero
                  ? 'Initials star'
                  : collageAlbumIds.length > 0
                    ? `${heroCollageUrls.length} cover collage`
                    : 'Auto collage'}
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <input
              ref={heroFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleHeroUpload(file);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 font-bold uppercase"
                disabled={heroBusy}
                onClick={() => heroFileRef.current?.click()}
              >
                {heroBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                Upload photo
              </Button>
              <Button
                type="button"
                size="sm"
                variant={photoMode === 'collage' && !useCustomHero ? 'default' : 'ghost'}
                className="h-9 gap-1.5 font-bold uppercase"
                disabled={heroBusy || (photoMode === 'collage' && !useCustomHero && !useInitialsHero)}
                onClick={() =>
                  void saveHero({
                    profilePhotoMode: 'collage',
                    profilePhotoUrl: null,
                    profileCollageAlbumIds: collageAlbumIds.length > 0 ? collageAlbumIds : null,
                  })
                }
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Use collage
              </Button>
              <Button
                type="button"
                size="sm"
                variant={useInitialsHero ? 'default' : 'ghost'}
                className="h-9 gap-1.5 font-bold uppercase"
                disabled={heroBusy || useInitialsHero}
                onClick={() =>
                  void saveHero({
                    profilePhotoMode: 'initials',
                    profilePhotoUrl: null,
                    profileCollageAlbumIds: null,
                  })
                }
              >
                <Star className="h-3.5 w-3.5" /> Initials star
              </Button>
              {(useCustomHero || (!useInitialsHero && heroCollageUrls.length > 0)) && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 gap-1.5 font-bold uppercase text-red-300 hover:text-red-200"
                  disabled={heroBusy}
                  onClick={() =>
                    void saveHero({
                      profilePhotoMode: 'initials',
                      profilePhotoUrl: null,
                      profileCollageAlbumIds: null,
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear hero
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Clear hero / Initials star</strong> removes any
              uploaded photo and collage so Artist Home shows your 2-letter initials star (e.g. NS).
              You can switch back to collage or upload anytime.
            </p>

            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  Collage covers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[9px] font-bold uppercase"
                    disabled={heroBusy || collageAlbumIds.length === 0}
                    onClick={() => setCollageAlbumIds([])}
                  >
                    Clear picks
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2.5 text-[9px] font-bold uppercase"
                    disabled={heroBusy}
                    onClick={applyCollageSelection}
                  >
                    Apply collage
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tap covers to include them (order = tap order). Empty picks = newest albums automatically.
                Covers are set on each album in The Vault.
              </p>
              {albumsWithCovers.length === 0 ? (
                <p className="text-[11px] text-amber-300/90">
                  No album covers yet — add cover art in The Vault, then pick them here.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {albumsWithCovers.map((album) => {
                    const selected = collageAlbumIds.includes(album.id);
                    const order = selected ? collageAlbumIds.indexOf(album.id) + 1 : null;
                    return (
                      <button
                        key={album.id}
                        type="button"
                        disabled={heroBusy}
                        onClick={() => toggleCollageAlbum(album.id)}
                        className={cn(
                          'group relative aspect-square overflow-hidden rounded-lg border transition-all',
                          selected
                            ? 'border-primary ring-2 ring-primary/40'
                            : 'border-white/10 opacity-80 hover:opacity-100'
                        )}
                        title={album.title}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={album.coverArtUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {order != null && (
                          <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {order}
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                          {album.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </DeskSection>

      {/* 3. The Pressing */}
      <DeskSection
        icon={Sparkles}
        title="The Pressing"
        hint="Pick the bar your skin is pressed from. Same bar, same skin — your lyrics style your page. Turn Alive on and the page breathes that bar's meter."
      >
        <div className="space-y-4">
          <PressingPreview config={config} displayName={displayName} />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-2 border-primary/40 bg-primary/10 font-bold uppercase tracking-widest text-primary hover:bg-primary/20 hover:text-primary"
            disabled={!previewProfile}
            onClick={openPreview}
          >
            <Eye className="h-4 w-4" /> Preview full page
          </Button>
          <Textarea
            value={config.theme.seedText}
            onChange={(e) => update((d) => void (d.theme.seedText = e.target.value.slice(0, 280)))}
            rows={2}
            maxLength={280}
            placeholder="Type or pick the bar that presses your skin..."
            className="bg-black/30 text-sm"
          />
          {!vaultLoading && (
            <BarPicker
              bars={vaultBars}
              emptyHint="Write bars in the studio and they show up here to seed your skin."
              onPick={(bar) => update((d) => void (d.theme.seedText = bar.text.slice(0, 280)))}
            />
          )}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/85">
                <Wind className="h-3.5 w-3.5 text-primary" /> Alive — Living Field
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Seed builds a unique stack from 24 layer vocabularies (grooves, lattice, orbitals, signal…). Scroll moves depth —
                color stays locked.
              </p>
            </div>
            <Switch
              checked={config.theme.alive !== false}
              onCheckedChange={(checked) => update((d) => void (d.theme.alive = checked))}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/85">
                <Orbit className="h-3.5 w-3.5 text-primary" /> Restless groove
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Speeds the stylus and ring spin — never recolors the plate (no scroll rainbow).
              </p>
            </div>
            <Switch
              checked={config.theme.autoDrift === true}
              disabled={config.theme.alive === false}
              onCheckedChange={(checked) => update((d) => void (d.theme.autoDrift = checked))}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Mix faders
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 font-bold uppercase"
                onClick={() =>
                  update((d) => {
                    d.theme.faders = {
                      heat: Math.floor(Math.random() * 101),
                      grain: Math.floor(Math.random() * 101),
                      pace: Math.floor(Math.random() * 101),
                      ink: Math.floor(Math.random() * 101),
                    };
                  })
                }
              >
                <Shuffle className="h-3.5 w-3.5" /> Randomize
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FADER_META.map((fader) => (
                <div key={fader.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                      {fader.label}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      {fader.low} ⟷ {fader.high}
                    </span>
                  </div>
                  <Slider
                    value={[config.theme.faders[fader.key]]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([value]) =>
                      update((d) => void (d.theme.faders[fader.key] = value))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DeskSection>

      {/* 4. Identity */}
      <DeskSection icon={User} title="Identity" hint="One line above your name, a short bio below it.">
        <div className="space-y-3">
          <IdentityPreview config={config} displayName={displayName} />
          <Input
            value={config.featured.tagline || ''}
            onChange={(e) => update((d) => void (d.featured.tagline = e.target.value.slice(0, 120)))}
            maxLength={120}
            placeholder="Tagline — e.g. 'pen first, everything else after'"
            className="bg-black/30 text-sm"
          />
          <Textarea
            value={config.featured.bio || ''}
            onChange={(e) => update((d) => void (d.featured.bio = e.target.value.slice(0, 600)))}
            rows={3}
            maxLength={600}
            placeholder="Short bio (600 chars)"
            className="bg-black/30 text-sm"
          />
        </div>
      </DeskSection>

      <DeskSection
        icon={Mail}
        title="Contact"
        hint="Optional. Sits next to Reverbs under your streaks — a short line, or request-to-see."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Show on Artist Home</p>
              <p className="text-[11px] text-muted-foreground">Off by default. Nothing extra if you leave this empty.</p>
            </div>
            <Switch
              checked={Boolean(config.featured.contact)}
              onCheckedChange={(checked) =>
                update((d) => {
                  if (checked) {
                    d.featured.contact = {
                      mode: d.featured.contact?.mode || 'request',
                      value: d.featured.contact?.value || '',
                    };
                  } else {
                    d.featured.contact = undefined;
                  }
                })
              }
            />
          </div>
          {config.featured.contact ? (
            <>
              <Input
                value={config.featured.contact.value || ''}
                onChange={(e) =>
                  update((d) => {
                    if (!d.featured.contact) return;
                    d.featured.contact = {
                      ...d.featured.contact,
                      value: e.target.value.slice(0, CONTACT_MAX_CHARS),
                    };
                  })
                }
                maxLength={CONTACT_MAX_CHARS}
                placeholder="Best way to reach you — email, IG, Discord…"
                className="bg-black/30 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Needs a line to publish — empty turns this back off.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['public', 'request'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      update((d) => {
                        if (!d.featured.contact) return;
                        d.featured.contact = { ...d.featured.contact, mode };
                      })
                    }
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-[11px] leading-snug transition-colors',
                      config.featured.contact?.mode === mode
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-white/10 bg-black/20 text-muted-foreground hover:border-white/20'
                    )}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-widest">
                      {mode === 'public' ? 'Show on page' : 'Request to see'}
                    </span>
                    {mode === 'public'
                      ? 'Anyone on your page can see it.'
                      : 'They tap Request. You approve in Activity.'}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </DeskSection>

      {/* 5. Outbound socials */}
      <DeskSection
        icon={Link2}
        title="Links out"
        hint="Optional 3-second hello plays first under your photo. Fill any socials you want — only filled ones show."
      >
        <div className="space-y-5">
          <ProfileVoiceMemoEditor
            note={config.featured.voiceMemo}
            committedStoragePath={committedMemoPath}
            userId={user.id}
            disabled={saving}
            onChange={(voiceMemo) =>
              update((d) => {
                d.featured.voiceMemo = voiceMemo;
              })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_PROVIDERS.map((provider) => (
              <div key={provider.id} className="space-y-1">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-primary">
                    {provider.short}
                  </span>
                  {provider.label}
                </label>
                <Input
                  value={config.featured.socials?.[provider.id] || ''}
                  onChange={(e) =>
                    update((d) => {
                      const next = { ...(d.featured.socials || {}) };
                      const value = e.target.value.slice(0, 200);
                      if (value.trim()) next[provider.id] = value;
                      else delete next[provider.id];
                      d.featured.socials = Object.keys(next).length ? next : undefined;
                    })
                  }
                  maxLength={200}
                  placeholder={provider.placeholder}
                  className="bg-black/30 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </DeskSection>

      {/* 3. Now Playing */}
      <DeskSection icon={Disc3} title="Now Playing" hint={EMBED_HELP_TEXT}>
        <div className="space-y-3">
          <Input
            value={config.featured.embedTitle || ''}
            onChange={(e) => update((d) => void (d.featured.embedTitle = e.target.value.slice(0, 120)))}
            maxLength={120}
            placeholder="Track title (optional)"
            className="bg-black/30 text-sm"
          />
          <Input
            value={config.featured.embedUrl || ''}
            onChange={(e) => update((d) => void (d.featured.embedUrl = e.target.value.slice(0, 500)))}
            maxLength={500}
            placeholder="https://..."
            className="bg-black/30 text-sm"
          />
          {config.featured.embedUrl?.trim() && (
            <EmbedPlayer url={config.featured.embedUrl} title={config.featured.embedTitle} />
          )}
          {config.featured.embedUrl?.trim() && !embedPreview && (
            <p className="text-[10px] uppercase tracking-widest text-amber-400/80">
              Not a supported player — it will show as a link card.
            </p>
          )}
        </div>
      </DeskSection>

      {/* 4. Bar of the Week */}
      <DeskSection
        icon={Quote}
        title="Bar of the Week"
        hint="One bar, big type. Picking from a public track links visitors straight into the sheet."
      >
        <div className="space-y-3">
          <Textarea
            value={config.featured.barOfWeek || ''}
            onChange={(e) =>
              update((d) => {
                d.featured.barOfWeek = e.target.value.slice(0, 280);
                if (!e.target.value.trim()) d.featured.barOfWeekShareId = undefined;
              })
            }
            rows={2}
            maxLength={280}
            placeholder="Your calling-card bar..."
            className="bg-black/30 text-sm"
          />
          {config.featured.barOfWeekShareId && (
            <p className="text-[10px] uppercase tracking-widest text-emerald-400/90">
              Linked to its public DNA Drop
            </p>
          )}
          {!vaultLoading && (
            <BarPicker
              bars={vaultBars}
              emptyHint="Your studio bars appear here."
              onPick={(bar) =>
                update((d) => {
                  d.featured.barOfWeek = bar.text.slice(0, 280);
                  d.featured.barOfWeekShareId = bar.trackShareId;
                })
              }
            />
          )}
        </div>
      </DeskSection>

      {/* 5. Living DNA */}
      <DeskSection
        icon={Dna}
        title="Living DNA"
        hint="Reveal up to two Creative DNA lines from your albums — a controlled peek into your world."
      >
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Input
              key={i}
              value={config.featured.dnaLines?.[i] || ''}
              onChange={(e) =>
                update((d) => {
                  const lines = [...(d.featured.dnaLines || [])];
                  lines[i] = e.target.value.slice(0, 160);
                  d.featured.dnaLines = lines.filter((l) => l !== undefined);
                })
              }
              maxLength={160}
              placeholder={`DNA line ${i + 1}`}
              className="bg-black/30 text-sm"
            />
          ))}
          {dnaCandidates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {dnaCandidates.map((candidate, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    update((d) => {
                      const lines = (d.featured.dnaLines || []).filter(Boolean);
                      if (lines.length >= 2) lines.pop();
                      d.featured.dnaLines = [...lines, candidate.text].slice(0, 2);
                    })
                  }
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/75 transition-colors hover:border-primary/50 hover:text-primary"
                  title={candidate.text}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </DeskSection>

      {/* 6. Rhyme Fingerprint */}
      <DeskSection
        icon={Fingerprint}
        title="Rhyme Fingerprint"
        hint="Pick a track — its rhyme scheme and cadence become an abstract visual. No lyrics are shown."
      >
        <div className="space-y-3">
          {(() => {
            const fp = config.featured.fingerprint;
            const selectedKey =
              (fp?.sourceKey && allTracks.some((t) => t.key === fp.sourceKey) && fp.sourceKey) ||
              allTracks.find(
                ({ album, track }) =>
                  fp?.sourceLabel === `${album.title} · ${track.title.trim() || 'Untitled'}`
              )?.key ||
              '';

            const pickTrack = (key: string) => {
              const entry = allTracks.find((t) => t.key === key);
              if (!entry) return;
              const label = `${entry.album.title} · ${entry.track.title.trim() || 'Untitled'}`;
              const fingerprint = computeFingerprint(entry.track, {
                sourceLabel: label,
                sourceKey: entry.key,
              });
              if (!fingerprint) {
                toast({ title: 'That track needs at least 2 written bars' });
                return;
              }
              update((d) => void (d.featured.fingerprint = fingerprint));
            };

            if (!allTracks.length) {
              return (
                <p className="text-xs text-muted-foreground">
                  Add tracks with written bars to press a fingerprint.
                </p>
              );
            }

            return (
              <>
                {fp && (
                  <div className="rounded-xl border border-primary/50 bg-primary/10 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span className="shrink-0">Active</span>
                        {fp.sourceLabel ? (
                          <span className="truncate font-normal normal-case tracking-normal text-primary/85">
                            · {fp.sourceLabel}
                          </span>
                        ) : null}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 text-[10px] font-bold uppercase"
                        onClick={() => update((d) => void (d.featured.fingerprint = undefined))}
                      >
                        Clear
                      </Button>
                    </div>
                    <FingerprintSvg fingerprint={fp} />
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Preview — bars &amp; end-rhymes as shape · no lyrics
                    </p>
                  </div>
                )}

                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-1.5">
                  {allTracks.map(({ album, track, key }) => {
                    const active = key === selectedKey;
                    const label = `${album.title} · ${track.title.trim() || 'Untitled'}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => pickTrack(key)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors',
                          active
                            ? 'border-primary/60 bg-primary/15 text-primary'
                            : 'border-transparent text-white/80 hover:border-white/15 hover:bg-white/[0.04]'
                        )}
                      >
                        {active ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Fingerprint className="h-3.5 w-3.5 shrink-0 opacity-40" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {active && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </DeskSection>

      {/* 7. The Board */}
      <DeskSection
        icon={LayoutGrid}
        title="The Board"
        hint="Pin 1–5 bars visitors can read, copy, open a DNA Drop, and leave a short reply under. No guessing games."
      >
        <div className="space-y-4">
          {(config.featured.barBoard?.pins?.length || 0) > 0 && (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                Live preview
              </p>
              <div
                className="rounded-lg border border-white/10 bg-black/40 p-3"
                style={
                  {
                    ['--ph-hue' as string]: '200',
                    ['--ph-accent' as string]: '#7dd3fc',
                    ['--ph-accent2' as string]: '#a5b4fc',
                    ['--ph-text' as string]: '#fff',
                    ['--ph-muted' as string]: 'rgba(255,255,255,0.55)',
                    ['--ph-border' as string]: 'rgba(255,255,255,0.15)',
                  } as React.CSSProperties
                }
              >
                <BarBoardView
                  data={config.featured.barBoard!}
                  profileUserId={user.id}
                  compact
                />
              </div>
            </div>
          )}

          {(config.featured.barBoard?.pins?.length || 0) > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Pinned ({config.featured.barBoard!.pins.length}/{BOARD_MAX_PINS})
              </p>
              {config.featured.barBoard!.pins.map((pin, i) => (
                <div
                  key={pin.id}
                  className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2"
                >
                  <span className="mt-0.5 w-10 shrink-0 text-[9px] font-bold uppercase tracking-wider text-primary">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/90 line-clamp-2">{pin.text}</p>
                    {pin.sourceLabel ? (
                      <p className="mt-0.5 text-[10px] text-white/50">{pin.sourceLabel}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 px-2 text-[10px] font-bold uppercase"
                    onClick={() =>
                      update((d) => {
                        const pins = [...(d.featured.barBoard?.pins || [])];
                        pins.splice(i, 1);
                        if (!pins.length) {
                          d.featured.barBoard = undefined;
                          return;
                        }
                        d.featured.barBoard = { pins };
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs font-bold uppercase"
                onClick={() => update((d) => void (d.featured.barBoard = undefined))}
              >
                Clear board
              </Button>
            </div>
          )}

          {(config.featured.barBoard?.pins?.length || 0) < BOARD_MAX_PINS && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Add a pin
              </p>
              <BarPicker
                bars={vaultBars}
                emptyHint="Write bars in the studio, then pin them here for visitors."
                onPick={(bar) => {
                  const pin = createBoardPin({
                    text: bar.text.slice(0, 280),
                    sourceLabel: `${bar.albumTitle} · ${bar.trackTitle}`,
                    shareId: bar.trackShareId,
                  });
                  update((d) => {
                    const prev = d.featured.barBoard?.pins || [];
                    if (prev.length >= BOARD_MAX_PINS) return;
                    d.featured.barBoard = { pins: [...prev, pin] };
                    d.featured.theCatch = undefined;
                    d.featured.albumRooms = undefined;
                    const mod = d.modules.find((m) => m.id === 'barBoard');
                    if (mod) mod.enabled = true;
                  });
                }}
              />
            </div>
          )}
        </div>
      </DeskSection>

      {lockOn ? (
      <DeskSection
        icon={Lock}
        title="Finish this bar"
        hint="Put one unfinished line on your page. Visitors write the next."
      >
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <Link
            href="/lock/desk"
            className="font-bold uppercase tracking-wider text-primary hover:underline"
          >
            Manage all →
          </Link>
          {config.featured.openLockId ? (
            <Link
              href={`/lock/${config.featured.openLockId}/manage`}
              className="font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:underline"
            >
              Manage featured
            </Link>
          ) : null}
        </div>
        <PublishOpenLockPanel
          currentLockId={config.featured.openLockId}
          onPublished={(lockId) => {
            setConfig((prev) => {
              if (!prev) return prev;
              const next = structuredClone(prev);
              next.featured.openLockId = lockId;
              const mod = next.modules.find((m) => m.id === 'openLock');
              if (mod) mod.enabled = true;
              return next;
            });
          }}
        />
      </DeskSection>
      ) : null}

      {/* 8. Live DNA Drops — manage + auto on Artist Home */}
      <DeskSection
        icon={Dna}
        title="Live DNA Drops"
        hint={
          firstDropsOn
            ? `Songs for sale are pressed from The Scene — not inside DNA Drop. Live First Drops show on your Artist Home automatically. ${firstDropsFeeCashoutLine()} Open Manage to jump to a press, the vault, or Earnings.`
            : 'Any album or track with an active DNA Drop shows on your Artist Home automatically — as a count under your bio and in the Live DNA Drops module. Open Manage to jump to a drop or the vault.'
        }
      >
        <LiveDnaDropsManage />
      </DeskSection>

      {/* 9. Module deck */}
      <DeskSection
        icon={SlidersHorizontal}
        title="Module Deck"
        hint="Stack your page — toggle, reorder, and size each die-cut plate."
      >
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => {
              update((d) => {
                d.modules = defaultModules();
              });
              toast({
                title: 'Module Deck reset',
                description: 'Back to the original order, sizes, and defaults.',
              });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart to default
          </Button>
        </div>
        <div className="space-y-2">
          {config.modules.map((module, index) => {
            if (module.id === 'openLock' && !lockOn) return null;
            const meta = MODULE_META[module.id];
            return (
              <div
                key={module.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                  module.enabled
                    ? 'border-white/15 bg-white/[0.04]'
                    : 'border-white/5 bg-transparent opacity-60'
                )}
              >
                <Switch
                  checked={module.enabled}
                  onCheckedChange={(checked) =>
                    update((d) => void (d.modules[index].enabled = checked))
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white/90">{meta.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{meta.description}</p>
                </div>
                <Select
                  value={module.size}
                  onValueChange={(size) =>
                    update((d) => void (d.modules[index].size = size as ProfileModuleSetting['size']))
                  }
                >
                  <SelectTrigger className="h-8 w-16 bg-black/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-primary disabled:opacity-30"
                    onClick={() =>
                      update((d) => {
                        const [item] = d.modules.splice(index, 1);
                        d.modules.splice(index - 1, 0, item);
                      })
                    }
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === config.modules.length - 1}
                    className="text-muted-foreground hover:text-primary disabled:opacity-30"
                    onClick={() =>
                      update((d) => {
                        const [item] = d.modules.splice(index, 1);
                        d.modules.splice(index + 1, 0, item);
                      })
                    }
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </DeskSection>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 border-primary/40 bg-primary/10 font-bold uppercase text-primary hover:bg-primary/20 hover:text-primary"
              disabled={!previewProfile}
              onClick={openPreview}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            {profileSlug && profileLive ? (
              <Link
                href={profileHref(profileSlug) || '/'}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View live page
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">
                Your pressing goes live when your public profile is on
              </span>
            )}
          </div>
          <Button
            className="h-10 gap-2 px-6 font-bold uppercase"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {dirty ? 'Press it' : 'Pressed'}
          </Button>
        </div>
      </div>
    </div>
  );
}
