'use client';

import React, { useState } from 'react';
import { ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import { cn } from '@/lib/utils';

type GateFinding = {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'blocked';
  detail: string;
};

type GateReport = {
  generatedAt: string;
  overall: 'pass' | 'warning' | 'blocked';
  summary: { pass: number; warning: number; blocked: number };
  findings: GateFinding[];
};

export function AdminProductionGateCard() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<GateReport | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in as admin.');
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/production-gate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gate failed');
      setReport(data as GateReport);
      toast({
        title: `Gate ${String(data.overall || '').toUpperCase()}`,
        description: `${data.summary?.pass ?? 0} pass · ${data.summary?.warning ?? 0} warning · ${data.summary?.blocked ?? 0} blocked`,
      });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Production gate',
        description: e instanceof Error ? e.message : 'Could not run gate.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-card to-card">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-xl uppercase">
          <ShieldCheck className="h-5 w-5 text-cyan-300" /> Production gate
        </CardTitle>
        <CardDescription>
          Pass / Warning / Blocked evidence for security, payments, releases, and remote controls. Run before flipping
          V2 surfaces on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          className="h-10 gap-2 font-bold uppercase tracking-widest"
          disabled={busy}
          onClick={() => void run()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Run readiness check
        </Button>
        {report ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  'uppercase tracking-widest',
                  report.overall === 'pass' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
                  report.overall === 'warning' && 'border-amber-500/40 bg-amber-500/15 text-amber-200',
                  report.overall === 'blocked' && 'border-destructive/40 bg-destructive/15 text-destructive'
                )}
              >
                {report.overall}
              </Badge>
              <span className="text-[10px] font-code text-muted-foreground">
                {report.summary.pass} pass · {report.summary.warning} warn · {report.summary.blocked} blocked ·{' '}
                {new Date(report.generatedAt).toLocaleString()}
              </span>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2">
              {report.findings.map((f) => (
                <div key={f.id} className="flex items-start justify-between gap-2 text-[11px]">
                  <span className="min-w-0 text-foreground/90">{f.label}</span>
                  <Badge variant="outline" className="shrink-0 text-[8px] uppercase">
                    {f.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
