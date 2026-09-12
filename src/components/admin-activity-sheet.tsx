'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApiFetch } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { visitorVerdictTone, type VisitorVerdict } from '@/lib/visitor-investigation';

type ActivitySource = 'studio' | 'visits' | 'clusters';

type ActivityRow = {
  id: string;
  timestamp: string;
  source: 'studio' | 'visits';
  event: string;
  summary: string;
  artistName: string | null;
  artistEmail: string | null;
  artistSlug: string | null;
  userId: string | null;
  guestAlias: string | null;
  path: string | null;
  ipHash?: string | null;
  uaFamily?: string | null;
  botLikely?: boolean;
};

type ClusterHit = {
  timestamp: string;
  path: string | null;
  guestAlias: string | null;
  userName: string | null;
  uaFamily: string | null;
  botLikely: boolean;
  ref: string | null;
};

type VisitorCluster = {
  networkId: string;
  hits: number;
  firstAt: string;
  lastAt: string;
  uniqueGuests: number;
  pages: string[];
  browsers: string[];
  refs: string[];
  guests: string[];
  signedIn: string[];
  botHits: number;
  probePaths: string[];
  judgement: {
    verdict: VisitorVerdict;
    label: string;
    reasons: string[];
    canDo: string;
    cannotDo: string;
  };
  recentHits: ClusterHit[];
};

function formatStamp(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '—';
  return format(d, 'MMM d, yyyy · h:mm a');
}

