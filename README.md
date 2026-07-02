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
- TCX Security redirect gate, matching the other Trading Candle apps.
- Google-first verification is handled inside TCX Security before the current access login.

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

## TCX Security gate

TCX Journal does not render any login form. If a shared TCX Security session is missing, it redirects to TCX Security with `app=journal&returnTo=...`. TCX Security performs Google sign-in first, then the current TCX verification form, then redirects back to the journal.

Set these in the journal deployment:
```bash
VITE_TCX_SECURITY_ORIGIN=https://auth.tradingcandle.co
AUTH_CENTER_URL=https://auth.tradingcandle.co
JWT_SECRET=the-same-secret-as-tcxsecurity
SESSION_COOKIE_DOMAIN=.tradingcandle.co
```

Set these in the TCX Security deployment:
```bash
ALLOWED_ORIGIN=https://your-tcxjournal-domain
JOURNAL_APP_URL=https://your-tcxjournal-domain
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_APP_ID=your-firebase-web-app-id
```

Use custom subdomains under the same parent domain for shared-cookie auth, such as `auth.tradingcandle.co` and `journal.tradingcandle.co`, with `SESSION_COOKIE_DOMAIN=.tradingcandle.co`. A cookie set by a `workers.dev` or `netlify.app` domain cannot be shared with an unrelated domain.

## OCR

Gemini OCR runs through the Netlify function when `GEMINI_API_KEY` is set. Browser Tesseract remains the free offline fallback.
