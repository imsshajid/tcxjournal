# TradingCandle Journal Premium v2

Responsive dark trading journal for `journal.tradingcandle.co`.

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

## Production OCR recommendation
Browser OCR works, but for paid users connect a Netlify Function to Google Vision, OpenAI Vision, AWS Textract, or another OCR/Vision API, then return extracted trades into the same review screen.
