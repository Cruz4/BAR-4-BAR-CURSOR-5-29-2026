# Bar 4 Bar — Mobile Store Deployment Guide

## Phase 1: Installable PWA (done in codebase)

1. Deploy web app: `npm run redeploy && firebase deploy`
2. Open `https://lyricai-studio-otgxn.web.app` in Chrome (Android) or Safari (iOS)
3. **Android:** Menu → Install app / Add to Home screen
4. **iOS:** Share → Add to Home Screen
5. Offline: lyric editing uses Firestore offline cache + localStorage mirror; AI requires connection

## Phase 2: Capacitor (Google Play + App Store)

### Prerequisites

- Node.js 20+
- [Apple Developer Program](https://developer.apple.com) ($99/yr)
- [Google Play Console](https://play.google.com/console) ($25 one-time)
- Android Studio + Xcode (Mac required for iOS build)

### Setup (first time)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/network @capacitor/splash-screen @capacitor/status-bar
npx cap init "Bar 4 Bar Studio" studio.bar4bar.app --web-dir out
npx cap add android
npx cap add ios
```

Set production URL in `.env` or shell:

```bash
set CAPACITOR_SERVER_URL=https://lyricai-studio-otgxn.web.app
npx cap sync
```

### Android

```bash
npx cap open android
```

In Android Studio: Build → Generate Signed Bundle/APK → upload `.aab` to Play Console.

**Store listing needs:** privacy policy URL (`/privacy`), terms URL (`/terms`), screenshots, content rating questionnaire, data safety form (Firebase auth, lyrics storage, AI).

### iOS

```bash
npx cap open ios
```

In Xcode: set Team, Bundle ID `studio.bar4bar.app`, archive, upload to App Store Connect.

**App Store needs:** privacy nutrition labels, account deletion URL (Settings in app → `/usage`), AI feature disclosure.

### Offline behavior in native shell

The Capacitor WebView loads the hosted app. Cached Firestore data and localStorage allow offline lyric viewing/editing. AI buttons show offline banner when disconnected.

### Scripts (add to package.json after Capacitor install)

```json
"cap:sync": "npx cap sync",
"cap:android": "npx cap open android",
"cap:ios": "npx cap open ios"
```

## Security reminder before store launch

- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Rotate `GEMINI_API_KEY` if `.firebase/` was ever committed
- Configure Stripe live keys and `NEXT_PUBLIC_APP_URL`
