'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Copy, ExternalLink, Save, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { adminApiFetch } from '@/lib/admin-client';
import { StudioLoader } from '@/components/studio-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import type { ArtistHomeProspectRecord } from '@/lib/artist-home-prospect';
import type { PressingFaders } from '@/lib/profile/pressing';
import { defaultArtistHomeConfig } from '@/lib/profile/modules';

const FADER_KEYS: Array<{ key: keyof PressingFaders; label: string }> = [
  { key: 'heat', label: 'Color' },
  { key: 'grain', label: 'Texture' },
  { key: 'pace', label: 'Motion' },
  { key: 'ink', label: 'Depth' },
];

export default function AdminProspectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading, authReady } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<ArtistHomeProspectRecord | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState('');
  const [publishedPreviewUrl, setPublishedPreviewUrl] = useState('');
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [wallDraft, setWallDraft] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await adminApiFetch(`/api/admin/artist-home-prospects/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Load failed');
      setRecord(data.prospect);
      setDraftPreviewUrl(data.draftPreviewUrl || '');
      setPublishedPreviewUrl(data.publishedPreviewUrl || '');
      setWallDraft(
        (data.prospect.wallPosts || [])
          .map((p: { text: string }) => p.text)
          .join('\n---\n')
      );
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not load prospect',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [id, toast]);

  useEffect(() => {
    if (!authReady || loading) return;
    if (!user || user.role !== 'admin') {
      router.replace('/');
      return;
    }
    void load();
  }, [authReady, loading, user, router, load]);

  if (loading || !authReady || !record) {
    return <StudioLoader size="lg" fullscreen />;
  }

  const config = record.artistHome || defaultArtistHomeConfig();

  const save = async () => {
    setBusy(true);
    try {
      const wallPosts = wallDraft
        .split(/\n---\n/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text, index) => ({
          id: record.wallPosts[index]?.id || `${Date.now()}_${index}`,
          text,
          createdAt: record.wallPosts[index]?.createdAt || new Date().toISOString(),
        }));
      const res = await adminApiFetch(`/api/admin/artist-home-prospects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: record.displayName,
          slug: record.slug,
          inviteEmails: record.inviteEmails,
          internalNotes: record.internalNotes,
          contactLabel: record.contactLabel,
          profilePhotoUrl: record.profilePhotoUrl,
          artistHome: record.artistHome,
          wallPosts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setRecord(data.prospect);
      toast({ title: 'Saved' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: string) => {
    setBusy(true);
    try {
      const res = await adminApiFetch(`/api/admin/artist-home-prospects/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      if (data.claimUrl) setClaimUrl(data.claimUrl);
      if (data.prospect) setRecord(data.prospect);
      if (data.publishedPreviewUrl) setPublishedPreviewUrl(data.publishedPreviewUrl);
      toast({ title: 'Done' });
      if (action === 'publish') await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const copy = (label: string, value: string) => {
    void navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  const setFeatured = (patch: Record<string, string>) => {
    setRecord({
      ...record,
      artistHome: {
        ...config,
        featured: { ...config.featured, ...patch },
      },
    });
  };

  const setFader = (key: keyof PressingFaders, value: number) => {
    setRecord({
      ...record,
      artistHome: {
        ...config,
        theme: {
          ...config.theme,
          faders: { ...config.theme.faders, [key]: value },
        },
      },
    });
  };

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4 space-y-8 pb-20">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link href="/admin/prospects">
          <ChevronLeft className="h-4 w-4" /> All prospects
        </Link>
      </Button>

      <div>
        <h1 className="font-headline text-3xl font-bold uppercase text-white">{record.displayName}</h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">/{record.slug} · {record.status}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {draftPreviewUrl ? (
          <Button size="sm" variant="outline" asChild>
            <a href={draftPreviewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Draft preview
            </a>
          </Button>
        ) : null}
        {publishedPreviewUrl && ['ready', 'sent', 'claimed'].includes(record.status) ? (
          <Button size="sm" variant="outline" asChild>
            <a href={publishedPreviewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Live preview
            </a>
          </Button>
        ) : null}
        <Button size="sm" disabled={busy} onClick={() => void runAction('publish')}>
          Publish to /{record.slug}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runAction('unpublish')}>
          Unpublish
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void runAction('regenerate_claim_secret')}
        >
          New claim secret
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void adminApiFetch(`/api/admin/artist-home-prospects/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({ markSent: true, status: 'sent' }),
            }).then(() => load())
          }
        >
          <Send className="h-3.5 w-3.5 mr-1" /> Mark sent
        </Button>
      </div>

      {claimUrl ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs space-y-2">
          <p className="font-bold uppercase tracking-widest text-emerald-300">Claim link</p>
          <p className="break-all font-mono">{claimUrl}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => copy('Claim link', claimUrl)}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
          </Button>
        </div>
      ) : null}

      <div className="space-y-4 rounded-2xl border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input
              value={record.displayName}
              onChange={(e) => setRecord({ ...record, displayName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Vanity slug</Label>
            <Input
              value={record.slug}
              onChange={(e) => setRecord({ ...record, slug: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Invite email (claim with this account)</Label>
          <Input
            value={record.inviteEmails[0] || ''}
            onChange={(e) =>
              setRecord({
                ...record,
                inviteEmails: e.target.value.trim() ? [e.target.value.trim()] : [],
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Hero photo URL</Label>
          <Input
            value={record.profilePhotoUrl || ''}
            onChange={(e) =>
              setRecord({
                ...record,
                profilePhotoUrl: e.target.value,
                profilePhotoMode: 'custom',
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Tagline</Label>
          <Input
            value={config.featured.tagline || ''}
            onChange={(e) => setFeatured({ tagline: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            rows={4}
            value={config.featured.bio || ''}
            onChange={(e) => setFeatured({ bio: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Pressing seed text</Label>
          <Input
            value={config.theme.seedText || ''}
            onChange={(e) =>
              setRecord({
                ...record,
                artistHome: {
                  ...config,
                  theme: { ...config.theme, seedText: e.target.value },
                },
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FADER_KEYS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Slider
                value={[config.theme.faders[key]]}
                max={100}
                step={1}
                onValueChange={([v]) => setFader(key, v)}
              />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Wall posts (separate with a line containing only ---)</Label>
          <Textarea rows={8} value={wallDraft} onChange={(e) => setWallDraft(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Internal notes</Label>
          <Textarea
            rows={3}
            value={record.internalNotes || ''}
            onChange={(e) => setRecord({ ...record, internalNotes: e.target.value })}
          />
        </div>
      </div>

      <Button className="w-full h-12 font-bold uppercase gap-2" disabled={busy} onClick={() => void save()}>
        <Save className="h-4 w-4" /> Save prospect
      </Button>
    </div>
  );
}
