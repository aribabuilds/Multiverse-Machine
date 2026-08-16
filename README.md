# The Multiverse Machine

Type a sentence, watch an AI write it word by word, and see every word it _almost_ wrote branch off as faded parallel timelines you can play with.

Everything runs **client-side** — a small language model runs in your browser via WebGPU. No sign-in, no API key, no data leaves your device, and no server bill at any scale.

## Tech stack

- **React + TypeScript + Vite**
- **Transformers.js** (`@huggingface/transformers`) on **WebGPU** — a deliberately small instruct model (Llama-3.2-1B-Instruct, Qwen2.5-0.5B fallback)
- **D3.js** for the animated branching visualization
- **Tailwind CSS** for styling
- Static hosting (Vercel / Netlify / GitHub Pages)

## Local development

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run format     # Prettier (write)
```

## Project structure

```
src/
  components/   UI: window chrome, glass control panel, branching viz
  lib/          logic: generation engine, model loading, tree model, share encoding
  hooks/        React hooks wrapping the lib logic
```

## Deployment

The app is a static build (`dist/`) — deploy it anywhere static, for free. Configs are included for all three common hosts:

- **Vercel** — import the repo; `vercel.json` sets the build. Auto-deploys on push.
- **Netlify** — link the repo; `netlify.toml` sets the build. Auto-deploys on push.
- **GitHub Pages** — `.github/workflows/deploy.yml` builds and deploys on push to `main`. Enable Pages → "GitHub Actions" in repo settings. This is a project page (`/<repo>/`, not the domain root), so the workflow sets `GITHUB_PAGES=true` during the build, which `vite.config.ts` uses to prefix asset URLs correctly. If the repo is ever renamed, update the hardcoded path in `vite.config.ts` to match.

## Build milestones

Built in nine sequential checkpoints (M0–M8), each a working, testable state. See `docs/multiverse-machine-milestones.pdf`. Current: **M0 — scaffolding**.
