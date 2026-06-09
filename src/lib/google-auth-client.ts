import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type UserCredential,
} from 'firebase/auth';

const REDIRECT_PENDING_KEY = 'b4b_google_redirect_pending';
const REDIRECT_INTENT_KEY = 'b4b_google_auth_intent';

export type GoogleAuthIntent = 'signin' | 'signup';

/** Always show Google’s account chooser instead of silently reusing the browser session. */
export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/** In-app browsers (TikTok, IG, etc.) and mobile often block auth popups. */
export function shouldUseGoogleRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (
    /BytedanceWebview|TikTok|Instagram|FBAN|FBAV|FBIOS|Twitter|Snapchat|Line\/|MicroMessenger|LinkedInApp/i.test(
      ua
    )
  ) {
    return true;
  }
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  return false;
}

export function markGoogleRedirectPending(intent: GoogleAuthIntent): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(REDIRECT_PENDING_KEY, '1');
    sessionStorage.setItem(REDIRECT_INTENT_KEY, intent);
  } catch {
    /* ignore */
  }
}

export function consumeGoogleRedirectIntent(): GoogleAuthIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    sessionStorage.removeItem(REDIRECT_PENDING_KEY);
    const intent = sessionStorage.getItem(REDIRECT_INTENT_KEY);
    sessionStorage.removeItem(REDIRECT_INTENT_KEY);
    return intent === 'signup' || intent === 'signin' ? intent : null;
  } catch {
    return null;
  }
}

export function hasGoogleRedirectPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(REDIRECT_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

export async function completeGoogleRedirectSignIn(auth: Auth): Promise<{
  credential: UserCredential | null;
  intent: GoogleAuthIntent | null;
}> {
  const hadPending = hasGoogleRedirectPending();
  let result: UserCredential | null = null;
  try {
    result = await getRedirectResult(auth);
  } catch (error) {
    consumeGoogleRedirectIntent();
    throw error;
  }
  if (!result && !hadPending) {
    return { credential: null, intent: null };
  }
  const intent = consumeGoogleRedirectIntent();
  return { credential: result, intent };
}

export async function startGoogleSignIn(auth: Auth, intent: GoogleAuthIntent): Promise<UserCredential | null> {
  const provider = createGoogleAuthProvider();
  if (shouldUseGoogleRedirect()) {
    markGoogleRedirectPending(intent);
    await signInWithRedirect(auth, provider);
    return null;
  }
  return signInWithPopup(auth, provider);
}
