'use client';

import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music, Loader, Trash2, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { DataContext } from '@/context/data-context';
import { uploadDropAudio } from '@/lib/drop-audio-upload';
import {
  DROP_AUDIO_ACCEPT,
  DROP_PAID_MIN_CENTS,
  DROP_PRICE_PRESETS_CENTS,
  centsToUsdLabel,
  defaultDropPrice,
  firstDropsFeeCashoutLine,
  firstDropsSplitLine,
  normalizeDropPrice,
  parseUsdToCents,
  type DropPrice,
  type DropPriceMode,
} from '@/lib/drop-commerce';
import type { Track } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';

const MODES: { id: DropPriceMode; label: string }[] = [
  { id: 'hidden', label: 'DNA only' },
  { id: 'fixed', label: 'Set price' },
  { id: 'pwyw', label: 'Pay what you want' },
];

export function PriceEditor({
  price,
  onChange,
  label,
  omitHidden = false,
}: {
  price: DropPrice;
  onChange: (next: DropPrice) => void;
  label: string;
  omitHidden?: boolean;
}) {
  const [custom, setCustom] = useState('');
  const amount = price.amountCents ?? 777;
  const min = price.minCents ?? 0;
  const suggested = price.suggestedCents ?? 777;
  const effectiveMin = Math.max(DROP_PAID_MIN_CENTS, min);
  const effectiveSuggested = Math.max(DROP_PAID_MIN_CENTS, suggested);
  const modes = omitHidden ? MODES.filter((m) => m.id !== 'hidden') : MODES;

  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">{label}</Label>
      <div className="grid grid-cols-2 gap-1.5">
        {modes.map((m) => (
          <Button
            key={m.id}
            type="button"
            size="sm"
            variant={price.mode === m.id ? 'default' : 'outline'}
            className={cn(
              'h-9 px-2 text-[11px] font-black uppercase tracking-wide',
              price.mode === m.id
                ? 'text-white'
                : 'border-white/30 bg-black/35 text-white/90 hover:bg-white/10 hover:text-white'
            )}
            onClick={() => onChange({ ...price, mode: m.id })}
          >
            {m.label}
          </Button>
        ))}
      </div>
      {price.mode === 'fixed' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {DROP_PRICE_PRESETS_CENTS.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={amount === c ? 'secondary' : 'outline'}
                className="h-7 text-[10px] font-bold"
                onClick={() => onChange({ ...price, mode: 'fixed', amountCents: c })}
              >
                {centsToUsdLabel(c)}
              </Button>
            ))}
          </div>
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => {
              const cents = parseUsdToCents(custom);
              if (cents == null) return;
              onChange({ ...price, mode: 'fixed', amountCents: Math.max(DROP_PAID_MIN_CENTS, cents) });
            }}
            placeholder="Custom $"
            className="h-8 font-code text-xs"
          />
          <p className="text-[9px] text-muted-foreground">
            Charged {centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, amount))} · min {centsToUsdLabel(DROP_PAID_MIN_CENTS)}
          </p>
          <p className="text-[10px] font-medium leading-snug text-foreground/90">
            {firstDropsSplitLine(
              Math.max(
                DROP_PAID_MIN_CENTS,
                parseUsdToCents(custom) ?? amount
              )
            )}
          </p>
        </div>
      )}
      {price.mode === 'pwyw' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[9px] uppercase text-muted-foreground">Minimum</Label>
            <Input
              defaultValue={(effectiveMin / 100).toFixed(2)}
              onBlur={(e) => {
                const cents = parseUsdToCents(e.target.value);
                onChange({
                  ...price,
                  mode: 'pwyw',
                  minCents: Math.max(DROP_PAID_MIN_CENTS, cents ?? DROP_PAID_MIN_CENTS),
                });
              }}
              className="h-8 font-code text-xs"
            />
            <p className="text-[8px] text-muted-foreground mt-1">
              Lowest buyer price: {centsToUsdLabel(DROP_PAID_MIN_CENTS)}
            </p>
          </div>
          <div>
            <Label className="text-[9px] uppercase text-muted-foreground">Suggested</Label>
            <Input
              defaultValue={(effectiveSuggested / 100).toFixed(2)}
              onBlur={(e) => {
                const cents = parseUsdToCents(e.target.value);
                if (cents == null) return;
                onChange({ ...price, mode: 'pwyw', suggestedCents: Math.max(DROP_PAID_MIN_CENTS, cents) });
              }}
              className="h-8 font-code text-xs"
            />
          </div>
          <p className="col-span-2 text-[10px] font-medium leading-snug text-foreground/90">
            At the minimum: {firstDropsSplitLine(effectiveMin)}
          </p>
          {effectiveSuggested > 0 ? (
            <p className="col-span-2 text-[10px] font-medium leading-snug text-foreground/90">
              If they pay the suggested: {firstDropsSplitLine(effectiveSuggested)}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function DropCommercePanel({
  type,
  id,
  albumId,
}: {
  type: 'album' | 'track';
  id: string;
  albumId?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const { getAlbumById, updateAlbum, updateTrack } = React.useContext(DataContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const album = getAlbumById(type === 'album' ? id : albumId || '');
  const track: Track | undefined =
    type === 'track' ? album?.tracks?.find((t) => t.id === id) : undefined;

  const saveTrack = (updates: Partial<Track>) => {
    if (!albumId) {
      toast({ variant: 'destructive', title: 'Open this song from its album to attach audio.' });
      return;
    }
    updateTrack(albumId, id, updates);
  };

  const onPickAudio = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const meta = await uploadDropAudio({ userId: user.id, projectId: id, file });
      if (type === 'track') saveTrack({ dropAudio: meta });
      toast({
        title: 'Audio uploaded',
        description: '30-second preview is ready. Update snapshot to put it on the public drop.',
      });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Could not store audio.',
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const price = normalizeDropPrice(type === 'album' ? album?.dropPrice : track?.dropPrice);

  if (!firstDropsOn) return null;

  return (
    <div className="space-y-3 border-t border-white/10 pt-4 min-w-0">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-primary shrink-0" />
        <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">
          First Drop · audio &amp; price
        </Label>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Upload the song to Bar 4 Bar (private storage). Fans buy once — set price or pay-what-you-want — then stream it
        here. Preview is 30 seconds until they pay or you set it free. {firstDropsFeeCashoutLine()}
      </p>
      <Button asChild variant="outline" className="h-8 w-full text-[9px] font-bold uppercase tracking-widest">
        <Link href="/earnings">
          <Banknote className="mr-1.5 h-3.5 w-3.5" />
          Earnings &amp; cash out
        </Link>
      </Button>

      {type === 'track' && (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept={DROP_AUDIO_ACCEPT}
            className="hidden"
            onChange={(e) => void onPickAudio(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 flex-1 text-[10px] font-bold uppercase"
              disabled={uploading || !user}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Music className="mr-2 h-3.5 w-3.5" />}
              {track?.dropAudio ? 'Replace audio' : 'Upload song'}
            </Button>
            {track?.dropAudio && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 text-red-400"
                onClick={() => saveTrack({ dropAudio: undefined })}
                aria-label="Remove audio"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {track?.dropAudio && (
            <p className={cn('text-[10px] font-code text-emerald-400/90')}>
              {track.dropAudio.fileName || 'Audio on file'}
              {track.dropAudio.durationSec
                ? ` · ${Math.round(track.dropAudio.durationSec)}s`
                : ''}
            </p>
          )}
        </div>
      )}

      {type === 'album' && (
        <p className="text-[10px] text-muted-foreground">
          Upload audio on each song&apos;s DNA Drop. Album price unlocks every track that has audio.
        </p>
      )}

      <PriceEditor
        label={type === 'album' ? 'Album price' : 'Song price'}
        price={price.mode ? price : defaultDropPrice()}
        onChange={(next) => {
          if (type === 'album') updateAlbum(id, { dropPrice: next });
          else saveTrack({ dropPrice: next });
        }}
      />
    </div>
  );
}
