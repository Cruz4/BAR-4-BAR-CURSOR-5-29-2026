'use client';

import { sendEmailVerification, type User } from 'firebase/auth';
import { getPublicAppUrl } from '@/lib/app-url';

/** Firebase action link returns users to the vault after they verify.
 *  In Firebase Console → Authentication → Templates → Email address verification,
 *  customize copy and ensure bar4bar.ink is an authorized domain. */
export function emailVerificationActionSettings() {
  return {
    url: `${getPublicAppUrl()}/`,
    handleCodeInApp: false,
  };
}

/** Send (or resend) the Firebase verification link email. */
export async function sendSignupVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user, emailVerificationActionSettings());
}
