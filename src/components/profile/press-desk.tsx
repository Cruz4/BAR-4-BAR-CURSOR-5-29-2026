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
  DoorOpen,
  ExternalLink,
  Eye,
  Fingerprint,
  LayoutGrid,
  Loader2,
  Quote,
  Save,
  SlidersHorizontal,
  Sparkles,
  User,
  Wind,
  RotateCcw,
  Orbit,
  Link2,
  ImagePlus,
  PenLine,
  Trash2,
  Shuffle,
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
import { DataContext } from '@/context/data-context';
import { cn } from '@/lib/utils';
import type { Album, Track } from '@/lib/types';
import { processAlbumRoomBannerFile, processProfilePhotoFile } from '@/lib/cover-art';
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
import { EmbedPlayer } from '@/components/profile/embed-player';
import { AlbumCoverCollage } from '@/components/gamification/album-cover-collage';
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
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
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
          bars.push({ text, albumTitle: album.title, trackTitle: track.title, trackShareId: shareId });
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

function computeFingerprint(track: Track): RhymeFingerprint | null {
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
  return { rhyme, syllables, sourceLabel: track.title };
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

// ---------------------------------------------------------------------------
// The desk
// ---------------------------------------------------------------------------

export function PressDesk() {
  const { user } = useAuth();
  const { albums, loading: vaultLoading } = useContext(DataContext);
  const { toast } = useToast();

  const [config, setConfig] = useState<ArtistHomeConfig | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [profileLive, setProfileLive] = useState(false);
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [photoMode, setPhotoMode] = useState<'collage' | 'custom'>('collage');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [collageAlbumIds, setCollageAlbumIds] = useState<string[]>([]);
  const [starMarkUseStar, setStarMarkUseStar] = useState(false);
  const [starMarkSeed, setStarMarkSeed] = useState(0);
  const [starMarkSlots, setStarMarkSlots] = useState<VesperfoldSlot[]>([]);
  const [starMarkPinnedSlotId, setStarMarkPinnedSlotId] = useState<string | null>(null);
  const [starBusy, setStarBusy] = useState(false);
  const [heroBusy, setHeroBusy] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchArtistHomeConfig()
      .then(setConfig)
      .catch(() => toast({ variant: 'destructive', title: 'Could not load your Artist Home config' }));
    void fetchGamificationSummary(user.id).then((next) => {
      if (!next) return;
      setSummary(next);
      if (next.profileSlug) setProfileSlug(next.profileSlug);
      setProfileLive(Boolean(next.publicProfile));
      setPhotoMode(next.profilePhotoMode === 'custom' ? 'custom' : 'collage');
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
        trackCount?: number;
      }
    >();

    for (const album of albums) {
      if (album.isPublic && album.shareId) {
        byId.set(album.shareId, {
          shareId: album.shareId,
          title: album.title,
          kind: 'Album DNA',
          trackCount: (album.tracks || []).length,
        });
      }
      // Tracks under a live album nest under that album on the Drop Shelf.
      const albumLive = Boolean(album.isPublic && album.shareId);
      for (const track of album.tracks || []) {
        if (!(track.isPublic && track.shareId)) continue;
        const existing = byId.get(track.shareId);
        byId.set(track.shareId, {
          shareId: track.shareId,
          title: track.title,
          kind: 'Track DNA',
          ...(albumLive || existing?.albumTitle
            ? { albumTitle: albumLive ? album.title : existing?.albumTitle }
            : {}),
          ...(albumLive && album.shareId
            ? { albumShareId: album.shareId }
            : existing?.albumShareId
              ? { albumShareId: existing.albumShareId }
              : {}),
        });
      }
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
      albumCoverUrls: heroCollageUrls,
      badges,
      unlockedAchievements: summary.unlockedAchievements || {},
      userId: user.id,
      profilePhotoMode: photoMode,
      profilePhotoUrl: photoUrl,
      slug: summary.profileSlug || profileSlug || 'preview',
      starMarkUseStar,
      starMarkSeed,
      liveDnaDrops: publicShares.map((d) => ({
        shareId: d.shareId,
        title: d.title,
        type: d.kind.startsWith('Album') ? ('album' as const) : ('track' as const),
        ...(d.albumTitle ? { albumTitle: d.albumTitle } : {}),
        ...(d.albumShareId ? { albumShareId: d.albumShareId } : {}),
        ...(typeof d.trackCount === 'number' ? { trackCount: d.trackCount } : {}),
      })),
    };
  }, [
    user?.id,
    user?.displayName,
    summary,
    heroCollageUrls,
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
    profilePhotoMode?: 'collage' | 'custom';
    profilePhotoUrl?: string | null;
    profileCollageAlbumIds?: string[] | null;
  }) => {
    setHeroBusy(true);
    try {
      const data = await patchGamificationSettings(next);
      const nextSummary = data.summary;
      if (nextSummary) {
        setSummary(nextSummary);
        setPhotoMode(nextSummary.profilePhotoMode === 'custom' ? 'custom' : 'collage');
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
          next.profilePhotoMode === 'custom'
            ? 'Custom photo saved'
            : next.profileCollageAlbumIds !== undefined
              ? 'Collage updated'
              : 'Using album collage',
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
      const saved = await saveArtistHomeConfigClient(config);
      setConfig(saved);
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
          Your page is pressed from your own bars — seed one, ride four faders, stack your modules.
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
      />

      {/* 1. The Pressing */}
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
                Seed builds a unique stack of layers (grooves, wells, mesh, ghosts…). Scroll moves depth —
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

      {/* 2. Identity */}
      <DeskSection icon={User} title="Identity" hint="One line above your name, a short bio below it.">
        <div className="space-y-3">
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

      {/* 2a. Hero photo */}
      <DeskSection
        icon={Camera}
        title="Hero photo"
        hint="Artist Home portrait — collage or custom upload. Separate from the feed star mark above."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="mx-auto w-full max-w-[11rem] shrink-0 sm:mx-0">
            <div className="aspect-square overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-lg">
              {useCustomHero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl!} alt="" className="h-full w-full object-cover" />
              ) : (
                <AlbumCoverCollage
                  urls={heroCollageUrls}
                  displayName={displayName}
                  className="h-full w-full border-0 shadow-none"
                />
              )}
            </div>
            <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {useCustomHero
                ? 'Custom photo'
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
                disabled={heroBusy || (photoMode === 'collage' && !useCustomHero)}
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
            </div>

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

      {/* 2b. Outbound socials */}
      <DeskSection
        icon={Link2}
        title="Links out"
        hint="Fill any you want — only filled ones show as small buttons under your portrait."
      >
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
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={
              allTracks.find(
                ({ album, track }) =>
                  config.featured.fingerprint?.sourceLabel ===
                  `${album.title} · ${track.title.trim() || 'Untitled'}`
              )?.key
            }
            onValueChange={(key) => {
              const entry = allTracks.find((t) => t.key === key);
              if (!entry) return;
              const fingerprint = computeFingerprint(entry.track);
              if (!fingerprint) {
                toast({ title: 'That track needs at least 2 written bars' });
                return;
              }
              fingerprint.sourceLabel = `${entry.album.title} · ${entry.track.title.trim() || 'Untitled'}`;
              update((d) => void (d.featured.fingerprint = fingerprint));
            }}
          >
            <SelectTrigger className="w-64 bg-black/30 text-sm">
              <SelectValue placeholder="Choose a track" />
            </SelectTrigger>
            <SelectContent>
              {allTracks.map(({ album, track, key }) => (
                <SelectItem key={key} value={key}>
                  {album.title} · {track.title.trim() || 'Untitled'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {config.featured.fingerprint && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs font-bold uppercase"
              onClick={() => update((d) => void (d.featured.fingerprint = undefined))}
            >
              Clear
            </Button>
          )}
        </div>
      </DeskSection>

      {/* 7. Album Rooms */}
      <DeskSection
        icon={DoorOpen}
        title="Album Rooms"
        hint="Up to 4 albums as doors. Upload a wide banner for each room — vinyl covers are square and get letterboxed if you skip a custom image."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {albums
            .filter((a) => a.id !== 'unassigned')
            .map((album) => {
              const selected = Boolean(
                config.featured.albumRooms?.some(
                  (room) => room.albumId === album.id || room.title === album.title
                )
              );
              return (
                <button
                  key={album.id}
                  type="button"
                  onClick={() =>
                    update((d) => {
                      const rooms = d.featured.albumRooms || [];
                      if (selected) {
                        d.featured.albumRooms = rooms.filter(
                          (room) => room.albumId !== album.id && room.title !== album.title
                        );
                        return;
                      }
                      if (rooms.length >= 4) return;
                      const sampleBar = (album.tracks || [])
                        .flatMap((t) => t.sections || [])
                        .flatMap((s) => s.bars || [])
                        .map((b) => (b.text || '').trim())
                        .find(Boolean);
                      d.featured.albumRooms = [
                        ...rooms,
                        {
                          title: album.title,
                          albumId: album.id,
                          theme: album.theme || undefined,
                          shareId: album.isPublic && album.shareId ? album.shareId : undefined,
                          sampleBar: sampleBar ? sampleBar.slice(0, 280) : undefined,
                        },
                      ];
                    })
                  }
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                    selected
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25'
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{album.title}</span>
                </button>
              );
            })}
        </div>
        {albums.filter((a) => a.id !== 'unassigned').length === 0 && (
          <p className="text-xs text-muted-foreground">Create albums in the studio to open rooms.</p>
        )}

        {(config.featured.albumRooms?.length || 0) > 0 && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              Room door images
            </p>
            {config.featured.albumRooms!.map((room, roomIndex) => (
              <div
                key={room.albumId || room.title}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 p-3 sm:flex-row sm:items-center"
              >
                <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-neutral-950 sm:w-40 sm:shrink-0">
                  {room.roomImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={room.roomImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      No custom image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="truncate text-sm font-bold text-white">{room.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 font-bold uppercase"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/jpeg,image/png,image/webp';
                        input.onchange = () => {
                          const file = input.files?.[0];
                          if (!file) return;
                          void (async () => {
                            try {
                              const { dataUrl } = await processAlbumRoomBannerFile(file);
                              update((d) => {
                                const rooms = [...(d.featured.albumRooms || [])];
                                if (!rooms[roomIndex]) return;
                                rooms[roomIndex] = {
                                  ...rooms[roomIndex],
                                  roomImageUrl: dataUrl,
                                };
                                d.featured.albumRooms = rooms;
                              });
                              toast({ title: 'Room image set', description: room.title });
                            } catch (e) {
                              toast({
                                variant: 'destructive',
                                title: 'Could not use that image',
                                description: e instanceof Error ? e.message : undefined,
                              });
                            }
                          })();
                        };
                        input.click();
                      }}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {room.roomImageUrl ? 'Change' : 'Upload'}
                    </Button>
                    {room.roomImageUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 font-bold uppercase text-muted-foreground"
                        onClick={() =>
                          update((d) => {
                            const rooms = [...(d.featured.albumRooms || [])];
                            if (!rooms[roomIndex]) return;
                            const { roomImageUrl: _drop, ...rest } = rooms[roomIndex];
                            rooms[roomIndex] = rest;
                            d.featured.albumRooms = rooms;
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DeskSection>

      {/* 8. Live DNA Drops — manage + auto on Artist Home */}
      <DeskSection
        icon={Dna}
        title="Live DNA Drops"
        hint="Any album or track with an active DNA Drop shows on your Artist Home automatically — as a count under your bio and in the Live DNA Drops module. Open Manage to jump to a drop or the vault."
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
                href={`/profile/${profileSlug}`}
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