function rowMatches(row: ActivityRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.summary,
    row.event,
    row.artistName,
    row.artistEmail,
    row.artistSlug,
    row.userId,
    row.guestAlias,
    row.path,
    row.ipHash,
    row.uaFamily,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function clusterMatches(cluster: VisitorCluster, q: string): boolean {
  if (!q) return true;
  const hay = [
    cluster.networkId,
    cluster.judgement.label,
    cluster.judgement.verdict,
    cluster.guests.join(' '),
    cluster.signedIn.join(' '),
    cluster.pages.join(' '),
    cluster.browsers.join(' '),
    cluster.probePaths.join(' '),
    ...cluster.judgement.reasons,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export function AdminActivitySheet() {
  const [source, setSource] = useState<ActivitySource>('clusters');
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [clusters, setClusters] = useState<VisitorCluster[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openCluster, setOpenCluster] = useState<string | null>(null);

  const load = useCallback(async (nextSource: ActivitySource, cursor: string | null, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('source', nextSource);
      if (nextSource !== 'clusters') params.set('limit', '150');
      if (cursor) params.set('cursor', cursor);
      const res = await adminApiFetch(`/api/admin/activity?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Failed (${res.status})`);
      if (nextSource === 'clusters') {
        setClusters(Array.isArray(body.clusters) ? (body.clusters as VisitorCluster[]) : []);
        setRows([]);
        setNextCursor(null);
      } else {
        const incoming = Array.isArray(body.rows) ? (body.rows as ActivityRow[]) : [];
        setRows((prev) => (append ? [...prev, ...incoming] : incoming));
        setNextCursor(typeof body.nextCursor === 'string' ? body.nextCursor : null);
        if (!append) setClusters([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity');
      if (!append) {
        setRows([]);
        setClusters([]);
        setNextCursor(null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(source, null, false);
  }, [load, source]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((row) => rowMatches(row, q)) : rows;
  }, [query, rows]);

  const visibleClusters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clusters.filter((cluster) => clusterMatches(cluster, q)) : clusters;
  }, [query, clusters]);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
            Activity sheet
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Visitor clusters group anonymous hits by the same IP. The verdict is why 30 loads happened:
            scanner, scripted browser, refresh, or a person. Signed-in studio events stay on their own tab.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          disabled={loading}
          onClick={() => void load(source, null, false)}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ['clusters', 'Visitor clusters'],
            ['visits', 'Landing visits'],
            ['studio', 'Signed-in activity'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={source === id ? 'default' : 'outline'}
            className="h-8 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => setSource(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="relative mb-3 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            source === 'clusters'
              ? 'Search guest, network id, scanner, chrome…'
              : 'Search name, email, slug, uid, path…'
          }
          className="h-9 pl-9 text-sm"
        />
      </div>

      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

      {source === 'clusters' ? (
        <div className="space-y-3">
          {loading && !clusters.length ? (
            <p className="py-10 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Grouping visitors by IP cluster…
            </p>
          ) : visibleClusters.length ? (
            visibleClusters.map((cluster) => {
              const open = openCluster === cluster.networkId;
              return (
                <article
                  key={cluster.networkId}
                  className="rounded-xl border border-white/10 bg-card/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('text-[8px] uppercase', visitorVerdictTone(cluster.judgement.verdict))}
                        >
                          {cluster.judgement.label}
                        </Badge>
                        <p className="font-code text-[10px] text-muted-foreground">
                          {cluster.hits} saved hits · {cluster.uniqueGuests} guest id
                          {cluster.uniqueGuests === 1 ? '' : 's'}
                        </p>
                      </div>
                      <p className="mt-2 font-code text-[11px] text-sky-200">IP cluster {cluster.networkId}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatStamp(cluster.firstAt)} → {formatStamp(cluster.lastAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => setOpenCluster(open ? null : cluster.networkId)}
                    >
                      {open ? 'Hide why' : 'Why this burst'}
                    </Button>
                  </div>

                  <p className="mt-3 text-sm text-white">{cluster.judgement.reasons[0]}</p>
                  <p className="mt-1 font-code text-[10px] text-muted-foreground">
                    Pages: {cluster.pages.join(', ') || '—'} · Browsers: {cluster.browsers.join(', ') || 'unknown'}
                    {cluster.probePaths.length ? ` · Bait probes: ${cluster.probePaths.join(', ')}` : ''}
                  </p>

                  {open ? (
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {cluster.judgement.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <p className="text-[12px] leading-relaxed text-amber-100/90">
                          <span className="font-bold uppercase tracking-wider text-amber-200">Could try: </span>
                          {cluster.judgement.canDo}
                        </p>
                        <p className="text-[12px] leading-relaxed text-emerald-100/90">
                          <span className="font-bold uppercase tracking-wider text-emerald-200">Cannot: </span>
                          {cluster.judgement.cannotDo}
                        </p>
                      </div>
                      <p className="font-code text-[10px] text-muted-foreground">
                        Guests: {cluster.guests.join(', ') || 'none'}
                        {cluster.signedIn.length ? ` · Signed-in: ${cluster.signedIn.join(', ')}` : ' · Signed-in: none'}
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>When</TableHead>
                            <TableHead>Page</TableHead>
                            <TableHead>Who</TableHead>
                            <TableHead>Client</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cluster.recentHits.map((hit, index) => (
                            <TableRow key={`${cluster.networkId}-${hit.timestamp}-${index}`}>
                              <TableCell className="whitespace-nowrap font-code text-[10px] text-muted-foreground">
                                {formatStamp(hit.timestamp)}
                              </TableCell>
                              <TableCell className="font-code text-[11px]">{hit.path || '—'}</TableCell>
                              <TableCell className="text-[11px]">
                                {hit.userName || hit.guestAlias || 'Anonymous'}
                              </TableCell>
                              <TableCell className="font-code text-[10px] text-muted-foreground">
                                {hit.uaFamily || 'unknown'}
                                {hit.botLikely ? ' · bot-like' : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="py-10 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {query.trim() ? 'No clusters match that search' : 'No saved public visits to group yet'}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-card/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>What they did</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Account / cluster</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !rows.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      Loading activity…
                    </TableCell>
                  </TableRow>
                ) : visibleRows.length ? (
                  visibleRows.map((row) => (
                    <TableRow key={`${row.source}-${row.id}`} className="border-white/5 align-top">
                      <TableCell className="whitespace-nowrap font-code text-[10px] text-muted-foreground">
                        {formatStamp(row.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="mb-1 text-[8px] uppercase">
                          {row.event.replace(/_/g, ' ')}
                        </Badge>
                        {row.botLikely ? (
                          <Badge variant="outline" className="mb-1 ml-1 text-[8px] uppercase text-rose-200">
                            bot-like
                          </Badge>
                        ) : null}
                        <p className="text-sm font-medium leading-snug text-white">{row.summary}</p>
                        {row.path ? (
                          <p className="mt-0.5 font-code text-[10px] text-muted-foreground">{row.path}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {row.source === 'visits' ? (
                          <div>
                            <p className="text-xs font-bold uppercase text-sky-200">
                              {row.artistName || row.guestAlias || 'Anonymous visitor'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {row.artistName ? 'Signed-in public page hit' : 'Not signed in — public page hit'}
                              {row.uaFamily ? ` · ${row.uaFamily}` : ''}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold uppercase text-white">
                              {row.artistName || 'Unknown artist'}
                            </p>
                            {row.artistEmail ? (
                              <p className="text-[10px] text-muted-foreground">{row.artistEmail}</p>
                            ) : null}
                            {row.artistSlug ? (
                              <p className="font-code text-[10px] text-sky-300/80">/{row.artistSlug}</p>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-code text-[10px] text-muted-foreground">
                        {row.userId || row.ipHash || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {query.trim()
                        ? 'Nothing in the loaded rows matches that search — load more or clear the filter'
                        : 'No events stored yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Showing {visibleRows.length}
              {query.trim() ? ` match${visibleRows.length === 1 ? '' : 'es'} of ${rows.length} loaded` : ' loaded'}
              {nextCursor ? ' · older events still on the sheet' : rows.length ? ' · end of stored events' : ''}
            </p>
            {nextCursor ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[10px] font-bold uppercase tracking-widest"
                disabled={loadingMore}
                onClick={() => void load(source, nextCursor, true)}
              >
                {loadingMore ? 'Loading…' : 'Load older events'}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
