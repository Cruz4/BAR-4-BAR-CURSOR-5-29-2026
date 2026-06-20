'use client';

import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { isProUser } from '@/lib/subscription';
import { reauthenticateCurrentUser, usesGoogleSignIn } from '@/lib/reauth-client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CONFIRM_PHRASE = 'DELETE';

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const paidPro = isProUser(user);
  const firebaseUser = auth.currentUser;
  const googleAccount = firebaseUser ? usesGoogleSignIn(firebaseUser) : false;
  const confirmMatches = confirmText.trim() === CONFIRM_PHRASE;
  const passwordReady = googleAccount || password.trim().length > 0;
  const canDelete = confirmMatches && passwordReady && Boolean(firebaseUser);

  const resetForm = () => {
    setConfirmText('');
    setPassword('');
    setIsDeleting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!firebaseUser || !canDelete) return;
    setIsDeleting(true);
    try {
      await reauthenticateCurrentUser(firebaseUser, password);
      const token = await firebaseUser.getIdToken(true);
      const res = await fetch('/api/account/eradicate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Deletion failed (${res.status})`);
      }
      handleOpenChange(false);
      await signOut(auth);
      router.push('/login');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Deletion failed';
      toast({ variant: 'destructive', title: 'Deletion failed', description: message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-card border-2 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline text-2xl text-red-500 uppercase">
            Confirm account deletion
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm font-code space-y-3 text-muted-foreground">
              <p className="normal-case tracking-normal leading-relaxed">
                This permanently deletes your Bar 4 Bar account, vault, trophies, and DNA. This cannot be undone.
              </p>
              {paidPro ? (
                <p className="text-amber-400/95 border border-amber-500/25 bg-amber-500/10 rounded-md px-3 py-2 normal-case tracking-normal leading-relaxed">
                  Active Pro subscription — billing will be cancelled in Stripe when deletion completes.
                </p>
              ) : (
                <p className="normal-case tracking-normal leading-relaxed">
                  If you have Studio Pro, your Stripe subscription is cancelled when you confirm deletion.
                </p>
              )}
              <div className="space-y-2 pt-1">
                <Label htmlFor="delete-confirm" className="text-xs font-bold uppercase text-foreground">
                  Type {CONFIRM_PHRASE} to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  className="font-mono uppercase"
                  autoComplete="off"
                  disabled={isDeleting}
                />
              </div>
              {googleAccount ? (
                <p className="text-[11px] normal-case tracking-normal leading-relaxed text-muted-foreground">
                  You&apos;ll be asked to sign in with Google again when you confirm — this proves it&apos;s really you.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="delete-password" className="text-xs font-bold uppercase text-foreground">
                    Your password
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="current-password"
                    disabled={isDeleting}
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-bold" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="font-bold"
            disabled={!canDelete || isDeleting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? 'Deleting…' : 'Delete my account'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
