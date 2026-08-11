# Activity push (optional)

In-app Activity inbox works without this. To enable **home-screen / browser push**:

1. Firebase Console → Project settings → Cloud Messaging → **Web Push certificates**
2. Generate a key pair → copy the **Key pair** (public VAPID — usually starts with `B`)
3. Add to root `.env` (must be present at **build** time for Next.js):

```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

4. Redeploy. Artists enable push under **Settings → Notifications** and click **Allow** in the browser.

## Troubleshooting

### “Permission needed”
- Address bar → site settings → **Notifications → Allow**
- Chrome blocks the prompt after several dismissals until you reset it there

### `AbortError: Registration failed - push service error`
Permission was granted, but Chrome’s push service refused the subscription. Common causes:

1. **Too many on/off toggles** on the same Chrome profile (known Chrome/FCM issue)
2. Corrupted site push state

**Fix:**

1. `chrome://settings/content/notifications` → remove bar4bar.ink if listed as blocked
2. Site settings for bar4bar.ink → **Clear data**
3. Hard reload, open Settings → turn Push **on once** and leave it
4. If it still fails: try **Edge**, **Firefox**, or a **fresh Chrome profile**

Also verify the VAPID key is the **Web Push certificates → Key pair** from the same Firebase project (`lyricai-studio-otgxn`), not an unrelated key.

### Localhost: `firebase-messaging-sw.js` 404
Dev does not auto-register the PWA worker. Push registration now registers `/sw.js` itself before `getToken`, so you should not need a separate `firebase-messaging-sw.js`. Soft-refresh after pulling that change, then toggle Push once.

### Phone home-screen icon
Enable push **on the phone** (open the installed PWA → Settings → Push → Allow). Turning it on on desktop does not register the phone.
