# Feelings

A private, ad-free journal PWA. Entries are stored as JSON files in your own Google Drive — no backend database, no accounts beyond your Google account.

See `PROGRESS.md` for build status, architecture notes, and decisions made along the way.

## Running locally

```bash
npm install
npm run dev       # frontend, http://localhost:5173
npm run dev:api   # transcribe proxy, http://localhost:8787
```

Copy `.env.example` → `.env` (Google OAuth Client ID) and `.env.server.example` → `.env.server` (Groq API key) and fill in real values before running.
