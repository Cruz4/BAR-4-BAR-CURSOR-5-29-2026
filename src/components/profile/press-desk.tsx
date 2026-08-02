'use client';

/**
 * Edit Public Page — the one-panel Artist Home customizer.
 * Seed a bar → four faders → module deck. The skin is pressed from the
 * artist's own writing; this panel only mixes what the engine composes.
 */

import React, { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Disc3,
  Dna,
  DoorOpen,
  ExternalLink,
  Fingerprint,
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
  Trash2,
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
import { processAlbumRoomBannerFile } from '@/lib/cover-art';
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
import { StudioLoader } from '@/components/studio-loader';
import {
  fetchArtistHomeConfig,
  saveArtistHomeConfigClient,
} from '@/lib/profile/artist-home-client';
import { fetchGamificationSummary } from '@/lib/gamification-client';

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

const FADER_META: Array<{ key: keyof PressingFaders; label: string; low: string; high: string }> = [
  { key: 'heat', label: 'Heat', low: 'muted', high: 'blazing' },
  { key: 'grain', label: 'Grain', low: 'clean', high: 'textured' },
  { key: 'pace', label: 'Pace', low: 'still', high: 'restless' },
  { key: 'ink', label: 'Ink', low: 'lifted', high: 'pitch black' },
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
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void fetchArtistHomeConfig()
      .then(setConfig)
      .catch(() => toast({ variant: 'destructive', title: 'Could not load your Artist Home config' }));
    void fetchGamificationSummary(user.id).then((summary) => {
      if (summary?.profileSlug) setProfileSlug(summary.profileSlug);
      setProfileLive(Boolean(summary?.publicProfile));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const vaultBars = useMemo(() => collectVaultBars(albums), [albums]);
  const dnaCandidates = useMemo(() => collectDnaCandidates(albums), [albums]);
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
    const drops: Array<{ shareId: string; title: string; kind: string }> = [];
    for (const album of albums) {
      if (album.isPublic && album.shareId) {
        drops.push({ shareId: album.shareId, title: album.title, kind: 'Album DNA' });
      }
      for (const track of album.tracks || []) {
        if (track.isPublic && track.shareId) {
          drops.push({ shareId: track.shareId, title: track.title, kind: 'Track DNA' });
        }
      }
    }
    return drops;
  }, [albums]);

  const update = (mutate: (draft: ArtistHomeConfig) => void) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next: ArtistHomeConfig = JSON.parse(JSON.stringify(prev));
      mutate(next);
      return next;
    });
    setDirty(true);
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

      {/* 1. The Pressing */}
      <DeskSection
        icon={Sparkles}
        title="The Pressing"
        hint="Pick the bar your skin is pressed from. Same bar, same skin — your lyrics style your page. Turn Alive on and the page breathes that bar's meter."
      >
        <div className="space-y-4">
          <PressingPreview config={config} displayName={displayName} />
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

      {/* 8. Live DNA Drops — auto on Artist Home */}
      <DeskSection
        icon={Dna}
        title="Live DNA Drops"
        hint="Any album or track with an active DNA Drop shows on your Artist Home automatically — as a count under your bio and in the Live DNA Drops module."
      >
        {publicShares.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No live DNA Drops yet — publish one from an album or track in the studio.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {publicShares.map((drop) => (
              <li
                key={drop.shareId}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80"
              >
                <span className="truncate">{drop.title}</span>
                <span className="ml-auto shrink-0 text-[9px] uppercase tracking-widest text-emerald-400/90">
                  Live · {drop.kind}
                </span>
              </li>
            ))}
          </ul>
        )}
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
        <div className="container mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          {profileSlug && profileLive ? (
            <Link
              href={`/profile/${profileSlug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View my page
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">
              Your pressing goes live when your public profile is on
            </span>
          )}
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
