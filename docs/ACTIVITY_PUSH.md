# Activity push (optional)

In-app Activity inbox works without this. To enable **home-screen / browser push**:

1. Firebase Console → Project settings → Cloud Messaging → **Web Push certificates**
2. Generate a key pair → copy the **Key pair** (VAPID)
3. Add to root `.env` and Firebase functions `.env`:

```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

4. Redeploy. Artists enable push under **Settings → Notifications**.
