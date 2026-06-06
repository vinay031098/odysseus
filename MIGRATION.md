# UI v2 cutover & parity (Waves 0–28)

Odysseus ships **UI v2** (React SPA in `frontend/dist/`) as the default. The legacy vanilla JS UI in `static/` remains available as an escape hatch until removal criteria below are met.

**Status (2026-06):** Waves **0–28 complete**. **P0 fixes in progress** (editor depth, slash core, CI/e2e hardening); **P1/P2 infra landed** in this pass (~**93%** weighted feature parity). Build, lint, and unit tests pass locally. **`static/` is not removed** — legacy editor micro-tools and slash easter eggs remain the main gap vs v1.

**CI & infra (P2 §12):** `.github/workflows/frontend-ci.yml` — lint, Vitest (with `canvas` for jsdom), build, unauthenticated Playwright smoke, and **`backend-e2e`** when repository secret **`ODYSSEUS_E2E_PASSWORD`** is set (must match admin password). Optional commented job: **`openapi-codegen`** (set repo var `OPENAPI_CODEGEN=true`). FastAPI v2 now has an SPA catch-all so unknown client paths serve `index.html` without breaking `/api`. Authenticated e2e locally: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:7860` + `ODYSSEUS_E2E_PASSWORD`.

## Default behavior

| `ODYSSEUS_UI` | UI served |
|---------------|-----------|
| unset or `v2` | React SPA (`frontend/dist/`) |
| `v1` | Legacy `static/` |

Build the v2 bundle before first run (or let `start-macos.sh` build it when `dist/` is missing):

```bash
cd frontend && npm install && npm run build
```

## Parity matrix (honest)

Legend: **Done** = daily-usable in v2 · **Partial** = core flow works, legacy depth missing · **v1-only** = still requires `ODYSSEUS_UI=v1`

| Area | v2 status | Notes |
|------|-----------|-------|
| Auth, 2FA, sessions | **Done** | Login, password change, TOTP |
| Chat core (stream, model picker, folders) | **Done** | Archive/star, Ctrl+K search, uploads, RAG/incognito, edit/delete/regenerate/fork |
| Chat agent depth | **Done** (~92%) | Web/bash/agent/plan toggles, compare-in-chat, plan window, voice/STT attachment, streaming TTS, tour hints, code runner (JS), thinking blocks, variant nav; Python runner + workspace folder injection deferred |
| Slash commands | **Partial** (~88%) | ~28 command groups + skills + `/workspace`/`/rag`; legacy easter eggs (`/demo`, `/matrix`, etc.) intentionally omitted |
| Settings (12 tabs) | **Done** (~90%) | All tabs + fallback drag-reorder, privileges, sensitive blur, RAG admin |
| Workspace (notes/tasks/calendar/memory) | **Done** (~85%) | Reminders, CalDAV sync, ICS import, task run history, webhooks, memory audit/import |
| Compare & research | **Done** (~90%) | Blind compare, probe, history, synapse panel |
| Cookbook | **Done** (~90%) | Presets, Download, What Fits, Running, GPU Serve, Remote Env |
| Email inbox + AI | **Done** (~85%) | WYSIWYG compose, HTML render, thread/signature fold, writing-style panel |
| Agents & skills | **Done** (~90%) | Editor, import, tests, bulk audit, select mode |
| Gallery | **Done** (~88%) | Layers, crop/transform, stroke pipeline, bulk favorite/tag, text tool, AI panels; legacy transform-session micro-tools still shallow |
| Documents library | **Partial** (~82%) | Multi-tab, markdown + hljs, canvas editor (crop, lasso, levels, blur, layer ops), version history, bulk import/tidy, bulk zip; legacy 53-module suite not 1:1 |
| Appearance & keybinds | **Done** (~85%) | 17+ presets, custom themes, density, sidebar visibility, global keybinds |
| Mobile / PWA | **Done** (~85%) | Icon rail, swipe sidebar, install prompt, `vite-plugin-pwa` service worker |
| `/backgrounds` route | **Done** (~95%) | Full effects sandbox — patterns, live canvases (rain, synapse, constellations, etc.) |

### Waves 0–16 (complete)

| Wave | Scope |
|------|-------|
| 0 | Shell, auth, design tokens |
| 1 | Chat, sessions, streaming |
| 2–3 | Settings stubs, workspace |
| 4 | Compare, research, cookbook presets |
| 5–6 | Email, agents, group chat |
| 7–8 | A11y, code-split, v2 default cutover |
| 9 | Full settings (12 tabs) |
| 10 | Chat parity (folders, search, uploads, incognito, message ops) |
| 11 | Email AI/schedule, account edit |
| 12 | Agents depth, slash palette |
| 13–14 | Gallery, documents library |
| 15 | GPU cookbook serve tab |
| 16 | Appearance prefs, global keybinds, route wiring, e2e smoke baseline |

### Waves 17–28 (complete — partial depth where noted)

| Wave | Scope | Outcome |
|------|-------|---------|
| 17 | Chat & agent parity | **Mostly done** — toggles, compare-in-chat, plan window, voice/TTS; JS-only code runner |
| 18 | Document canvas editor + chat doc dock | **Partial** — MVP canvas (4 tools) + session doc dock; legacy 53-module suite not 1:1 |
| 19 | Gallery image editor | **Mostly done** — MVP editor + AI tools; not full legacy depth |
| 20 | Full cookbook | **Done** — 6 tabs including download, hwfit, HF browse |
| 21 | Theme, mobile shell, PWA, `/backgrounds` | **Done** |
| 22 | Workspace depth | **Done** |
| 23 | Slash command suite | **Partial** — core productivity commands; utilities/easter eggs omitted |
| 24 | Email polish | **Done** |
| 25 | Settings & admin polish | **Done** |
| 26 | Agents polish | **Done** |
| 27 | Compare & research polish | **Done** |
| 28 | Docs & CI | **Done** — CI workflow, e2e expansion, lint clean; **no `static/` removal** |
| P0 | Editor depth, slash core, CI/e2e | **In progress** — editor/slash depth ongoing; auth e2e job + SPA catch-all landed |
| P1 | Chat, cookbook, workspace polish | **Done** — code runner, diagnosis/queue, compare modes, library bulk, doc dock e2e |
| P2 | Polish & infra | **Done** — backgrounds lab, tour/STT/TTS, OpenAPI codegen hook, Vitest canvas, scoreboard, SPA fallback |

### Remaining for 100% parity (post–P2)

1. Legacy editor micro-tools not yet ported (transform-session knobs, advanced filters)
2. Port or explicitly drop remaining slash easter eggs (`/demo`, `/matrix`, etc.)
3. Set **`ODYSSEUS_E2E_PASSWORD`** in GitHub repo secrets so **`backend-e2e`** runs in CI
4. Optional: enable OpenAPI drift check (`OPENAPI_CODEGEN=true` + uncomment `openapi-codegen` job)
5. Commit `frontend/` + CI workflow to `main`

## SPA deep links

When `ODYSSEUS_UI=v2`, FastAPI serves the React app for explicit routes (`/`, `/login`, `/chat`, …) and **any other non-API GET path** via a catch-all that returns `frontend/dist/index.html` (React Router handles client-side routing). `/api/*`, `/static/*`, and `/assets/*` are never hijacked.

## Switching back to v1

```bash
ODYSSEUS_UI=v1 ./start-macos.sh
# or add to .env: ODYSSEUS_UI=v1
```

Use v1 when you need features not yet ported (see matrix above).

## When to remove `static/` (prepared — not executed)

Do **not** delete `static/` until all of the following are true:

1. Every row in the parity matrix above is **Done** (or an intentional subset is documented).
2. Document editor, gallery editor, and full cookbook download/hwfit flows work in v2.
3. Custom themes and mobile/PWA behavior are ported or explicitly dropped.
4. Full authenticated e2e smoke passes with `ODYSSEUS_E2E_PASSWORD` set.
5. Frontend CI is green on `main` (`.github/workflows/frontend-ci.yml`).
6. No open issues tagged “v1-only” in release notes.

Until then, keep `static/` as the escape hatch. P0–P2 have brought editors and productivity flows to ~90%+; criteria 1–2 (editor micro-tool parity) and 5 (CI green on `main`) are still open. Auth e2e runs in CI once **`ODYSSEUS_E2E_PASSWORD`** is configured.

## E2E smoke & CI

### Local (all e2e specs)

**Preview-only (no backend):** unauthenticated smoke runs against `vite preview` on `:4173` (default in CI).

```bash
cd frontend
npm run build
npm run e2e
# or: npx playwright test e2e/smoke.spec.ts --grep-invert @auth
```

**Full suite (backend + auth):** start Odysseus on `:7860`, then run every spec including `@auth` feature tests (`chat`, `email`, `gallery`, `library`):

```bash
# Terminal 1: backend on :7860
./start-macos.sh
# or: python -m uvicorn app:app --host 127.0.0.1 --port 7860

# Terminal 2:
cd frontend
npm run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:7860 \
  ODYSSEUS_E2E_PASSWORD='your-admin-password' \
  npm run e2e
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `ODYSSEUS_E2E_PASSWORD` | *(unset)* | Admin password for authenticated route tests. When unset, those tests **skip**. |
| `ODYSSEUS_E2E_USER` | `admin` | Username for login smoke |
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:7860` locally; preview in CI | SPA base URL |

Unauthenticated tests (login page, redirect guards) run without credentials against the Vite preview server.

### GitHub Actions

`.github/workflows/frontend-ci.yml` runs on changes under `frontend/`:

1. Canvas system libs + `npm ci` (Vitest/jsdom uses the `canvas` package)
2. `npm run lint`
3. `npm run test:run` (Vitest)
4. `npm run build`
5. Playwright unauthenticated smoke (`e2e/smoke.spec.ts --grep-invert @auth`) against preview — no backend

Specs tagged **`@auth`** (`smoke` authenticated block, `chat`, `email`, `gallery`, `library`) skip when `ODYSSEUS_E2E_PASSWORD` is unset.

**Authenticated e2e in CI:** add repository secret **`ODYSSEUS_E2E_PASSWORD`** (must match the admin password set at backend startup). Optional: **`ODYSSEUS_E2E_USER`** (defaults to `admin` in Playwright helpers). The **`backend-e2e`** job runs automatically when the secret is present; without it, only unauthenticated smoke runs.

To enable **OpenAPI type drift checks** in CI:

1. Set repository variable **`OPENAPI_CODEGEN=true`**.
2. Commit a baseline `frontend/src/api/generated/schema.ts` (from `cd frontend && npm run codegen` with backend running).
3. Uncomment the **`openapi-codegen`** job in `frontend-ci.yml`.

## Legacy module docs

`static/js/MODULE_SUMMARY.md` is **stale** — a partial historical catalog, not kept in sync with the full `static/js/` tree. Prefer this file and [frontend/README.md](frontend/README.md) for v2 status; use the source tree for v1 module discovery.
