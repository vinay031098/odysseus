# Odysseus UI v2 — handoff package

This folder is a **self-contained copy** of the Odysseus React UI (v2). Give this directory to someone who already has (or will install) the [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) Python backend.

## What is included

- Full React + TypeScript + Vite source (`src/`, `e2e/`, `public/`, configs)
- Production build scripts, Vitest unit tests, Playwright e2e specs
- PWA manifest and icons

**Not included** (install locally): `node_modules/`, `dist/` — generated on the recipient's machine.

## Quick start (recipient)

### 1. Install into Odysseus

Copy this entire folder into an Odysseus checkout as `frontend/`:

```bash
# From your Odysseus repo root
rm -rf frontend   # only if replacing an old UI
cp -R /path/to/odysseus-ui-v2 ./frontend
```

Or clone this repo and use the `odysseus-ui-v2/` folder directly:

```bash
cd odysseus
ln -sf ../odysseus/odysseus-ui-v2 frontend   # optional symlink
```

### 2. Build the UI

```bash
cd frontend   # or odysseus-ui-v2 if you work inside it
npm install
npm run build
```

Requires **Node.js 20+**.

### 3. Run Odysseus with v2 (default)

```bash
cd ..   # Odysseus repo root
./start-macos.sh
# Linux: python -m uvicorn app:app --host 127.0.0.1 --port 7860
```

Open **http://127.0.0.1:7860**

v2 is the default UI. Legacy v1: `ODYSSEUS_UI=v1 ./start-macos.sh`

### 4. Development mode (hot reload)

With the backend on `:7860`:

```bash
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173** — Vite proxies `/api` to the backend.

## Backend requirements

- Odysseus `app.py` with v2 SPA routes (branch `dev` or later)
- `.env` / `.env.example`: `ODYSSEUS_UI=v2` (optional; v2 is default)
- **ChromaDB** for RAG/memory: `docker compose up chromadb -d` (port 8100)
- **Ollama** or another LLM endpoint configured in Settings

## Verify install

```bash
cd frontend
npm run test:run    # unit tests
npm run lint
npm run build
```

Optional e2e (needs built app):

```bash
npm run e2e
```

Full authenticated e2e needs backend + `ODYSSEUS_E2E_PASSWORD` set to the admin password.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Buttons do nothing in chat | Hard refresh (Cmd+Shift+R) to clear stale PWA cache |
| RAG/memory broken | Start ChromaDB on `localhost:8100` |
| 404 on old JS filenames | Rebuild (`npm run build`) and hard refresh |
| Login loop | Ensure backend auth is configured; check `/api/auth/status` |

## Package version

Synced from Odysseus `frontend/` on branch `dev`. See parent repo `MIGRATION.md` for parity notes.
