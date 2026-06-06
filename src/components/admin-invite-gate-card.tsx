'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_INVITE_GATE_COPY, type InviteGateAdminConfig } from '@/lib/invite-gate';

export function AdminInviteGateCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [hasCode, setHasCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [copy, setCopy] = useState(DEFAULT_INVITE_GATE_COPY);

  useEffect(() => {
    adminApiFetch('/api/admin/invite-gate')
      .then(async (res) => {
        const data = (await res.json()) as InviteGateAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setEnabled(data.enabled);
        setHasCode(data.hasCode);
        setUpdatedAt(data.updatedAt);
        setCopy({ ...DEFAULT_INVITE_GATE_COPY, ...data.copy });
      })
      .catch((err) => {
        console.warn('[admin invite gate]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/invite-gate', {
        method: 'POST',
        body: JSON.stringify({
          enabled,
          code: newCode.trim() || undefined,
          ...copy,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setHasCode(Boolean(data.hasCode));
      setUpdatedAt(data.updatedAt ?? null);
      setNewCode('');
      toast({
        title: enabled ? 'Invite gate live' : 'Invite gate off',
        description: enabled
          ? 'Visitors need the access code until you disable this.'
          : 'Site is open — no code required.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-2 border-amber-500/20 shadow-2xl">
      <CardHeader className="border-b border-amber-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Lock className="h-6 w-6 text-amber-400" />
              Private Access Gate
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Temporary invite-only screen for the whole site. Toggle off when you go public. Code is stored
              hashed — not readable from Firestore.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={enabled ? 'border-amber-400 text-amber-300' : 'border-emerald-500/40 text-emerald-400'}
          >
            {enabled ? 'GATE ON' : 'OPEN'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading gate config…</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white">Enable invite gate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Blocks homepage, login, and vault until code is entered.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5" />
                  Access code {hasCode ? '(leave blank to keep current)' : '(required to enable)'}
                </Label>
                <Input
                  type="password"
                  placeholder={hasCode ? '••••••••  — enter new code to rotate' : 'Set invite password'}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="font-code tracking-widest"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Gate headline</Label>
                <Input
                  value={copy.headline}
                  onChange={(e) => setCopy({ ...copy, headline: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Gate message</Label>
                <Input
                  value={copy.subheadline}
                  onChange={(e) => setCopy({ ...copy, subheadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Button label</Label>
                <Input value={copy.ctaLabel} onChange={(e) => setCopy({ ...copy, ctaLabel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Login banner (after unlock)</Label>
                <Input
                  value={copy.loginBanner}
                  onChange={(e) => setCopy({ ...copy, loginBanner: e.target.value })}
                />
              </div>
            </div>

            {updatedAt && (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(updatedAt).toLocaleString()}
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-amber-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={handleSave}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : 'Deploy Access Gate'}
          <Sparkles className="ml-2 h-4 w-4 text-amber-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
