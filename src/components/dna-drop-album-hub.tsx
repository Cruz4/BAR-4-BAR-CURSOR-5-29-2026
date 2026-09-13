'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShareCoverImage } from '@/components/share-cover-image';
import {
  hasActiveDnaDrop,
  trackLyricBarCount,
  type DnaDropAlbumPayload,
  type DnaDropTrackPayload,
} from '@/lib/dna-drop';
import { CassetteTape, ChevronRight, Lock } from 'lucide-react';
import { dropPriceSummary, isCommerceLive, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { cn } from '@/lib/utils';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { DropListenPanel } from '@/components/drop-listen-panel';
import { MusicDiscoveryTags } from '@/components/music-discovery-tags';
import { publicMusicMetadataFromTrack } from '@/lib/music-discovery-metadata';
import { orderAlbumTracks } from '@/lib/album-track-order';
import { pressedSongHref } from '@/lib/pressed-song';
import { resolveDnaDropHref } from '@/lib/dna-drop-access';

type DnaDropAlbumHubProps = {
  album: DnaDropAlbumPayload;
  shareId: string;
  ownerId: string;
  ownerName: string;
  houseRelease?: boolean;
  canViewDna?: boolean;
  signedIn?: boolean;
};

function trackSubtitle(track: DnaDropTrackPayload, firstDropsOn: boolean, canViewDna: boolean): string {
  const bits: string[] = [];
  if (firstDropsOn && normalizeDropAudio(track.dropAudio)) bits.push('Audio');
  const price = firstDropsOn ? dropPriceSummary(normalizeDropPrice(track.dropPrice)) : '';
  if (price) bits.push(price);
  if (canViewDna && track.vibe?.enabled !== false && track.vibe?.genre) bits.push(track.vibe.genre);
  if (canViewDna && track.vibe?.enabled !== false && track.vibe?.tempoBPM) bits.push(`${track.vibe.tempoBPM} BPM`);
  if (canViewDna) {
    const bars = trackLyricBarCount(track);
    if (bars > 0) bits.push(`${bars} bar${bars === 1 ? '' : 's'}`);
  }
  return bits.join(' · ') || (canViewDna ? 'No lyrics drafted yet' : 'Release track');
}

export function DnaDropAlbumHub({
  album,
  shareId,
  ownerId,
  ownerName,
  houseRelease = false,
  canViewDna = true,
  signedIn = false,
}: DnaDropAlbumHubProps) {
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const tracks = orderAlbumTracks(album.tracks ?? [], album);
  const liveCount = tracks.filter((t) => hasActiveDnaDrop(t.shareId)).length;
  const audioCount = tracks.filter((t) => normalizeDropAudio(t.dropAudio)).length;
  const albumForSale = firstDropsOn && audioCount > 0 && (
    houseRelease || isCommerceLive(normalizeDropPrice(album.dropPrice))
  );

  return (
    <Card className="border-2 shadow-2xl relative overflow-hidden bg-card/90 min-h-[50vh]">
      <div className="border-b px-4 py-5 sm:px-8 sm:py-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-primary/20 text-primary">
            {houseRelease ? 'House album · Free' : albumForSale ? 'Album release' : 'Album DNA'}
          </Badge>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {albumForSale
              ? `${audioCount} audio track${audioCount === 1 ? '' : 's'} included`
              : `${liveCount}/${tracks.length} tracks live`}
          </span>
        </div>
        <h3 className="font-headline text-xl sm:text-2xl font-bold uppercase tracking-tight">
          Songs in {album.title}
        </h3>
        <p className="text-[11px] text-muted-foreground font-code leading-relaxed max-w-2xl">
          {albumForSale
            ? houseRelease
              ? 'Every signed-in member receives every included recording free in their AKAsheet Library; lyrics are optional.'
              : 'Preview every included recording here. One album purchase unlocks every audio track in your AKAsheet Library; lyrics are optional.'
            : canViewDna
              ? 'Open a live track to see its DNA Drop — lyrics, Creative DNA, and whatever was toggled on when it went public.'
              : 'Open a live track to listen. Viewing or importing DNA Drop lyrics is Studio Pro.'}
        </p>
      </div>

      <CardContent className="p-4 sm:p-6">
        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-12 text-center">No tracks in this album snapshot.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {tracks.map((track, idx) => {
              const live = hasActiveDnaDrop(track.shareId) && track.dnaStatus !== 'unlisted';
              const hasAudio = Boolean(normalizeDropAudio(track.dropAudio));
              const releasedInAlbum = albumForSale && hasAudio;
              const releaseHref = releasedInAlbum
                ? pressedSongHref(shareId, { trackId: track.id })
                : live && track.shareId
                  ? resolveDnaDropHref(track.shareId, signedIn, canViewDna)
                  : undefined;
              const inner = (
                <>
                  <div className="relative aspect-square w-full overflow-hidden border-b bg-neutral-950">
                    <ShareCoverImage
                      src={track.coverArtUrl || album.coverArtUrl}
                      alt={track.title || `Track ${idx + 1}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] uppercase tracking-widest border bg-black/50 backdrop-blur-sm',
                          releasedInAlbum || live
                            ? 'border-emerald-500/40 text-emerald-300'
                            : 'border-white/20 text-muted-foreground'
                        )}
                      >
                        {releasedInAlbum ? 'Released on album' : live ? 'DNA live' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </p>
                      <h4 className="font-headline text-base sm:text-lg font-bold uppercase tracking-tight text-white leading-tight line-clamp-2">
                        {track.title || `Untitled ${idx + 1}`}
                      </h4>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] text-muted-foreground truncate">{trackSubtitle(track, firstDropsOn, canViewDna)}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                        {releasedInAlbum ? (
                          <>
                            <CassetteTape className="h-3 w-3 text-emerald-300 shrink-0" />
                            Open song page
                          </>
                        ) : live ? (
                          <>
                            <CassetteTape className="h-3 w-3 text-primary shrink-0" />
                            {canViewDna
                              ? hasAudio ? 'Audio included · open track DNA' : 'Open track DNA'
                              : 'Studio Pro to view lyrics'}
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 shrink-0" />
                            {hasAudio ? 'Audio included · lyrics optional' : 'Not dropped yet'}
                          </>
                        )}
                      </p>
                    </div>
                    {releasedInAlbum || live ? (
                      <ChevronRight className="h-5 w-5 text-primary shrink-0" aria-hidden />
                    ) : null}
                  </div>
                </>
              );

              return (
                <li key={track.id}>
                  {releaseHref ? (
                    <Link
                      href={releaseHref}
                      className={cn(
                        'block overflow-hidden rounded-xl border-2 border-border bg-card/80 transition-colors',
                        'hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      )}
                      aria-label={releasedInAlbum ? `Open song page for ${track.title}` : `Open DNA Drop for ${track.title}`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      className="overflow-hidden rounded-xl border-2 border-dashed border-border/60 bg-muted/10 opacity-80"
                      title={`Ask ${ownerName} to live-drop this track`}
                      aria-disabled
                    >
                      {inner}
                    </div>
                  )}
                  <MusicDiscoveryTags
                    metadata={publicMusicMetadataFromTrack(track)}
                    compact
                    className="mt-2 px-1"
                  />
                  {albumForSale && hasAudio ? (
                    <DropListenPanel
                      shareId={shareId}
                      trackId={track.id}
                      title={track.title || `Track ${idx + 1}`}
                      artistName={ownerName}
                      ownerId={ownerId}
                      price={album.dropPrice}
                      hasAudio
                      houseRelease={houseRelease}
                      source="share"
                      presentation="compact"
                      playbackGroup={`album-${shareId}`}
                      detailsHref={pressedSongHref(shareId, { trackId: track.id })}
                      checkoutDestination="share"
                      showPurchase={false}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
