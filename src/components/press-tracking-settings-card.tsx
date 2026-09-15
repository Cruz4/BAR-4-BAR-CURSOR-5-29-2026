'use client';

import React, { useEffect, useState } from 'react';
import { ListMusic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { readPressTrackingPref, writePressTrackingPref } from '@/lib/press-release-tracking';

export function PressTrackingSettingsCard() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(readPressTrackingPref());
  }, []);

  return (
    <Card className="border-sky-500/20">
      <CardHeader className="pb-4">
        <CardTitle className="font-headline text-2xl flex items-center gap-2.5">
          <ListMusic className="h-6 w-6 text-sky-400" /> Press / Release tracking
        </CardTitle>
        <CardDescription className="text-sm uppercase tracking-tight">
          Optional stages on album sheets — Beat, Writing, Recorded, Mixed, Mastered, Artwork, Released.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <Label htmlFor="press-tracking-default" className="text-sm font-bold uppercase tracking-wider">
            Show tracking on albums by default
          </Label>
          <Switch
            id="press-tracking-default"
            checked={enabled}
            onCheckedChange={(next) => {
              setEnabled(next);
              writePressTrackingPref(next);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This is a personal checklist, not Press live or Lyrics DNA Drop. You can also flip it on or off on any album page.
          Public identity labels (Producer, Music Fan, and so on) do not change the stages.
        </p>
      </CardContent>
    </Card>
  );
}
