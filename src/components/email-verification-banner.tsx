'use client';

import { useCallback, useState } from 'react';
import { Mail, Loader } from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';
import { sendSignupVerificationEmail } from '@/lib/email-verification-client';
import { syncUserUsageBootstrap } from '@/lib/init-user-usage-client';
import { useAuth } from '@/hooks/use-auth';
import { useUsage } from '@/context/usage-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PRO_FEATURE_PREVIEW_DAYS, SIGNUP_INK } from '@/lib/subscription';
import { cn } from '@/lib/utils';

export function EmailVerificationBanner({ className }: { className?: string }) {
  const { user } = useAuth();
  const { inkBalance, loading } = useUsage();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const firebaseUser = auth.currentUser;
  const needsVerify =
    user &&
    !loading &&
    inkBalance === 0 &&
    firebaseUser &&
    !firebaseUser.emailVerified &&
    Boolean(firebaseUser.email);

  const handleResend = useCallback(async () => {
    if (!firebaseUser || firebaseUser.emailVerified) return;
    setSending(true);
    try {
      await sendSignupVerificationEmail(firebaseUser);
      toast({
        title: 'Verification email sent',
        description: 'From noreply@akasheet.com — check inbox and junk/spam, then Refresh after you verify.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not send email',
        description: e instanceof Error ? e.message : 'Try again in a few minutes.',
      });
    } finally {
      setSending(false);
    }
  }, [firebaseUser, toast]);

  const handleRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    await firebaseUser.reload();
    if (firebaseUser.emailVerified) {
      await syncUserUsageBootstrap(true);
      toast({
        title: 'Email verified',
        description: `Welcome Ink (${SIGNUP_INK}) and your ${PRO_FEATURE_PREVIEW_DAYS * 24}-hour Pro preview are syncing.`,
      });
      window.location.reload();
    } else {
      toast({
        variant: 'destructive',
        title: 'Not verified yet',
        description: 'Click the link in your email, then try Refresh again.',
      });
    }
  }, [firebaseUser, toast]);

  if (!needsVerify) return null;

  return (
    <div
      data-app-chrome
      className={cn(
        'shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 flex flex-wrap items-center gap-3 z-40',
        className
      )}
    >
      <Mail className="h-4 w-4 text-amber-400 shrink-0" aria-hidden />
      <p className="text-[10px] sm:text-[11px] font-code text-amber-100/90 flex-grow min-w-0">
        <span className="font-bold uppercase tracking-widest text-amber-300">Verify your email</span>
        {' — '}
        Check your inbox for the link from noreply@akasheet.com (and your junk / spam folder — it often lands there). Your{' '}
        {SIGNUP_INK} welcome Ink and {PRO_FEATURE_PREVIEW_DAYS * 24}-hour Pro preview unlock after you verify.
      </p>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[9px] font-bold uppercase"
          disabled={sending}
          onClick={handleResend}
        >
          {sending ? <Loader className="h-3 w-3 animate-spin" /> : 'Resend'}
        </Button>
        <Button size="sm" className="h-8 text-[9px] font-bold uppercase" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
