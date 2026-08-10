# Feelings — Build Progress

Source spec: `~/Downloads/journal-app-build-guide.md`. Design source of truth: `../Journal App - Standalone.html` (a self-executing "bundler" HTML export — the real markup/CSS/JS logic is JSON-encoded inside a `<script type="__bundler/template">` tag; unpack it with a small Node script before reading it directly).

## Decisions locked in during the build (beyond the original guide)

- **Intro preview buttons** (Morning/Noon/Evening quick-switch in the prototype's top-left corner): **stripped** from the real build — confirmed as a design-time aid only.
- **Hosting**: **Vercel** (static site + a small Vercel Function for the transcribe proxy). Originally planned as Render during Phase 6 (since `api/server.js` was a persistent Express app, not a serverless function, and that's what ran without a rewrite) — switched to Vercel during Phase 10 once it became clear Render's free-tier Web Services cold-start on every period of inactivity (~30s, observed firsthand on another project on the same account), which Vercel's static hosting + serverless functions largely avoid. See Phase 10 notes for the resulting `api/transcribe.js` rewrite.
- **Connect Google Drive flow**: gates the whole app *before* the intro screen. No persisted token (in-memory only, per the security design) means every page reload shows this gate again — that's intentional.
- **Google OAuth Client ID**: reused the same Web-application-type Client ID originally created for an OAuth Playground test (`...ln784cnurqbjjh8ne18u4glceoertffb.apps.googleusercontent.com`). Playground used Authorization Code + secret; our app uses the same Client ID with the Identity Services **token client** flow instead (no secret, browser-only).
- **Speaking-mode save flow**: transcript arrives → **auto-saves immediately** (matches the prototype's actual working behavior) → toast → back to Home. No "review before saving" intermediate step.
- **Quotes**: 40 curated original quotes (not from the prototype, which only had 3 hardcoded ones), bucketed by morning/noon/evening, one picked at random per intro-screen mount. Lives in `src/lib/quotes.js`.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 — Project setup | ✅ Done | Vite+React scaffold, folder structure, core deps |
| 1 — Google OAuth | ✅ Done | GIS token client, verified live connect/disconnect |
| 2 — Drive read/write | ✅ Done | `/journal/` folder auto-created, write/list verified against real Drive |
| 3 — Local data layer | ✅ Done | IndexedDB + local-first writes + background sync, verified across reload |
| 4 — Port designed UI | ✅ Done | Full screen flow (intro→home→checkin→entry→save→toast→calendar dot→search) verified end-to-end |
| 5 — Writing mode | ✅ Done | Tiptap integrated; two real bugs found & fixed (see below) |
| 6 — Speaking mode | ✅ Done | Real `MediaRecorder` + `AnalyserNode`-driven orb + `/api/transcribe` + auto-save-on-transcript, verified end-to-end (see below) |
| 7 — Calendar logic | ✅ Done | Was already fully built during Phase 4 (`src/lib/calendar.js` + `Home.jsx`); verified end-to-end, no code changes needed (see below) |
| 8 — Offline PWA | ✅ Done | `vite-plugin-pwa` manifest + service worker wired, app-shell offline load verified (see below) |
| 9 — Polish | 🟡 Mostly done | Empty states + Drive-sync loading indicator added and verified live against a real Drive account, including a real airplane-mode test; also caught and fixed a real full-app layout bug (see below); mobile Chrome/Safari device pass still open |
| 10 — Deploy | 🟡 In progress | Switched to Vercel mid-phase (see notes below); code pushed to GitHub, `api/transcribe.js` rewritten as a Vercel Function; dashboard setup in progress |

## Two real bugs found and fixed during Phase 5

1. **Tiptap StarterKit v3 already bundles the Underline extension.** We'd also installed `@tiptap/extension-underline` separately and passed both to `useEditor`, causing a duplicate mark registration (`[tiptap warn]: Duplicate extension names found: ['underline']`). This corrupted mark toggling — applying Bold then Italic would silently drop the earlier mark. Fix: removed the separate package/import; StarterKit's built-in Underline is used instead.
2. **Missing bold-italic font face.** The Google Fonts `<link>` in `index.html` only requested Courier Prime in normal-400, normal-700, and italic-400 — never italic-700 (bold+italic combined). So even after fixing bug #1, text with both Bold and Italic marks applied would only render one style visually (no matching font file for the browser to use). Fixed by adding `1,700` to the Courier Prime font spec in `index.html`.

Root-caused both via a temporary Playwright-driven diagnostic harness (`#test-editor` hash route in `App.jsx`, since removed) rather than guessing — worth repeating that approach for any future "looks wrong in the browser but code looks right" reports.

## Phase 6 build notes (Speaking mode)

- `src/components/Entry.jsx` speaking mode now does the real thing: `getUserMedia` → `MediaRecorder` (prefers `audio/webm;codecs=opus`) records while a Web Audio `AnalyserNode` reads live time-domain amplitude (RMS, exponentially smoothed) each `requestAnimationFrame` tick to scale the orb directly via a ref (CSS `orbIdle` keyframe still plays when not recording; disabled to `none` while recording since JS owns the transform then).
- On stop, the recorded `Blob` posts to `/api/transcribe` (Vite-proxied to the Express server on :8787); on success the transcript is wrapped into a minimal Tiptap doc (`textToDoc` in `src/lib/tiptapText.js`, one paragraph per newline) and passed straight to `onSave` — no review step, matching the decision above. Title is always `''` for voice entries (`Home.jsx` already falls back to "Untitled entry").
- Edge cases handled: mic-permission denial shows an inline error (reusing the `#C77B6E` error-text style from `ConnectGate`); tapping stop before ~1s of audio discards instead of transcribing a near-empty clip; navigating away (back button) while recording stops the recorder/mic without transcribing (`stopRecording(true)` discard path) so the mic never keeps running after the user leaves the screen; component unmount cleans up the timer, rAF loop, MediaStream tracks, and AudioContext.
- Verified for real, not just by reading the code: added a temporary `#test-entry` hash harness in `App.jsx` (same pattern as the Phase 5 `#test-editor` one — since removed) that renders `Entry` standalone outside the Google OAuth gate, then drove it with Playwright/Chromium using `--use-file-for-fake-audio-capture=<a real wav of spoken text>` so the whole pipeline — real `MediaRecorder`, real network hop to the Express proxy, real Groq Whisper call, real transcript — ran end-to-end. Confirmed the `onSave` payload came back correctly shaped (`input_method: 'voice'`, transcript text inside proper Tiptap paragraph nodes) and the orb rendered/animated without console errors.
- `GROQ_API_KEY` is filled into `feelings/.env.server` (gitignored via the blanket `.env.*` rule).

## Phase 8 build notes (Offline PWA)

- **Manifest & icons**: `vite.config.js` now runs `VitePWA({ registerType: 'autoUpdate', ... })` with `manifest.name`/`short_name` "Feelings", `theme_color`/`background_color` set to `#F3E8D6` (the `ConnectGate` outer background — the very first color a user sees, used as the closest thing this app has to a single "brand" color since there's no dedicated style guide). Icons (`pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`) were generated by rasterizing the existing `public/favicon.svg` mark (the purple bolt logo, previously only used as the browser-tab favicon) onto that same background color at a temporary Node script (`sharp`, installed with `--no-save` then `npm prune`d back out — not a project dependency). The maskable variant uses a smaller `markFraction` (0.45 vs 0.62) so the mark stays inside the ~80% safe zone OS launchers crop to.
- `index.html` gained `<link rel="apple-touch-icon">`, `<meta name="theme-color">`, and the two `apple-mobile-web-app-*` tags iOS needs for a standalone-feeling install (manifest.json alone isn't read by iOS for these).
- **Service worker**: default `generateSW` strategy — precaches the built JS/CSS/HTML/icons as the "app shell" (10 entries, ~638 KiB after build). Added `runtimeCaching` (`CacheFirst`) for `fonts.googleapis.com`/`fonts.gstatic.com` so the custom typefaces (Bodoni Moda, Courier Prime, Lora, etc.) survive offline too, not just the layout. Deliberately did **not** cache Google Drive API or `/api/transcribe` responses — those must always hit the network live; caching them would risk serving stale/wrong data.
- **Offline entry queueing**: turned out to need no new code — `entriesStore.js`'s existing local-first design (write to IndexedDB immediately on `addEntry`/`updateEntry`, `syncStatus: 'pending'`, background `maybeSync()` re-triggered on the browser's `online` event and on Drive reconnect) already satisfies this. One real constraint worth remembering: the "no persisted OAuth token, `ConnectGate` shows on every reload" decision from earlier in the build means a *fresh page load* while offline can't skip past the connect gate — the offline-write flow only works within a single already-connected session that then loses connectivity without a reload (which matches the real "wrote an entry in airplane mode, reconnected later" scenario, just not "opened the app from cold while offline and expected to already be signed in").
- **Verified for real**: built (`npm run build`) and served via `npm run preview`, confirmed in actual Chrome (not just reading code) that the service worker registered/activated, `caches.keys()` showed all 10 precached app-shell entries, then **killed the preview server process** (a truer test than devtools' offline toggle, since it makes every network request actually fail to connect rather than just flagging `navigator.onLine`) and reloaded — the full styled `ConnectGate` screen rendered from cache with no console errors, confirming an installed/offline load shows the real app shell instead of a browser connection-error page.

## Phase 9 build notes (Polish)

- **Screen transitions**: audited against the unpacked HTML export (see the unbundling note at the top of this file) — every screen-level container in the prototype carries `animation:fadeUp <duration> ease` (intro 0.6s, home 0.5s, day-detail card / toast 0.3s, checkin modal 0.25s, entry screen 0.4s), where `fadeUp` is a 14px→0 `translateY` settle, not an opacity fade despite the guide calling it "intro fade." All of this was already ported 1:1 during Phase 4 (`src/styles/animations.css` + inline `animation` styles in `Intro.jsx`/`Home.jsx`/`CheckinModal.jsx`/`Entry.jsx`) — confirmed by diffing durations against the unpacked template rather than assuming; no code changes needed here.
- **Empty states**: the prototype never designed one — it only ever ran against fixed sample data, so this was genuinely new work (the guide flags it the same way it flagged Phase 7's mood-per-day logic as "new... beyond the prototype"). Added a centered "Nothing here yet" card to `Home.jsx`, shown in place of the calendar grid only when `entries.length === 0`, styled to match the existing day-detail/calendar card language (`#FBF5EA` background, `Bodoni Moda` heading, `Inter` body, small mood-dot row echoing the legend above it). The search dropdown's "No entries found" state already existed from Phase 7 — untouched.
- **Loading state while Drive syncs**: `entriesStore.js` already tracked `syncStatus: 'pending' | 'synced'` per entry (Phase 3) but nothing in the UI surfaced it. Added a small pill to `Home.jsx`, bottom-left (mirroring the "+" button's bottom-right placement), reading "Syncing to Drive…" with a spinner (reusing the existing `spin` keyframe and `#B46A4F` accent color from `Entry.jsx`'s transcribing state), shown whenever any entry has `syncStatus === 'pending'` and hidden once everything syncs. The initial "Connecting…" state on the connect button already existed (Phase 1) — untouched.
- **Verified for real**: same `#test-home` hash-harness pattern as Phases 6/7 (added temporarily to `App.jsx`, removed after) — rendered `Home` standalone with `entries: []` (empty state) and with a mix of `pending`/`synced` synthetic entries (syncing pill + populated calendar), screenshotted both in real Chrome, confirmed the ConnectGate entry point still renders correctly afterward, then reverted `App.jsx`.
- **Not done here — needs the account holder**: the guide's Phase 9 checklist item "test full flow end-to-end on both desktop Chrome and mobile Chrome/Safari" wasn't run as a live OAuth-connected walkthrough, since actually clicking "Connect Google Drive" grants real access to the account's Drive and isn't something to click through unsupervised. Mobile Chrome/Safari also needs a physical device. Both are worth doing as a manual pass — possibly folded into the Phase 10 "install on your phone" step, since that already requires a real device and a real connect.

## Real bug found during the live manual pass (2026-08-10)

Once actually connected to a real Drive account and viewed at typical desktop viewport widths, the app rendered squeezed into a ~1126px-wide column with a blank white margin on the left and content clipped on the right — never caught earlier because prior phase verifications mostly used the `#test-*` hash harnesses (which happened not to expose it as clearly) rather than the full connected app at arbitrary window widths.

**Root cause**: leftover Vite starter-template CSS. `src/index.css` still had the scaffolded `#root { width: 1126px; max-width: 100%; margin: 0 auto; text-align: center; border-inline: 1px solid var(--border); display: flex; flex-direction: column; ... }` rule from whatever richer starter template this project was created from (never the plain `create vite` default — this one also had unused `h1`/`h2`/`.counter`/`#social` styling and an unrelated purple `--accent` design-token set). `JournalApp.jsx`'s own root div sets `width: 100vw` on itself expecting to fill the real viewport, but as a child of a `margin: 0 auto`-centered, narrower `#root`, it started flush at `#root`'s left edge and overflowed off the right side by the same amount `#root` was inset on the left — producing the blank-left/clipped-right look.

**Fix**: collapsed the rule to just `#root { min-height: 100svh; }` — the only part of it this app actually needed, since every screen already manages its own full-viewport sizing via inline styles. Verified live via Vite HMR hot-swapping the CSS in the already-connected tab (no reload needed, so the Drive session stayed intact) — confirmed clean full-width rendering at multiple window sizes afterward, including with Chrome DevTools open (viewport further reduced).

## Live manual pass results (2026-08-10)

Done together with the account holder driving the actual Google OAuth consent screen (the assistant does not click through OAuth grants) — real Google Drive, not synthetic data:

- **Connect flow**: real `Connect Google Drive` → Google consent → landed on Home with the account's actual existing entries. Confirmed the "no persisted token, reload shows the gate again" decision is real and reproducible (a mid-session reload — done here by mistake to test a CSS fix — dropped straight back to `ConnectGate`).
- **Full save flow**: checkin → mood select → writing mode → title + body → Save. Toast fired, calendar dot updated, and — the actual point of this pass — the new Phase 9 "Syncing to Drive…" pill appeared on a real save and cleared once the write actually completed. Verified past the UI layer via IndexedDB (`syncStatus: 'synced'`, real `driveFileId` returned by the Drive API), not just trusting the pill.
- **Offline queueing**: since literally disconnecting wifi would have also killed this conversation and the browser-automation link, used Chrome DevTools' per-tab Network → **Offline** throttling instead (fakes `navigator.onLine`/fetch failures for just that tab without touching the real connection). Wrote and saved an entry while throttled offline: saved locally with no error shown, `syncStatus` stayed `'pending'`, `driveFileId` stayed `null` — and confirmed via console that `maybeSync()` never even attempted the network call, short-circuiting on the `navigator.onLine` guard before hitting `fetch`. Switched throttling back to "No throttling": the browser's `online` event fired, `maybeSync()` re-ran automatically with no user action, and the entry got a real `driveFileId` back. This is the practical equivalent of the guide's "airplane mode → write → reconnect → confirm it lands in Drive" check.
- **Leftover test data**: two real entries now exist in the connected account's actual `/journal/` Drive folder from this pass ("Phase 9 manual QA", "Offline test") — the app has no delete-entry UI (an explicitly undecided "known open item" from the original guide), so removing them means deleting the files directly in Drive if wanted.
- **Still open**: mobile Chrome/Safari on a real device, and a from-cold PWA install — both need a physical phone, folded into Phase 10.

## Architecture notes

- **State management**: no Redux/Zustand. Two singleton stores using a plain subscribe/notify pattern (`src/lib/authStore.js`, `src/lib/entriesStore.js`), each exposed to React via a thin `useSyncExternalStore` hook (`useGoogleAuth`, `useEntries`). This lets non-React code (Drive API calls, sync logic) read/write the same state as components, without needing Context.
- **Screen flow**: no react-router — matches the prototype's own architecture, which is a single top-level state machine (`screen: 'intro'|'home'|'checkin'|'entry'`) living in `src/pages/JournalApp.jsx`. `react-router-dom` is installed per the original stack list but unused so far; only worth wiring in if a settings/export page gets added later (see "known open items" in the original guide).
- **Entry data model**: each entry is `{ id, created_at, updated_at, title, body (Tiptap JSON), mood, tags, input_method, day }` — `day` (`YYYY-MM-DD`) is a local-only IndexedDB field for calendar/day-grouping queries, stripped before writing to Drive (`src/lib/entriesStore.js` → `toDriveJson`).
- **Local-first sync**: writes go to IndexedDB immediately (works fully offline), then a background `maybeSync()` pushes any `pending` entries to Drive whenever connected + `navigator.onLine`. Retries happen passively on next trigger (auth reconnect, `online` event, new entry) — no exponential backoff yet.
- **Multi-entry-per-day**: `src/lib/calendar.js` groups entries by day and sorts each day's list newest-first; the calendar dot uses the most recent entry's mood. Clicking a day shows *all* that day's entries stacked (not just one card) in `Home.jsx`.

## Local dev setup

Two processes need to run side by side:

```bash
npm run dev       # Vite frontend, http://localhost:5173
npm run dev:api   # Express transcribe proxy, http://localhost:8787 (Vite proxies /api/* to it)
```

Env files (both gitignored, never commit):
- `.env` — `VITE_GOOGLE_CLIENT_ID` (safe to expose to the browser)
- `.env.server` — `GROQ_API_KEY` (server-side only; read via `node --env-file=.env.server`, never touches the client bundle)

## Phase 7 verification notes (Calendar logic)

Turned out there was nothing left to build — everything the guide's Phase 7 checklist asks for (infinite scroll across months, most-recent-mood-wins per day, dots + legend + hover tooltips, tap-a-day summary/list) was already implemented during Phase 4's UI port. This phase was pure verification, no code changes.

Verified with a temporary `#test-home` harness (`App.jsx`, since removed, same pattern as the earlier `#test-editor`/`#test-entry` ones) rendering `Home` standalone with synthetic entries — 3 same-day entries with different moods/times, a single entry 2 days back, and one entry 8 months back (outside the initial 6-month scroll window) — then drove it with Playwright and confirmed, for real:
- The calendar dot for the 3-entry day shows the *most recent* entry's mood color, not the first or a blend.
- Clicking that day lists all 3 entries, sorted newest-first.
- The hover tooltip reads "+2 more" when a day has extra entries beyond the one named in the tooltip.
- Search finds entries regardless of whether their month is currently scrolled into view (search always runs over the full `entries` array, decoupled from `monthsShown`), and clicking a result opens the right day's card even for a month never rendered on screen.
- Scrolling near the bottom of the feed loads further-back months (`monthsShown` grows via `LOAD_MORE_STEP`), confirmed by an increased count of rendered month labels after scrolling.

## Search: full-body match, not just a 90-char snippet

Found during a walkthrough of the search logic: `Home.jsx`'s search filter was matching against `entrySnippet(e)`, which truncates the flattened entry body to 90 characters (~15 words) *before* the `.includes(query)` check — so a word anywhere past the first sentence or two of a longer entry was silently unsearchable. This wasn't caught by any test because the earlier Phase 7 verification harness used short synthetic entries.

Fixed by decoupling the two uses of the body text:
- **Search** now matches against `extractText(e.body)` (the full flattened text, no cap) — `Home.jsx` imports `extractText` alongside `entrySnippet`.
- **Display** (the one-line preview under an entry in the tapped-day card) still uses `entrySnippet(entry)` at its default 90-char cap, so the compact card UI is unaffected.

Worth noting for later: there's no performance tradeoff being made here. `extractText` already walks the *entire* Tiptap JSON doc to flatten it to a string — the 90-char slice happens *after* that full walk, not before it — so searching the untruncated text costs the same as searching the truncated one. If a "why not cap it for speed" question comes up again, the answer is that the expensive part was already unbounded.

Verified live (temporary `#test-home` harness, same pattern as before): a synthetic entry with a matching word at character 265 of a 289-character body — well past the old 90-char cutoff — is now found by search, confirmed via Playwright before removing the harness.

## Phase 10 build notes (Deploy — Render to Vercel switch)

- **Why the switch**: the Render plan (locked in during Phase 6) was reconsidered once the account holder pointed out Render's free-tier Web Services cold-start ~30s after going idle, observed on another project on the same Render account. Vercel's free tier serves the static build straight from its CDN (no cold start at all for the frontend) and runs the transcribe endpoint as a serverless Function — cold starts there are typically sub-second to a couple seconds, not 30s.
- **`api/server.js` (a persistent Express app calling `app.listen()`) doesn't run on Vercel as-is** — that shape doesn't fit the platform's serverless Function model. Restructured into three files instead of rewriting in place, so local dev and production share the actual transcription logic rather than risking drift:
  - `server/transcribeGroq.js` — the Groq-calling logic itself (buffer + mimetype + API key → transcript text, or a thrown error with an HTTP `status`), used by both of the below.
  - `server/dev-server.js` — the local-dev-only Express + multer server (what `api/server.js` used to be), used by `npm run dev:api`.
  - `api/transcribe.js` — the actual deployed Vercel Function.
- **`api/transcribe.js` uses the Web Standard `Request`/`Response`/`FormData` API, not Express or multer.** Checked current Vercel docs directly rather than assuming: Vercel's documented default handler shape for non-Next.js projects in `/api` is now the Web Standard style (`export function POST(request) { ... return new Response(...) }`), and Node's built-in `request.formData()` natively parses `multipart/form-data` uploads (it's the same WHATWG spec browsers implement) — so no multer/body-parser config is needed in the deployed function at all, sidestepping the whole `bodyParser: false` question that's specific to Next.js API routes and doesn't apply here. `maxDuration: 60` is set via the function's `config` export (Hobby plan's configurable ceiling — the default is only 10s, but 60s can be set explicitly).
- **Checked whether a 10-minute voice entry (the longest realistic recording) could actually hit either of Vercel's Hobby-tier limits, rather than assuming it's fine:**
  - *Execution time*: Groq's `whisper-large-v3-turbo` transcribes at ~216x real-time, so 10 minutes of audio takes roughly 3 seconds of actual inference — nowhere near the 60s ceiling even accounting for upload/network overhead.
  - *Request payload size* (~4.5MB cap on Vercel's free tier): this was the real risk — `MediaRecorder` wasn't pinning a bitrate, so it used whatever default the browser picked (plausibly landing anywhere from ~2.4MB to ~4.8MB for a 10-minute recording depending on browser). Fixed by explicitly setting `audioBitsPerSecond: 32000` in `Entry.jsx`'s `MediaRecorder` constructor — plenty for clear speech, and it caps a 10-minute recording at a predictable ~2.4MB regardless of browser defaults.
- **Verified without needing the Vercel CLI or a live deploy**: `server/dev-server.js` boots and its error path (`400` for a missing file) works locally; separately, `api/transcribe.js`'s `POST` export was invoked directly in plain Node with a constructed `Request`/`FormData` (Node has the same Web Standard APIs built in) — it correctly parsed the upload, converted it to a buffer, and made a *real* call to Groq with the real `GROQ_API_KEY` from `.env.server`. Sent deliberately-invalid audio bytes, so Groq rejected it (`400`) and the function correctly mapped that to a `502` — proving the whole pipeline (parse → buffer → Groq call → error mapping) is wired correctly end to end, independent of Vercel's actual runtime.
- **Git/GitHub**: the project wasn't in git at all before this phase. Initialized git in `feelings/`, confirmed `.gitignore` already excluded `.env`/`.env.server` (real secrets) before the first commit — also noticed and fixed a pre-existing gitignore gap where `.env.server.example` (a template with no real secret) was being excluded too, alongside the real ones, by the same `.env.*` pattern. Pushed to a new **public** GitHub repo: [github.com/EknoorMalhotra/feelings](https://github.com/EknoorMalhotra/feelings).

## What's next

1. Finish the Vercel dashboard setup (import the GitHub repo, set `VITE_GOOGLE_CLIENT_ID` + `GROQ_API_KEY` env vars, deploy) and add the resulting live domain to the Google Cloud Console OAuth Client's authorized JavaScript origins.
2. A mobile-device pass still open: connect Google Drive for real on mobile Chrome and mobile Safari, and install the PWA to a phone home screen (Phase 10's checklist item). Desktop Chrome connect, save/sync, and the airplane-mode-equivalent offline test were all completed live in the Phase 9 manual pass above.
3. Optional cleanup: two test entries ("Phase 9 manual QA", "Offline test") are sitting in the real `/journal/` Drive folder from that pass — delete them directly in Drive if desired, since the app itself has no delete-entry UI yet.
