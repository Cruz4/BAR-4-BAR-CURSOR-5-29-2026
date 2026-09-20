'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { playDoorKnockSound } from '@/lib/door-knock-sound';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PassBarDialog } from '@/components/folds/pass-bar-dialog';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { useFoldsFeature } from '@/hooks/use-folds-feature';
import { foldIdFor } from '@/lib/folds/types';
import { profileHref } from '@/lib/profile/profile-slug';
import {
  dismissDoorKnockLiveClient,
  type DoorKnockLiveEvent,
} from '@/lib/door-knock-client';

export function DoorKnockAnswerDialog({
  knock,
  ownerUserId,
  ownerSlug,
  onDismiss,
}: {
  knock: DoorKnockLiveEvent;
  ownerUserId: string;
  ownerSlug?: string;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const { folds } = useFoldInbox();
  const { enabled: foldsOn } = useFoldsFeature();
  const [messageOpen, setMessageOpen] = useState(false);
  const [open, setOpen] = useState(true);
  const playedSoundRef = useRef(false);

  useEffect(() => {
    if (playedSoundRef.current) return;
    playedSoundRef.current = true;
    playDoorKnockSound(0.18);
  }, []);

  const close = () => {
    setOpen(false);
    void dismissDoorKnockLiveClient(knock.knockId);
    onDismiss();
  };

  const sayHello = () => {
    if (!foldsOn) {
      close();
      return;
    }
    const foldId = foldIdFor(ownerUserId, knock.knockerId);
    const existing = folds.find((f) => f.id === foldId && f.status !== 'declined');
    if (existing) {
      close();
      router.push(`/msgs/${existing.id}`);
      return;
    }
    setMessageOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className="max-w-md border-sky-500/30 bg-[#07111f] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-xl uppercase tracking-tight text-sky-100">
              <span className="door-knock-punch text-xl leading-none" aria-hidden>✊</span> Someone&apos;s at the door
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {profileHref(knock.knockerSlug) ? (
                <Link
                  href={profileHref(knock.knockerSlug)!}
                  className="font-bold text-fuchsia-200 transition-colors hover:text-fuchsia-100 hover:underline"
                >
                  {knock.knockerName}
                </Link>
              ) : (
                <span className="font-bold text-sky-100">{knock.knockerName}</span>
              )}{' '}
              knocked on your Artist Home while you&apos;re here. Would you like to answer and say hello?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="font-bold uppercase" onClick={close}>
              Not now
            </Button>
            <Button
              type="button"
              className="gap-1.5 bg-sky-600 font-bold uppercase hover:bg-sky-500"
              onClick={sayHello}
            >
              <MessageSquare className="h-4 w-4" /> Say hello
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {messageOpen ? (
        <PassBarDialog
          open={messageOpen}
          onOpenChange={(next) => {
            setMessageOpen(next);
            if (!next) close();
          }}
          peerId={knock.knockerId}
          peerName={knock.knockerName}
          senderSlug={ownerSlug}
        />
      ) : null}
    </>
  );
}
