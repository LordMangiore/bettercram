# BetterCram - AI-Powered Study Platform

## Quick Start

```bash
# Install dependencies
npm install

# Run with Netlify dev (frontend + serverless functions)
npx netlify dev
# Frontend: http://localhost:8888 (proxies to Vite on 5173)

# Or run frontend only (no backend)
npm run dev
# Frontend: http://localhost:5173 (API calls will fail without netlify dev)
```

## Architecture Overview

**Frontend:** React 19 + Vite 8 + Tailwind CSS 4
**Backend:** Netlify Functions (serverless, in `netlify/functions/`)
**Database:** Firebase Firestore (real-time, offline-first) + Netlify Blobs (large card storage)
**Auth:** Email OTP flow (Resend for delivery, Firebase custom tokens)
**AI:** Claude (card generation, tutoring, quizzes), ElevenLabs (voice tutor, TTS), Firecrawl (web scraping)
**Payments:** Stripe ($9-19/mo subscriptions)
**Mobile:** Capacitor (iOS/Android wrappers) + PWA (service worker)

## Project Structure

```
flashcard-app/
  src/
    App.jsx              # Main component — all global state, routing, deck management (~1,700 lines)
    api.js               # API client for all Netlify Functions (~650 lines)
    main.jsx             # React entry point
    index.css            # Tailwind + global styles + animations
    components/          # 29 React components
      StudyMode.jsx      # FSRS spaced repetition review
      FlipMode.jsx       # Simple card browsing
      QuizMode.jsx       # AI-generated multiple choice
      TutorMode.jsx      # Claude chat tutor (Pro)
      DeepDiveMode.jsx   # Web research mode (Pro)
      AudioMode.jsx      # Podcast narration (Pro)
      VoiceTutorMode.jsx # ElevenLabs voice tutor (Pro)
      DeckLibrary.jsx    # Deck management, import, publish
      CardManager.jsx    # Add/edit/delete cards
      FlashCard.jsx      # Single card renderer (LaTeX, images, audio)
      ActivityCalendar.jsx # Study streak heat map
      PlannerMode.jsx    # Multi-test study scheduling
      Settings.jsx       # User settings, FSRS tuning
      Onboarding.jsx     # First-run flow
      LandingPageV2.jsx  # Marketing landing page (current)
      LandingPage.jsx    # Old landing page (accessible via ?v1)
      PricingPage.jsx    # Subscription tiers
      SubNav.jsx         # Tab sub-navigation
      NotificationCenter.jsx
      NotificationSettings.jsx
      SuggestEditModal.jsx
      SuggestionPanel.jsx
      InstallPrompt.jsx  # PWA install prompt
      AboutPage.jsx, ContactPage.jsx, PrivacyPolicy.jsx, TermsOfService.jsx
    hooks/
      useAuth.js         # OTP authentication flow
      useDarkMode.js     # Dark mode with system preference detection
      useLocalStorage.js # Generic localStorage-synced state
    lib/
      firebase.js        # Firebase init with offline Firestore persistence
      firestoreClient.js # Direct Firestore reads + real-time listeners
      empathyEngine.js   # Adaptive tutoring personality (nurture/challenge/balanced)
      ankiParser.js      # Client-side .apkg import (JSZip + sql.js)
      pushNotifications.js # Capacitor native push
  netlify/
    functions/           # ~50 serverless API endpoints
      lib/firebase-admin.mjs  # Shared Firebase Admin SDK init
      generate-cards.mjs      # Claude card generation
      tutor-chat.mjs          # Claude tutor conversations
      deep-dive.mjs           # Firecrawl search + Claude synthesis
      audio-session.mjs       # Claude script + ElevenLabs TTS
      create-checkout.mjs     # Stripe checkout
      otp-send.mjs / otp-verify.mjs  # Auth flow
      ...
  public/
    sw.js                # Service worker (offline caching)
    manifest.json        # PWA manifest
```

## Key Patterns

### State Management
- All global state lives in `App.jsx` via `useState`/`useRef` hooks (~30 state variables)
- No Redux/Zustand — state is passed as props to child components
- `useLocalStorage` hook syncs UI preferences (dark mode, active deck, subscription)
- Firestore real-time listeners for decks, groups, notifications
- In-memory deck cache (`deckCacheRef`) avoids re-downloading large decks

### Routing
- No react-router — state-machine approach via `mode` and `page` variables
- 4 main tabs: Study, Test, Sage, Nova (each with sub-modes)
- Menu-only modes: library, flip, manage, planner
- Page overrides: pricing, settings, onboarding, static pages (privacy, terms, etc.)

### Data Flow
- **Read path:** Firestore direct reads (instant, cached offline) with API fallback
- **Write path:** API calls to Netlify Functions which write to Firestore + Blobs
- **Progress:** Auto-saved via debounced `saveDeckProgress()` every ~3 seconds
- **Cards:** Auto-saved on card count change with 5-second debounce

### Styling
- Tailwind CSS 4 utility classes throughout
- Dark mode: `.dark` class on `<html>`, toggled via `useDarkMode` hook
- Color palette: Indigo primary, with Emerald/Orange/Pink/Cyan accents for deck colors
- Custom CSS in `index.css` for scrollbars, KaTeX math, card animations, streak heat effects

### API Pattern
All API calls go through `src/api.js`:
```javascript
// Auth headers automatically attached
const res = await fetch(`/.netlify/functions/${endpoint}`, {
  method: "POST",
  headers: authHeaders(),  // Bearer token + X-User-Id
  body: JSON.stringify(data),
});
```

### Card Generation Pipeline
1. Content ingestion (URL scrape, PDF upload, topic search, site crawl, Anki import)
2. Chunk content into batches (4-8KB chunks, 5 parallel)
3. Claude generates Q&A cards per chunk
4. Quality scoring pass (dedup, improve, remove low-quality)
5. Save to deck with IDs assigned

## Environment Variables

See `.env.example`. Key vars needed for local dev:
- `CLAUDE_API_KEY` — Anthropic API key (used by netlify functions)
- `FIRECRAWL_API_KEY` — Firecrawl API key
- Firebase config is hardcoded in `src/lib/firebase.js`

## Important Notes

- **Everything works in production at bettercram.com** — be very careful with changes
- Server-side deps (`firebase-admin`, `stripe`, `@anthropic-ai/sdk`, etc.) are in package.json because Netlify Functions are in the same repo
- The `@react-oauth/google` dependency is unused (auth switched to OTP) — safe to remove
- `src/assets/react.svg` and `src/assets/vite.svg` are unused Vite scaffold files — safe to remove
- Large deck saves are chunked (2000 cards per batch) to avoid payload limits
- FSRS algorithm via `ts-fsrs` handles spaced repetition scheduling
- Pro features gated by `isPro` check (subscription.active && plan === "pro")

## Deployment

- **Hosting:** Netlify (auto-deploys from git push)
- **Build:** `npm run build` (stamps SW version, then `vite build`)
- **Functions:** Bundled by esbuild, `@anthropic-ai/sdk` and `firebase-admin` are external
- **Timeouts:** AI-heavy functions have 26s timeout (Netlify default is 10s)
