'use client';

import { useEffect, useState } from 'react';
import { Layers, Save, ShieldAlert } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  EMERGENCY_MODES,
  PRODUCT_SURFACE_MODES,
  PRODUCT_SURFACES_CHANGED_EVENT,
  PRODUCT_SURFACES_DEFAULTS,
  RELEASE_COMPOSER_MODES,
  RELEASE_ROOM_MODES,
  SUPPORT_CIRCLE_MODES,
  type EmergencyMode,
  type ProductSurfaceMode,
  type ProductSurfacesAdminConfig,
  type ProductSurfacesConfig,
  type ReleaseComposerMode,
  type ReleaseRoomMode,
  type SupportCircleMode,
} from '@/lib/product-surface-modes';

type Draft = ProductSurfacesConfig;

function ModeSelect<T extends string>({
  id,
  label,
  hint,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-background/40 p-4">
      <Label htmlFor={id} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          id={id}
          className="h-10 border-amber-500/20 bg-[hsl(216_35%_7%)] text-sm text-white focus:ring-amber-500/30"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/15 bg-[hsl(216_35%_7%)] text-white">
          {options.map((option) => (
            <SelectItem key={option} value={option} className="uppercase tracking-wide">
              {option.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function AdminProductSurfacesCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ProductSurfacesAdminConfig | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...PRODUCT_SURFACES_DEFAULTS });

  useEffect(() => {
    adminApiFetch('/api/admin/product-surfaces')
      .then(async (response) => {
        const data = (await response.json()) as ProductSurfacesAdminConfig & { error?: string };
        if (!response.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setDraft({
          ceoDashboard: data.ceoDashboard,
          supportCircle: data.supportCircle,
          releaseComposer: data.releaseComposer,
          discoveryRails: data.discoveryRails,
          sharing: data.sharing,
          sceneWeather: data.sceneWeather,
          releaseRoom: data.releaseRoom,
          emergency: data.emergency,
        });
      })
      .catch((error) => console.warn('[admin product surfaces]', error))
      .finally(() => setLoading(false));
  }, []);

  const patchDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await adminApiFetch('/api/admin/product-surfaces', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
      const data = (await response.json().catch(() => ({}))) as ProductSurfacesAdminConfig & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Save failed');

      setConfig(data);
      setDraft({
        ceoDashboard: data.ceoDashboard,
        supportCircle: data.supportCircle,
        releaseComposer: data.releaseComposer,
        discoveryRails: data.discoveryRails,
        sharing: data.sharing,
        sceneWeather: data.sceneWeather,
        releaseRoom: data.releaseRoom,
        emergency: data.emergency,
      });
      window.dispatchEvent(
        new CustomEvent(PRODUCT_SURFACES_CHANGED_EVENT, { detail: draft })
      );
      toast({
        title: 'Product surfaces deployed',
        description:
          data.emergency === 'normal'
            ? 'Mode switches are live. Emergency stays normal.'
            : `Emergency is ${data.emergency.replace(/_/g, ' ')} — non-allowlisted writes are blocked.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save product surfaces',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  const emergencyHot = draft.emergency !== 'normal';

  return (
    <Card className="bg-card border-2 border-amber-500/25 shadow-2xl">
      <CardHeader className="border-b border-amber-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-headline text-2xl uppercase">
              <Layers className="h-6 w-6 text-amber-400" />
              Product Surfaces
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Versioned Elite Rollout switches. Safe defaults keep new surfaces on legacy/off until you
              opt in. Emergency read-only / maintenance blocks non-allowlisted mutations server-side.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              emergencyHot
                ? 'border-rose-400 text-rose-300'
                : 'border-amber-400 text-amber-300'
            }
          >
            {emergencyHot ? draft.emergency.replace(/_/g, ' ').toUpperCase() : 'NORMAL'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading product surfaces…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ModeSelect
                id="ceoDashboard"
                label="CEO dashboard"
                hint="V2 desk + full Growth Metrics below · legacy = metrics only"
                value={draft.ceoDashboard}
                options={PRODUCT_SURFACE_MODES}
                onChange={(v) => patchDraft('ceoDashboard', v as ProductSurfaceMode)}
              />
              <ModeSelect
                id="supportCircle"
                label="Support Circle"
                hint="legacy list vs Artist Intelligence CRM"
                value={draft.supportCircle}
                options={SUPPORT_CIRCLE_MODES}
                onChange={(v) => patchDraft('supportCircle', v as SupportCircleMode)}
              />
              <ModeSelect
                id="releaseComposer"
                label="Release composer"
                hint="New release lathe vs guided checklist"
                value={draft.releaseComposer}
                options={RELEASE_COMPOSER_MODES}
                onChange={(v) => patchDraft('releaseComposer', v as ReleaseComposerMode)}
              />
              <ModeSelect
                id="discoveryRails"
                label="Discovery rails"
                hint="On-sale / Scene discovery presentation"
                value={draft.discoveryRails}
                options={PRODUCT_SURFACE_MODES}
                onChange={(v) => patchDraft('discoveryRails', v as ProductSurfaceMode)}
              />
              <ModeSelect
                id="sharing"
                label="Sharing"
                hint="Native share vs Share Studio V2"
                value={draft.sharing}
                options={PRODUCT_SURFACE_MODES}
                onChange={(v) => patchDraft('sharing', v as ProductSurfaceMode)}
              />
              <ModeSelect
                id="sceneWeather"
                label="Scene weather"
                hint="legacy clouds vs Weather V2 vs off"
                value={draft.sceneWeather}
                options={PRODUCT_SURFACE_MODES}
                onChange={(v) => patchDraft('sceneWeather', v as ProductSurfaceMode)}
              />
              <ModeSelect
                id="releaseRoom"
                label="Release Room"
                hint="Off until V1 listening rooms ship"
                value={draft.releaseRoom}
                options={RELEASE_ROOM_MODES}
                onChange={(v) => patchDraft('releaseRoom', v as ReleaseRoomMode)}
              />
              <ModeSelect
                id="emergency"
                label="Emergency"
                hint="read_only / maintenance pause writes (webhooks allowlisted later)"
                value={draft.emergency}
                options={EMERGENCY_MODES}
                onChange={(v) => patchDraft('emergency', v as EmergencyMode)}
              />
            </div>

            {emergencyHot ? (
              <p className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Emergency {draft.emergency.replace(/_/g, ' ')} will block ordinary mutations until you
                return to normal. Stripe webhooks / recovery can be allowlisted later.
              </p>
            ) : null}

            {config?.updatedAt ? (
              <p className="font-code text-[10px] text-muted-foreground">
                Last updated {new Date(config.updatedAt).toLocaleString()}
                {config.updatedBy ? ` · ${config.updatedBy}` : ''}
                {config.source ? ` · source ${config.source}` : ''}
              </p>
            ) : (
              <p className="font-code text-[10px] text-muted-foreground">
                No admin save yet · using safe legacy/off defaults
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-amber-500/10 py-5">
        <Button
          className="h-12 w-full font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : 'Deploy Surface Modes'}
        </Button>
      </CardFooter>
    </Card>
  );
}
