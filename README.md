# TCX Journal

Trading Candle X Journal is a local-first FTT and CFD journal deployed at `tcxjournal.netlify.app`.

## Improvements
- Premium muted dark palette, less random color noise.
- Mobile-first layout for iPhone SE / older small phones.
- iPad/tablet collapsed rail layout.
- 32-inch and 49-inch ultrawide layout support.
- Screenshot upload fixed for Netlify using a real file input + label picker.
- OCR worker/core paths use CDN URLs so Vite/Netlify worker loading is less likely to fail.
- Manual OCR text fallback if browser OCR fails.
- Delete trades from Trade History.
- Separate FTT and CFD journal filtering and analytics.
- Searchable single-asset trade entry.
- Required Google sign-in with private per-user Firestore sync.
- Google-first access gate followed by TCX Security login verification.

## Netlify settings
Build command:
```bash
npm run build
```
Publish directory:
```bash
dist
```

## Local run
```bash
npm install
npm run dev
```

## Free cloud accounts

1. Create a Firebase project and Web app.
2. Enable Google in Authentication > Sign-in method.
3. Add `tcxjournal.netlify.app` to Authentication > Authorized domains.
4. Create a Firestore database, then publish `firestore.rules` with `firebase deploy --only firestore:rules`.
5. Add every variable from `.env.example` to Netlify. `FIREBASE_WEB_API_KEY` is the same value as `VITE_FIREBASE_API_KEY`.
6. Trigger a new Netlify deploy so Vite receives the build-time variables.

Trades are stored at `users/{uid}/trades/{tradeId}` and settings at `users/{uid}/journal/settings`. The rules restrict both paths to the matching authenticated user. Existing browser data is migrated on the first successful sign-in and remains cached per user for fast local access.

## TCX Security gate

TCX Journal now requires Google first, then TCX Security credentials before the journal renders.

Set these in the journal deployment:
```bash
VITE_TCX_SECURITY_ORIGIN=https://your-tcxsecurity-domain
TCX_SECURITY_ORIGIN=https://your-tcxsecurity-domain
```

Set these in the TCX Security deployment:
```bash
ALLOWED_ORIGIN=https://your-tcxjournal-domain
JOURNAL_APP_URL=https://your-tcxjournal-domain
```

For custom subdomains under the same parent domain, use a shared cookie domain such as `SESSION_COOKIE_DOMAIN=.tradingcandle.co`. For separate domains, set `SESSION_COOKIE_SAMESITE=None` and keep secure cookies enabled so the embedded verification requests can include the TCX Security session.

## OCR

Gemini OCR runs through the Netlify function when `GEMINI_API_KEY` is set. Browser Tesseract remains the free offline fallback.
