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
  X,
  Smartphone,
  Tablet,
  Monitor,
  Music2,
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
import { firstDropsFeeCashoutLine, shareCommerceFlags } from '@/lib/drop-commerce';
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
import { SocialGlyph } from '@/components/profile/profile-social-links';
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
import { dnaStatusOf } from '@/lib/release-management';
import { VesperfoldForge } from '@/components/profile/vesperfold-forge';
import { SoundIdentityStrip } from '@/components/profile/sound-identity-strip';
import { auth } from '@/lib/firebase/client/firebase';
import {
  flattenLibraryItems,
  formatDeckTime,
  type DeckPlayable,
  type DropLibraryItem,
} from '@/lib/drop-library';
import {
  buildFeaturedTrackPreview,
  deleteFeaturedTrackPreview,
} from '@/lib/profile/featured-track-preview';
import {
  PUBLIC_GENRE_STYLE_OPTIONS,
  PUBLIC_IDENTITY_KINDS,
  PUBLIC_MOOD_OPTIONS,
  type ArtistHomeSoundIdentity,
} from '@/lib/profile/sound-identity';
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
  id,
  icon: Icon,
  title,
  hint,
  children,
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </h2>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground/80">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EditPageCheatSheet({ firstDropsOn }: { firstDropsOn: boolean }) {
  return (
    <div className={cn('grid gap-2', firstDropsOn ? 'sm:grid-cols-3' : 'sm:grid-cols-1')}>
      <div className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2">
        <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-sky-200">Your Home</p>
        <p className="mt-1 text-[11px] leading-snug text-foreground/90">
          Your public Artist Home — free, no Pro. Edit the look, name, links, featured track, and modules here. Watch it update in the live preview on the right, or tap Preview.
        </p>
      </div>
      {firstDropsOn ? (
        <>
          <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-2">
            <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">Sell audio</p>
            <p className="mt-1 text-[11px] leading-snug text-foreground/90">
              Scene → New release. Upload, price, press live. 30s preview · buy once · stream here. You keep the rights.
            </p>
            <p className="mt-1 text-[10px] leading-snug text-fuchsia-100/75">
              Fee 25% under $3 · 15% $3–$4.99 · 10% $5+. Cash out on Earnings.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2">
            <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-200">Not a sale</p>
            <p className="mt-1 text-[11px] leading-snug text-foreground/90">
              DNA Drop is how you publish lyrics publicly (Studio Pro). Listen / buy is the audio release on Artist Home, The Scene, and the release link.
            </p>
          </div>
        </>
      ) : null}
    </div>
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
        <SoundIdentityStrip identity={config.featured.soundIdentity} compact />
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

function TagEditor({
  label,
  values,
  max,
  placeholder,
  suggestions,
  onChange,
}: {
  label: string;
  values: string[];
  max: number;
  placeholder: string;
  suggestions?: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const addValue = (raw: string) => {
    const value = raw.trim().replace(/\s+/g, ' ').slice(0, 50);
    if (!value || values.some((item) => item.toLowerCase() === value.toLowerCase()) || values.length >= max) {
      return false;
    }
    onChange([...values, value]);
    return true;
  };
  const add = () => {
    addValue(draft);
    setDraft('');
  };
  const availableSuggestions = (suggestions || []).filter(
    (option) => !values.some((value) => value.toLocaleLowerCase() === option.toLocaleLowerCase())
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/70">{label}</label>
        <span className="font-code text-[9px] text-muted-foreground">{values.length}/{max}</span>
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary hover:border-destructive/50 hover:text-destructive"
              aria-label={`Remove ${value}`}
            >
              <span className="truncate">{value}</span><X className="h-3 w-3 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}
      {suggestions?.length ? (
        <Select
          value={suggestion}
          disabled={values.length >= max || availableSuggestions.length === 0}
          onValueChange={(value) => {
            if (addValue(value)) setSuggestion('');
          }}
        >
          <SelectTrigger className="h-9 border-primary/20 bg-[hsl(216_35%_7%)] text-sm text-white focus:ring-primary/40">
            <SelectValue placeholder={values.length >= max ? `${label} full` : `Choose ${label.toLocaleLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="border-white/15 bg-[hsl(216_35%_7%)] text-white">
            {availableSuggestions.map((option) => (
              <SelectItem key={option} value={option} className="text-white focus:bg-primary/20 focus:text-white">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          disabled={values.length >= max}
          maxLength={50}
          placeholder={values.length >= max ? `${label} full` : placeholder}
          className="h-9 bg-black/30 text-sm"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={add}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" disabled={!draft.trim() || values.length >= max} onMouseDown={(event) => event.preventDefault()} onClick={add}>
          Add
        </Button>
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
  const [previewViewport, setPreviewViewport] = useState<'phone' | 'tablet' | 'desktop'>('desktop');
  const [previewOverflow, setPreviewOverflow] = useState(false);
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
  const [committedFeaturedPreviewPath, setCommittedFeaturedPreviewPath] = useState<string | undefined>();
  const [featuredTracks, setFeaturedTracks] = useState<DeckPlayable[]>([]);
  const [featuredTracksLoading, setFeaturedTracksLoading] = useState(false);
  const [featuredPreviewBusy, setFeaturedPreviewBusy] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewing) return;
    const check = () => {
      const frame = previewFrameRef.current;
      if (!frame) return;
      const bounds = frame.getBoundingClientRect();
      const unsafe = [...frame.querySelectorAll<HTMLElement>('[data-profile-safe-check]')].some((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
      });
      setPreviewOverflow(unsafe);
    };
    const timer = window.setTimeout(check, 180);
    window.addEventListener('resize', check);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', check);
    };
  }, [config, previewing, previewViewport]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchArtistHomeConfig()
      .then((next) => {
        setConfig(next);
        setCommittedMemoPath(next.featured.voiceMemo?.storagePath);
        setCommittedFeaturedPreviewPath(next.featured.featuredTrack?.previewPath);
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

  useEffect(() => {
    if (!config || typeof window === 'undefined' || window.location.hash !== '#artist-home-releases') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('artist-home-releases')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [config]);

  useEffect(() => {
    if (!user?.id || !firstDropsOn) {
      setFeaturedTracks([]);
      return;
    }
    let cancelled = false;
    setFeaturedTracksLoading(true);
    void (async () => {
      const current = auth.currentUser;
      if (!current) throw new Error('Sign in again to load your Library.');
      const token = await current.getIdToken();
      const response = await fetch(`/api/drops/library?userId=${encodeURIComponent(user.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load your Library.');
      if (!cancelled) setFeaturedTracks(flattenLibraryItems((data.items || []) as DropLibraryItem[]));
    })()
      .catch((error) => {
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Could not load featured-track choices',
            description: error instanceof Error ? error.message : undefined,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setFeaturedTracksLoading(false);
      });
    return () => { cancelled = true; };
  }, [firstDropsOn, toast, user?.id]);

  const vaultBars = useMemo(() => collectVaultBars(albums), [albums]);
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
      if (album.isPublic && album.shareId && dnaStatusOf(album) === 'live') {
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
      const albumLive = Boolean(album.isPublic && album.shareId && dnaStatusOf(album) === 'live');
      (album.tracks || []).forEach((track, trackIndex) => {
        if (!(track.isPublic && track.shareId && dnaStatusOf(track) === 'live')) return;
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
    user,
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
      const previousFeaturedPreviewPath = committedFeaturedPreviewPath;
      const saved = await saveArtistHomeConfigClient(config);
      setConfig(saved);
      setCommittedMemoPath(saved.featured.voiceMemo?.storagePath);
      setCommittedFeaturedPreviewPath(saved.featured.featuredTrack?.previewPath);
      if (previousMemoPath && previousMemoPath !== saved.featured.voiceMemo?.storagePath) {
        void deleteVoiceStorage(previousMemoPath);
      }
      if (
        previousFeaturedPreviewPath &&
        previousFeaturedPreviewPath !== saved.featured.featuredTrack?.previewPath
      ) {
        void deleteFeaturedTrackPreview(previousFeaturedPreviewPath);
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

  const chooseFeaturedTrack = (key: string) => {
    if (key === '__none__') {
      update((draft) => { draft.featured.featuredTrack = undefined; });
      return;
    }
    const item = featuredTracks.find((track) => track.key === key);
    if (!item) return;
    update((draft) => {
      draft.featured.featuredTrack = {
        shareId: item.shareId,
        ...(item.trackId ? { trackId: item.trackId } : {}),
        title: item.title,
        artistName: item.artistName,
        ownerId: item.ownerId,
        ...(item.durationSec ? { durationSec: item.durationSec } : {}),
        excerptStartSec: 0,
        source: item.own ? 'owned' : 'purchased',
      };
    });
  };

  const buildFeaturedPreview = async () => {
    const selected = config?.featured.featuredTrack;
    if (!user?.id || !selected || selected.excerptStartSec <= 0) return;
    setFeaturedPreviewBusy(true);
    try {
      const result = await buildFeaturedTrackPreview({
        userId: user.id,
        shareId: selected.shareId,
        trackId: selected.trackId,
        excerptStartSec: selected.excerptStartSec,
      });
      update((draft) => {
        if (!draft.featured.featuredTrack) return;
        draft.featured.featuredTrack.previewPath = result.previewPath;
        draft.featured.featuredTrack.durationSec = result.durationSec;
      });
      toast({
        title: '30-second showcase ready',
        description: 'Press your page to publish this featured moment.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not build the showcase',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setFeaturedPreviewBusy(false);
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
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/10 bg-background/80 px-3 py-2">
          {([
            { id: 'phone', label: 'Phone', icon: Smartphone },
            { id: 'tablet', label: 'iPad', icon: Tablet },
            { id: 'desktop', label: 'Desktop', icon: Monitor },
          ] as const).map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={previewViewport === option.id ? 'default' : 'outline'}
              className="h-8 gap-1.5 px-2.5 text-[10px] font-bold uppercase"
              onClick={() => setPreviewViewport(option.id)}
            >
              <option.icon className="h-3.5 w-3.5" /> {option.label}
            </Button>
          ))}
          <span className={cn('text-[10px] font-code uppercase tracking-wider', previewOverflow ? 'text-amber-300' : 'text-emerald-300')}>
            {previewOverflow ? 'Width needs attention' : 'Safe width'}
          </span>
        </div>
        <div className="overflow-x-auto bg-black/35 p-2 sm:p-4">
          <div
            ref={previewFrameRef}
            className={cn(
              'mx-auto overflow-hidden border border-white/10 bg-background shadow-2xl transition-[width] duration-300',
              previewViewport === 'phone' && 'w-[390px]',
              previewViewport === 'tablet' && 'w-[820px]',
              previewViewport === 'desktop' && 'w-full max-w-[1440px]',
              previewOverflow && 'ring-2 ring-amber-400/70'
            )}
          >
            <ArtistHome
              profile={previewProfile}
              config={config}
              isOwner
              previewMode
              previewViewport={previewViewport}
              onExitPreview={() => setPreviewing(false)}
            />
          </div>
        </div>
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
  const selectedFeaturedTrack = config.featured.featuredTrack;
  const selectedFeaturedKey = selectedFeaturedTrack
    ? featuredTracks.find(
        (item) =>
          item.shareId === selectedFeaturedTrack.shareId &&
          (item.trackId || undefined) === (selectedFeaturedTrack.trackId || undefined)
      )?.key || '__none__'
    : '__none__';
  const featuredMaxStart = Math.max(0, (selectedFeaturedTrack?.durationSec || 30) - 30);
  const displayName = user.displayName || 'Artist';
  const soundIdentity: ArtistHomeSoundIdentity = config.featured.soundIdentity || {};

  return (
    <div className="w-full px-4 pb-32 pt-8">
      <div className="relative min-[1830px]:grid min-[1830px]:grid-cols-[minmax(0,1fr)_46rem_minmax(0,1fr)] min-[1830px]:items-start">
        <div className="mx-auto w-full max-w-[46rem] min-w-0 space-y-5 min-[1830px]:col-start-2 min-[1830px]:row-start-1">
      <header className="space-y-3">
        <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">Edit Public Page</h1>
        <EditPageCheatSheet firstDropsOn={firstDropsOn} />
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
        id="the-pressing"
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
          <div className="space-y-4 rounded-xl border border-primary/20 bg-black/20 p-3 sm:p-4">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <Music2 className="h-3.5 w-3.5" /> Your place in music
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Choose what fits. Music Fans belong here too—this is your public identity, not an account permission.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_IDENTITY_KINDS.map((option) => {
                const active = soundIdentity.kinds?.includes(option.id) || false;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      update((draft) => {
                        const current = draft.featured.soundIdentity || {};
                        const kinds = current.kinds || [];
                        const nextKinds = active
                          ? kinds.filter((kind) => kind !== option.id)
                          : kinds.length < 3
                            ? [...kinds, option.id]
                            : kinds;
                        draft.featured.soundIdentity = { ...current, kinds: nextKinds };
                      })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                      active
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-white/10 bg-black/20 text-muted-foreground hover:border-white/25',
                      !active && (soundIdentity.kinds?.length || 0) >= 3 && 'cursor-not-allowed opacity-45'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <TagEditor
              label="Genres / styles"
              values={soundIdentity.genres || []}
              max={3}
              placeholder="Or add your own genre / style"
              suggestions={PUBLIC_GENRE_STYLE_OPTIONS}
              onChange={(genres) => update((draft) => void (draft.featured.soundIdentity = { ...(draft.featured.soundIdentity || {}), genres }))}
            />
            <TagEditor
              label="Moods / energy"
              values={soundIdentity.moods || []}
              max={5}
              placeholder="Or add your own mood"
              suggestions={PUBLIC_MOOD_OPTIONS}
              onChange={(moods) => update((draft) => void (draft.featured.soundIdentity = { ...(draft.featured.soundIdentity || {}), moods }))}
            />
            <TagEditor
              label="Influences"
              values={soundIdentity.influences || []}
              max={5}
              placeholder="Add an influence"
              onChange={(influences) => update((draft) => void (draft.featured.soundIdentity = { ...(draft.featured.soundIdentity || {}), influences }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/70">Scene / region</label>
                <Input
                  value={soundIdentity.region || ''}
                  maxLength={80}
                  placeholder="Optional—city, region, or scene"
                  className="bg-black/30 text-sm"
                  onChange={(event) => update((draft) => void (draft.featured.soundIdentity = { ...(draft.featured.soundIdentity || {}), region: event.target.value.slice(0, 80) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/70">Collaboration</label>
                <Select
                  value={soundIdentity.collaboration || 'none'}
                  onValueChange={(value) =>
                    update((draft) => void (draft.featured.soundIdentity = {
                      ...(draft.featured.soundIdentity || {}),
                      collaboration: value === 'none' ? undefined : value as ArtistHomeSoundIdentity['collaboration'],
                    }))
                  }
                >
                  <SelectTrigger className="border-white/15 bg-[hsl(216_35%_7%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-white/15 bg-[hsl(216_35%_7%)] text-white">
                    <SelectItem value="none" className="text-white focus:bg-primary/20 focus:text-white">Not listed</SelectItem>
                    <SelectItem value="open" className="text-white focus:bg-primary/20 focus:text-white">Open to collaborate</SelectItem>
                    <SelectItem value="selective" className="text-white focus:bg-primary/20 focus:text-white">Selective collaborations</SelectItem>
                    <SelectItem value="not_now" className="text-white focus:bg-primary/20 focus:text-white">Not collaborating right now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              value={soundIdentity.currentFocus || ''}
              rows={2}
              maxLength={120}
              placeholder="What are you listening to, making, supporting, or releasing right now?"
              className="bg-black/30 text-sm"
              onChange={(event) => update((draft) => void (draft.featured.soundIdentity = { ...(draft.featured.soundIdentity || {}), currentFocus: event.target.value.slice(0, 120) }))}
            />
            <p className="text-[10px] text-muted-foreground">Only what you choose here becomes public. Private lyrics and DNA stay private.</p>
          </div>
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
        hint="3-second hello under your photo, then any links you fill."
      >
        <div className="space-y-3">
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
          <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2">
            {SOCIAL_PROVIDERS.map((provider) => (
              <label
                key={provider.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2 py-1"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-primary"
                  title={provider.label}
                >
                  <SocialGlyph id={provider.id} className="h-3.5 w-3.5" />
                </span>
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
                  aria-label={provider.label}
                  className="h-8 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
                />
              </label>
            ))}
          </div>
        </div>
      </DeskSection>

      {/* 3. Now Playing */}
      <DeskSection
        icon={Disc3}
        title="Now Playing"
        hint="Feature one of your releases or a track you purchased. Visitors hear your chosen 30 seconds; owners hear the full track. External embeds still work below."
      >
        <div className="space-y-4">
          {firstDropsOn && (
            <div className="space-y-3 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 p-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
                  Featured from your Library
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Includes music you released and tracks you bought as a Music Fan.
                </p>
              </div>
              <Select
                value={selectedFeaturedKey}
                onValueChange={chooseFeaturedTrack}
                disabled={featuredTracksLoading}
              >
                <SelectTrigger className="bg-black/30 text-sm">
                  <SelectValue placeholder={featuredTracksLoading ? 'Loading Library…' : 'Choose a track'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No release featured</SelectItem>
                  {featuredTracks.map((track) => (
                    <SelectItem key={track.key} value={track.key}>
                      {track.title} · {track.artistName} · {track.own ? 'Mine' : 'Purchased'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!featuredTracksLoading && featuredTracks.length === 0 && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Your own live releases and purchased tracks will appear here.
                </p>
              )}
              {selectedFeaturedTrack && (
                <div className="space-y-3 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold">Choose the 30-second moment</span>
                    <span className="font-code text-fuchsia-200">
                      {formatDeckTime(selectedFeaturedTrack.excerptStartSec)}–{formatDeckTime(Math.min(selectedFeaturedTrack.excerptStartSec + 30, selectedFeaturedTrack.durationSec || 30))}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(featuredMaxStart, selectedFeaturedTrack.excerptStartSec)]}
                    min={0}
                    max={Math.max(1, featuredMaxStart)}
                    step={1}
                    disabled={featuredMaxStart <= 0 || featuredPreviewBusy}
                    onValueChange={([value]) =>
                      update((draft) => {
                        const track = draft.featured.featuredTrack;
                        if (!track) return;
                        track.excerptStartSec = Math.max(0, Math.min(featuredMaxStart, value));
                        track.previewPath = undefined;
                      })
                    }
                  />
                  {selectedFeaturedTrack.excerptStartSec > 0 ? (
                    <Button
                      type="button"
                      variant={selectedFeaturedTrack.previewPath ? 'outline' : 'default'}
                      className="w-full gap-2 font-bold uppercase"
                      disabled={featuredPreviewBusy}
                      onClick={() => void buildFeaturedPreview()}
                    >
                      {featuredPreviewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
                      {selectedFeaturedTrack.previewPath ? 'Rebuild 30-second showcase' : 'Build 30-second showcase'}
                    </Button>
                  ) : (
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300">
                      The drop’s opening preview is ready—no extra build needed.
                    </p>
                  )}
                  {selectedFeaturedTrack.excerptStartSec > 0 && !selectedFeaturedTrack.previewPath && (
                    <p className="text-[10px] uppercase tracking-wider text-amber-300">
                      Build this showcase before pressing your page.
                    </p>
                  )}
                  {selectedFeaturedTrack.source === 'purchased' ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3">
                      <div>
                        <p className="text-xs font-bold">Show First Press badge</p>
                        <p className="text-[10px] text-muted-foreground">Verified when you press the page; available to the first 10 supporters.</p>
                      </div>
                      <Switch
                        checked={selectedFeaturedTrack.showFirstPressBadge === true}
                        onCheckedChange={(checked) => update((draft) => {
                          if (draft.featured.featuredTrack) {
                            draft.featured.featuredTrack.showFirstPressBadge = checked;
                            if (!checked) draft.featured.featuredTrack.firstPressRank = undefined;
                          }
                        })}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px flex-1 bg-white/10" /> External player <span className="h-px flex-1 bg-white/10" />
          </div>
          <p className="text-[10px] text-muted-foreground">{EMBED_HELP_TEXT}</p>
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
              Linked to its live DNA Drop
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

      {/* 8. Live Lyric DNA Drops — manage + auto on Artist Home */}
      <DeskSection
        id="artist-home-releases"
        icon={Dna}
        title="Releases on Artist Home"
        hint={
          firstDropsOn
            ? `Music is published through New release or Release Catalog—not inside DNA Drop. Live releases show on your Artist Home automatically. ${firstDropsFeeCashoutLine()} Open Manage to jump to a release, the Vault, or Earnings.`
            : 'Any album or track with an active DNA Drop shows on your Artist Home automatically — as a count under your bio and in the Live Lyric DNA Drops module. Open Manage to jump to a drop or the vault.'
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

        </div>

        <aside
          className="sticky top-20 hidden w-[29rem] self-start min-[1830px]:col-start-3 min-[1830px]:row-start-1 min-[1830px]:ml-[4.5rem] min-[1830px]:block"
          aria-label="Live Artist Home preview"
        >
          <div className="overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#07111f] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 py-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                  <Monitor className="h-3.5 w-3.5" /> Live page preview
                </p>
                <p className="mt-0.5 text-[9px] leading-tight text-white/50">
                  Desktop · 1280 × 800. Scroll inside to inspect the full page.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-auto shrink-0 gap-1.5 px-2.5 text-[9px] font-bold uppercase tracking-wider"
                disabled={!previewProfile}
                onClick={openPreview}
              >
                <Eye className="h-3.5 w-3.5" /> Full screen
              </Button>
            </div>
            <div className="aspect-[16/10] w-full overflow-y-auto overflow-x-hidden overscroll-contain bg-black [scrollbar-width:thin]">
              {previewProfile ? (
                <div
                  className="w-[1280px] bg-background [zoom:.356]"
                >
                  <ArtistHome
                    profile={previewProfile}
                    config={config}
                    isOwner
                    previewMode
                    previewViewport="desktop"
                    embeddedPreview
                    onExitPreview={openPreview}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center gap-2 text-xs text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" /> Building your preview…
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

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
