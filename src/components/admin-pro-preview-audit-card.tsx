'use client';

import { useState } from 'react';
import { Hourglass, Play, Search } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import type {
  ProPreviewAuditApplyResult,
  ProPreviewAuditDryRunResult,
} from '@/lib/pro-preview-audit';

type DryRunResult = ProPreviewAuditDryRunResult;
type ApplyResult = ProPreviewAuditApplyResult;

export function AdminProPreviewAuditCard() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [lastApply, setLastApply] = useState<ApplyResult | null>(null);

  const runDryRun = async () => {
    setRunning(true);
    try {
      const response = await adminApiFetch('/api/admin/pro-preview-audit', {
        method: 'POST',
        body: JSON.stringify({ mode: 'dry_run' }),
      });
      const data = (await response.json().catch(() => ({}))) as DryRunResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Dry-run failed');
      setDryRun(data);
      setLastApply(null);
      toast({
        title: 'Pro preview dry-run complete',
        description:
          data.mismatches.length === 0
            ? `Scanned ${data.scannedRegistryDocs} registry docs — no mismatches.`
            : `Found ${data.mismatches.length} user(s) missing expiresAt.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Dry-run failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRunning(false);
    }
  };

  const runApply = async () => {
    if (!dryRun || dryRun.mismatches.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Run a dry-run first',
        description: 'Apply only after you review the mismatch list.',
      });
      return;
    }

    const confirmed = window.confirm(
      `Grant a fresh ${dryRun.hours}h Pro preview to ${dryRun.mismatches.length} artist(s)?\n\nThis writes user docs and an admin audit log. Only continue with production approval.`
    );
    if (!confirmed) return;

    setRunning(true);
    try {
      const response = await adminApiFetch('/api/admin/pro-preview-audit', {
        method: 'POST',
        body: JSON.stringify({ mode: 'apply', confirm: true }),
      });
      const data = (await response.json().catch(() => ({}))) as ApplyResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Apply failed');
      setLastApply(data);
      setDryRun({
        mode: 'dry_run',
        scannedRegistryDocs: data.scannedRegistryDocs,
        mismatches: data.mismatches,
        hours: data.hours,
      });
      toast({
        title: 'Pro preview apply complete',
        description: `Granted ${data.granted.length} · skipped ${data.skipped.length} · audit ${data.auditId}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Apply failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="bg-card border-2 border-violet-500/25 shadow-2xl">
      <CardHeader className="border-b border-violet-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-headline text-2xl uppercase">
              <Hourglass className="h-6 w-6 text-violet-400" />
              Pro Preview Audit
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Find identity-registry grants where the user doc is missing{' '}
              <code className="text-foreground/80">proFeaturePreviewExpiresAt</code>, then optionally
              grant a fresh 48h window. Always dry-run first; apply needs explicit confirm.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              dryRun && dryRun.mismatches.length > 0
                ? 'border-amber-400 text-amber-300'
                : 'border-violet-400 text-violet-300'
            }
          >
            {dryRun ? `${dryRun.mismatches.length} MISMATCH` : 'IDLE'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {dryRun ? (
          <div className="space-y-2 rounded-xl border border-white/10 bg-background/40 p-4">
            <p className="text-xs text-muted-foreground">
              Scanned {dryRun.scannedRegistryDocs} registry docs · {dryRun.mismatches.length}{' '}
              mismatch(es) · {dryRun.hours}h grant window
            </p>
            {dryRun.mismatches.length > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto font-code text-[10px] text-muted-foreground">
                {dryRun.mismatches.slice(0, 40).map((row) => (
                  <li key={`${row.emailHash}-${row.userId}`}>
                    {row.userId} · registry {new Date(row.registryGrantedAt).toLocaleString()}
                  </li>
                ))}
                {dryRun.mismatches.length > 40 ? (
                  <li>…and {dryRun.mismatches.length - 40} more</li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-emerald-300/90">No missing expiresAt fields.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run dry-run to scan the identity registry against user docs.
          </p>
        )}

        {lastApply ? (
          <p className="font-code text-[10px] text-muted-foreground">
            Last apply · audit {lastApply.auditId} · granted {lastApply.granted.length} · skipped{' '}
            {lastApply.skipped.length}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-violet-500/10 py-5 sm:flex-row">
        <Button
          className="h-12 flex-1 font-bold uppercase tracking-[0.15em]"
          variant="outline"
          onClick={() => void runDryRun()}
          disabled={running}
        >
          <Search className="mr-2 h-4 w-4" />
          {running ? 'Working…' : 'Dry-run scan'}
        </Button>
        <Button
          className="h-12 flex-1 font-bold uppercase tracking-[0.15em]"
          onClick={() => void runApply()}
          disabled={running || !dryRun || dryRun.mismatches.length === 0}
        >
          <Play className="mr-2 h-4 w-4" />
          Apply 48h grants
        </Button>
      </CardFooter>
    </Card>
  );
}
