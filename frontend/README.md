# Odysseus UI v2

React + TypeScript frontend for Odysseus. **Default UI** — served when `ODYSSEUS_UI` is unset or `v2`. Legacy `static/` remains via `ODYSSEUS_UI=v1` ([MIGRATION.md](../MIGRATION.md)).

## Prerequisites

- Node.js 20+
- Odysseus backend running (native macOS default: `http://127.0.0.1:7860`)

## Development

```bash
cd frontend
npm install
npm run dev
```

Vite dev server runs on **http://127.0.0.1:5173** and proxies `/api` to the backend.

## Production build

```bash
cd frontend
npm run build
```

Then start the backend (v2 is the default):

```bash
./start-macos.sh
# or
python -m uvicorn app:app --host 127.0.0.1 --port 7860
```

Open **http://127.0.0.1:7860** — FastAPI serves the built SPA from `frontend/dist/`.

Legacy UI: `ODYSSEUS_UI=v1` before starting the server.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Typecheck + production bundle |
| `npm run preview` | Preview production build |
| `npm test` | Vitest watch mode |
| `npm run test:run` | Vitest single run |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run e2e` | Playwright smoke (see E2E below) |
| `npm run codegen` | OpenAPI type generation (requires running backend) |

## E2E (Playwright)

Specs live in `e2e/`:

| Spec | Scope | Auth |
|------|-------|------|
| `smoke.spec.ts` | Login page, redirect guards, all sidebar routes | Unauthenticated block always runs; `@auth` block needs password |
| `chat.spec.ts` | Chat composer toggles, compare-in-chat, document dock | `@auth` |
| `email.spec.ts` | Compose, WYSIWYG, writing-style panel | `@auth` |
| `gallery.spec.ts` | Grid, bulk select, editor entry | `@auth` |
| `library.spec.ts` | Document CRUD, bulk select, canvas tab | `@auth` |

Shared login helper: `e2e/helpers/auth.ts` — tests skip gracefully when `ODYSSEUS_E2E_PASSWORD` is unset.

### Preview-only (CI default)

Playwright serves the production build via `vite preview` (port 4173). No backend required.

```bash
cd frontend
npm run build
npm run e2e
# Unauthenticated smoke only:
npx playwright test e2e/smoke.spec.ts --grep-invert @auth
```

### Full suite (backend on :7860)

Run **all** specs including `@auth` feature tests against the live FastAPI server:

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
| `ODYSSEUS_E2E_PASSWORD` | *(unset)* | When unset, `@auth` tests **skip** |
| `ODYSSEUS_E2E_USER` | `admin` | Login username |
| `PLAYWRIGHT_BASE_URL` | preview `:4173`; set to `http://127.0.0.1:7860` for full backend e2e | SPA base URL |

