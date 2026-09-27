'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Globe, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { ArtistHomeProspectAdminRow } from '@/lib/artist-home-prospect';

function statusBadge(status: string) {
  switch (status) {
    case 'ready':
      return <Badge className="bg-emerald-600">Ready</Badge>;
    case 'sent':
      return <Badge className="bg-sky-600">Sent</Badge>;
    case 'claimed':
      return <Badge variant="secondary">Claimed</Badge>;
    case 'archived':
      return <Badge variant="outline">Archived</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}

export function AdminArtistHomeProspectsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ArtistHomeProspectAdminRow[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [lastClaimUrl, setLastClaimUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch('/api/admin/artist-home-prospects');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Load failed');
      setRows(data.prospects || []);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not load prospects',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = (label: string, value: string) => {
    void navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  const createProspect = async () => {
    if (!displayName.trim()) {
      toast({ variant: 'destructive', title: 'Artist name required' });
      return;
    }
    setCreating(true);
    try {
      const res = await adminApiFetch('/api/admin/artist-home-prospects', {
        method: 'POST',
        body: JSON.stringify({
          displayName: displayName.trim(),
          slug: slug.trim() || undefined,
          inviteEmails: inviteEmail.trim() ? [inviteEmail.trim()] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setLastClaimUrl(data.claimUrl || null);
      setDisplayName('');
      setSlug('');
      setInviteEmail('');
      toast({
        title: 'Prospect created',
        description: 'Copy the claim link before you leave this page.',
      });
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="bg-card border-2 shadow-2xl">
      <CardHeader className="border-b">
        <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-emerald-400" />
          Artist Home outreach
        </CardTitle>
        <CardDescription>
          Pre-build Artist Homes for direct outreach. Publish to reserve a vanity link, then send the
          claim URL. After claim, only the artist&apos;s account controls the profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest">Artist name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Stage name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest">Vanity link</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="artist_name (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest">Invite email</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="who can claim (optional)"
            />
          </div>
        </div>
        {lastClaimUrl ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs space-y-2">
            <p className="font-bold uppercase tracking-widest text-emerald-300">Claim link (save now)</p>
            <p className="break-all font-mono text-emerald-100/90">{lastClaimUrl}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => copy('Claim link', lastClaimUrl)}
            >
              <Copy className="h-3.5 w-3.5" /> Copy claim link
            </Button>
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No prospects yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-bold text-white">{row.displayName}</div>
                      {row.contactLabel ? (
                        <div className="text-[10px] text-muted-foreground">{row.contactLabel}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">/{row.slug}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell>{row.viewCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/prospects/${row.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3 border-t bg-primary/5 py-6">
        <Button
          className="gap-2 font-bold uppercase"
          onClick={() => void createProspect()}
          disabled={creating}
        >
          <Plus className="h-4 w-4" />
          {creating ? 'Creating…' : 'New prospect'}
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        <Button type="button" variant="ghost" className="gap-2" asChild>
          <Link href="/admin/prospects">
            <Globe className="h-4 w-4" /> Full manager
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
