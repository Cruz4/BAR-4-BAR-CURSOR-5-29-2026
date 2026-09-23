'use client';

import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataContext } from '@/context/data-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GenerateInstrumentalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { addTrack, albums } = useContext(DataContext);
  const [title, setTitle] = useState('Instrumental');
  const [albumId, setAlbumId] = useState('unassigned');
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    try {
      const created = addTrack(albumId, {
        title: title.trim() || 'Instrumental',
        workKind: 'instrumental',
        albumId,
        ownerId: '',
        vibe: {
          enabled: true,
          genre: 'Instrumental',
          tempoBPM: 92,
          feeling: ['focused'],
          productionNotes: 'No vocals — instrumental only',
        },
        sections: [],
        intentRefs: [],
        status: 'in_progress',
        createdAt: new Date().toISOString(),
      });
      onOpenChange(false);
      router.push(`/albums/${albumId}/tracks/${created.id}/render`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Instrumental</DialogTitle>
          <DialogDescription>
            Creates a lightweight instrumental track shell — no lyrics. Opens Render Studio in
            instrumental mode.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="inst-title">Title</Label>
            <Input id="inst-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="inst-album">Album</Label>
            <select
              id="inst-album"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
            >
              <option value="unassigned">Loose / Unassigned</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={confirm} disabled={saving}>{saving ? 'Creating…' : 'Continue'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