**CI:** [.github/workflows/frontend-ci.yml](../.github/workflows/frontend-ci.yml) runs lint, Vitest, build, and unauthenticated smoke on every PR touching `frontend/`. Set repository secret **`ODYSSEUS_E2E_PASSWORD`** (admin password) to enable the **`backend-e2e`** job — see [MIGRATION.md](../MIGRATION.md#e2e-smoke--ci).

## Project structure

```
src/
  api/          API client + types
  components/   UI primitives + layout
  hooks/        React hooks (auth, theme)
  pages/        Route pages
  lib/          Utilities
```

## Wave status

- **Wave 0 (done):** Shell, auth, design tokens, backend integration
- **Wave 1 (done):** Chat, sessions, streaming, model picker
- **Wave 2 (done):** Settings — account/password, model endpoints (admin), default model, appearance, privacy, advanced stubs
- **Wave 3 (done):** Workspace — Notes, Tasks, Calendar, Memory
- **Wave 4 (done):** Power tools — Compare, Research, Cookbook (prompt recipes)
- **Wave 5 (done):** Email — folders, inbox list, read, compose, reply, archive/delete
- **Wave 6 (done):** Agents & skills browser, multi-model group chat
- **Wave 7 (done):** A11y polish, route code-splitting, expanded tests
- **Wave 8 (done):** v2 default cutover, auto-build in start-macos.sh, migration docs
- **Wave 9 (done):** Full settings parity — 12 legacy tabs ported
- **Wave 10 (done):** Chat parity — session folders/archive/star, Ctrl+K search, uploads, RAG/incognito, message edit/delete/regenerate/fork, stream resume
- **Wave 11 (done):** Email parity — multi-account picker, AI reply/summarize, scheduled sends, account/integration edit
- **Wave 12 (done):** Agents depth — skill editor, import, tests, builtin overrides, slash palette
- **Wave 13 (done):** Gallery — photo library, albums, upload, favorites, AI tagging
- **Wave 14 (done):** Documents library — list, preview, create, delete, archive, PDF import
- **Wave 15 (done):** GPU Cookbook — serve tab with GPU/VRAM monitor, running serves, packages
- **Wave 16 (done):** Final parity & cutover — appearance (theme prefs, density, sidebar visibility), global keybinds, chat polish integration, all routes wired, expanded e2e smoke

### Waves 17–28 (complete)

**~80%** weighted parity vs legacy. See [MIGRATION.md](../MIGRATION.md) for honest matrix. **`static/` retained** until editor depth + authenticated e2e + CI on `main`.

| Wave | Scope | Status |
|------|-------|--------|
| 17 | Chat & agent parity | Done (partial: JS-only code runner) |
| 18 | Document canvas editor | Partial (MVP canvas vs legacy 53-module suite) |
| 19 | Gallery image editor | Mostly done |
| 20 | Full cookbook | Done |
| 21 | Theme, mobile shell, PWA, `/backgrounds` | Done |
| 22 | Workspace depth | Done |
| 23 | Slash command suite | Partial (core commands; utilities/easter eggs omitted) |
| 24 | Email polish | Done |
| 25 | Settings & admin polish | Done |
| 26 | Agents polish | Done |
| 27 | Compare & research polish | Done |
| 28 | Docs, CI, e2e, lint | Done (no `static/` removal) |

### Wave 16 — appearance & keybinds

- **Theme** — light/dark with `/api/prefs/theme` sync (maps legacy `paper` → light)
- **Density** — `comfortable` / `compact` via `html[data-density]` + localStorage
- **Sidebar nav** — per-item visibility toggles in Settings → Appearance (shared `odysseus-ui-visibility` keys with v1 where applicable)
- **Keybinds** — global handler in `AppShell` (`toggle_sidebar`, `admin_panel`, chat events for new/star/delete/cancel/search)
- **E2E** — Playwright smoke expands to all major routes when `ODYSSEUS_E2E_PASSWORD` is set

### Cutover checklist (Wave 8 + Wave 16)

- [x] `ODYSSEUS_UI` defaults to `v2` in `app.py`
- [x] `start-macos.sh` builds `frontend/dist` when missing (requires Node.js)
- [x] SPA deep links registered in `app.py` for all v2 routes
- [x] Legacy `static/` retained; `ODYSSEUS_UI=v1` escape hatch documented
- [x] Gallery in v2 sidebar (`/gallery`)
- [x] Documents library (`/library`) — Wave 14
- [x] GPU cookbook serve tab (`/cookbook?tab=serve`) — Wave 15
- [x] Global keybinds from saved settings — Wave 16
- [x] Appearance: theme prefs sync, density CSS, sidebar nav visibility — Wave 16
- [x] Expanded Playwright smoke (login + key routes) — Wave 16; Wave 28 adds unauthenticated guards + CI
- [x] Waves 17–28 landed (~80% parity) — see matrix in [MIGRATION.md](../MIGRATION.md)
- [ ] Full legacy feature parity — **blocked on editor depth + slash long tail**
- [ ] Remove `static/` — **blocked** (see MIGRATION.md removal criteria)

### Agents & group chat (Wave 6 + Wave 12)

| Route | Feature |
|-------|---------|
| `/agents` | Skills browser: edit SKILL.md, publish, delete, import URL, add draft, run tests |
| `/agents` | Built-in tool overrides — edit instruction blocks, revert to default (admin) |
| `/group-chat` | Multi-model chat (round-robin or parallel) with optional character personas |
| `/chat` | Slash palette — `/help`, `/skills`, `/<skill-name>` autocomplete + invocation |

APIs: `/api/skills`, `/api/skills/add`, `/api/skills/import-from-url`, `/api/skills/{id}/markdown` (POST), `/api/skills/{id}/test`, `/api/skills/{id}/test-status`, `/api/skills/builtin`, `/api/skills/builtin/{name}` (PUT/DELETE), `/api/presets/groups`, `/api/session`, `/api/chat_stream`

Bulk skill audit and select mode are in v2 (Wave 26). Slash utilities/easter eggs from legacy `slashCommands.js` are still partial (Wave 23).

### Chat parity (Wave 10)

| Route | Feature |
|-------|---------|
| `/chat`, `/chat/:sessionId` | Sessions sidebar, streaming, model picker |

| Area | Features |
|------|----------|
| Sessions | Folders (move/new), archive/restore, favorite, sort (active/newest/group) |
| Search | Ctrl+K overlay — `GET /api/search?q=` |
| Composer | Attachments via `POST /api/upload`, RAG toggle (`use_rag=false`), incognito |
| Messages | Edit user text, delete pair, resend, regenerate, fork |
| Streaming | Resume detached agent runs — `GET /api/chat/resume/{id}` |
| Keybinds | Search/new/star/delete/cancel from saved `keybinds` (global + page listeners) |

APIs: `/api/sessions`, `/api/sessions/archived`, `/api/session/{id}/archive`, `/unarchive`, `/important`, `/truncate`, `/fork`, `/delete-messages`, `/api/chat_stream`, `/api/chat/resume/{id}`, `/api/upload`, `/api/search`

Not in Wave 10: regenerate variant carousel, rich resume reload, workspace folder injection.

```bash
cd frontend && npm run build && npm run test:run
```

### Accessibility & performance (Wave 7)

- **Skip link** — “Skip to main content” on authenticated shell; focus moves to `#main-content` on route change
- **Labels** — icon-only controls use `aria-label`; login/settings forms use associated labels
- **Focus** — visible `:focus-visible` ring on interactive elements
- **Code splitting** — heavy routes lazy-loaded (`React.lazy` + `Suspense`); vendor chunks: `react`, `markdown`, `query`, `router`, `icons`
- **Tests** — a11y/route helpers, lazy import smoke, Playwright login smoke (unauthenticated)

Keyboard: Tab through sidebar links; Enter activates nav; main content receives focus after navigation.

### Email (Wave 5 + Wave 11)

| Route | Feature |
|-------|---------|
| `/email` | 3-pane mail: folders, message list, reader; compose/reply; search & unread filter |
| `/email` (Wave 11) | Multi-account picker; AI reply (fast/full) & summarize; scheduled send queue |

APIs: `/api/email/accounts`, `/folders`, `/list`, `/search`, `/read/{uid}`, `/send`, `/draft`, `/summarize`, `/ai-reply`, `/scheduled`, mark-read/unread, archive, delete, compose-upload

Settings: **Settings → Email** — add, edit (`PUT /api/email/accounts/{id}`), test, delete accounts. **Settings → Integrations** — add, edit (`PUT /api/auth/integrations/{id}`), test, delete.

Not yet ported: WYSIWYG HTML compose, writing-style extraction UI.

### Workspace (Wave 3)

| Route | Feature |
|-------|---------|
| `/notes` | List, create, edit, delete notes |
| `/tasks` | Scheduled tasks — create, pause/resume, run, delete |
| `/calendar` | Month view, list events, create/delete events |
| `/memory` | Browse, search, add, edit, delete memories |

APIs: `/api/notes`, `/api/tasks`, `/api/calendar/*`, `/api/memory/*`

Not in Wave 3: CalDAV sync, task run history/webhooks, memory audit/import.

### Power tools (Wave 4)

| Route | Feature |
|-------|---------|
| `/compare` | Side-by-side model comparison with blind vote |
| `/research` | Deep research jobs, SSE progress, library |
| `/cookbook` | Prompt presets & templates; **Run in chat** prefills the composer |
| `/cookbook?tab=serve` | GPU serve — VRAM monitor, running serves, quick vLLM launch (admin) |

```bash
cd frontend && npm run build && npm run test:run
```

### GPU Cookbook (Wave 15)

Open **Cookbook → GPU Serve** or `/cookbook?tab=serve`. Admin only (matches legacy cookbook APIs).

| Feature | APIs |
|---------|------|
| GPU list & VRAM bars | `GET /api/cookbook/gpus` |
| Kill GPU processes | `POST /api/cookbook/kill-pid` |
| Running serves + stop | `GET /api/cookbook/tasks/status`, `POST /api/shell/exec`, `POST /api/cookbook/state` |
| Quick serve | `POST /api/model/serve`, `GET /api/model/cached` |
| Remote setup & packages | `POST /api/cookbook/setup`, `GET /api/cookbook/packages` |

Presets tab unchanged. Not in Wave 15: full download UI, hwfit, HuggingFace browse, serve presets editor (legacy Tools → Cookbook).

### Settings (Wave 9)

Open **Settings** from the sidebar or `/settings`. Deep-link with `?tab=`, e.g. `/settings?tab=ai` (aliases: `models` → `ai`, `advanced` → `system`).

| Tab | Features |
|-----|----------|
| Services | Health, readiness, version, runtime |
| AI | Default model, endpoints CRUD, agent limits, TTS |
| Search | Web search provider, URL, result count, SafeSearch |
| Integrations | External services CRUD + test (admin) |
| Email | IMAP/SMTP account CRUD, test, default |
| Reminders | Delivery channel (browser/email/ntfy/webhook) |
| Appearance | Light/dark theme (prefs sync), density, sidebar nav visibility |
| Shortcuts | Keyboard keybinds (admin edit); global handler in shell + chat |
| Account | Profile, password, 2FA |
| Privacy | Auth status summary |
| Tools | Tool path roots (admin) |
| Users | User CRUD, signup toggle, feature flags (admin) |
| System | API tokens, MCP servers, webhooks (admin) |

Not in Wave 9: full legacy theme picker (15+ presets + custom editor), provider logo pickers, search fallback drag-reorder UI. Wave 16 adds light/dark + sidebar visibility toggles (shared `odysseus-ui-visibility` storage with v1 where keys overlap).

### Documents library (Wave 14)

| Route | Feature |
|-------|---------|
| `/library` | Document list with search, sort, language filters; markdown/text/PDF preview; create, delete, archive/restore; PDF import |

APIs: `/api/documents/library`, `/api/document` (CRUD), `/api/document/{id}/archive`, `/api/documents/import-pdf`, `/api/document/{id}/render-pdf`

Not in Wave 14: full canvas editor (`static/js/editor/*`), clone-to-session, bulk select/export, tidy/ai-tidy, version history UI, code syntax highlighting.

### Gallery (Wave 13)

| Route | Feature |
|-------|---------|
| `/gallery` | Photo/video library — grid browse, album sidebar, detail panel, upload (file picker + drag-drop), favorites, delete, AI auto-tag |

APIs: `/api/gallery/library`, `/api/gallery/albums`, `/api/gallery/upload`, `/api/gallery/{id}`, `/api/gallery/{id}/favorite`, `/api/gallery/{id}/ai-tag`, `/api/gallery/clear-ai-tags`

Not in Wave 13: canvas editor, bulk select/export zip, tag filter chips, rotate/rename, style transfer/upscale, folder-drop album import.
