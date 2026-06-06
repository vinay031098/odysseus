# Odysseus UI v2 (shareable package)

React SPA for **Odysseus** — chat, agents, cookbook, document/gallery editors, email, settings, and more.

**→ Start here: [HANDOFF.md](./HANDOFF.md)** — install steps for someone receiving this folder.

## One-line summary

```bash
npm install && npm run build
```

Then run the Odysseus Python backend; it serves this app from `dist/` at http://127.0.0.1:7860.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server :5173, API proxy to :7860 |
| `npm run build` | Production bundle → `dist/` |
| `npm run test:run` | Vitest (257+ tests) |
| `npm run lint` | ESLint |
| `npm run e2e` | Playwright |

Full developer docs: same as [frontend/README.md](../frontend/README.md) in the main repo.
