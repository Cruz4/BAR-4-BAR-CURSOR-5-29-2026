# Bar4Bar GitHub and Firebase commands

## Commit and push everything to GitHub

Run this one line from the Bar4Bar project folder. Change the message between the quotes if you want:

```powershell
git add -A && git commit -m "update Bar4Bar" && git push origin main
```

This includes every changed and new file currently inside the project folder.

## Deploy the complete app to Firebase

This runs the required Stripe checks and production build, then deploys the app and its Firebase rules:

```powershell
npm run deploy:live
```

## Deploy only Firebase rules, indexes, and Storage rules

```powershell
npm run firebase:deploy:rules
```
