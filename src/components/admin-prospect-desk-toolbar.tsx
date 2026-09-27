'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  artistHomeProspectDeleteConfirmMessage,
  type ArtistHomeProspectRecord,
} from '@/lib/artist-home-prospect';

export function AdminProspectDeskToolbar({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [prospect, setProspect] = useState<ArtistHomeProspectRecord | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState('');
  const [publishedPreviewUrl, setPublishedPreviewUrl] = useState('');
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await adminApiFetch(`/api/admin/artist-home-prospects/${prospectId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Load failed');
    setProspect(data.prospect);
    setDraftPreviewUrl(data.draftPreviewUrl || '');
    setPublishedPreviewUrl(data.publishedPreviewUrl || '');
  }, [prospectId]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const copy = (label: string, value: string) => {
    void navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  const publish = async () => {
    setBusy(true);
    try {
      const res = await adminApiFetch(`/api/admin/artist-home-prospects/${prospectId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'publish' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setPublishedPreviewUrl(data.publishedPreviewUrl || publishedPreviewUrl);
      await load();
      toast({ title: 'Published to vanity link' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Publish failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const newClaimSecret = async () => {
    setBusy(true);
    try {
      const res = await adminApiFetch(`/api/admin/artist-home-prospects/${prospectId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'regenerate_claim_secret' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setClaimUrl(data.claimUrl || null);
      toast({ title: 'New claim link — copy it now' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not rotate claim secret',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteProspect = async () => {
    if (!prospect) return;
    if (!window.confirm(artistHomeProspectDeleteConfirmMessage(prospect))) {
      return;
    }
    setBusy(true);
    try {
      const res = await adminApiFetch(`/api/admin/artist-home-prospects/${prospectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast({
        title: 'Outreach record removed',
        description: data.claimedLiveHomeLeftIntact
          ? 'Their live Artist Home and account were not changed.'
          : undefined,
      });
      router.replace('/admin/prospects');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] border-b border-emerald-500/20 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 px-4 py-2.5">
        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link href="/admin/prospects">
            <ChevronLeft className="h-4 w-4" /> Outreach
          </Link>
        </Button>
        <span className="font-headline text-xs font-bold uppercase tracking-widest text-emerald-300">
          {prospect?.displayName || 'Outreach edit'}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {prospect ? `/${prospect.slug} · ${prospect.status}` : ''}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {draftPreviewUrl ? (
            <Button size="sm" variant="outline" asChild>
              <a href={draftPreviewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Draft
              </a>
            </Button>
          ) : null}
          {publishedPreviewUrl ? (
            <Button size="sm" variant="outline" asChild>
              <a href={publishedPreviewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Live preview
              </a>
            </Button>
          ) : null}
          <Button size="sm" disabled={busy} onClick={() => void publish()}>Publish</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void newClaimSecret()}>
            Claim link
          </Button>
          {claimUrl ? (
            <Button size="sm" variant="outline" onClick={() => copy('Claim link', claimUrl)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void deleteProspect()}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
