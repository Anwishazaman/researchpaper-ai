# ResearchPaper AI frontend

React, Vite, TypeScript, and Fluent UI v9 scaffold for the local research-paper search workspace.

## Commands

- `npm install` installs the frontend dependencies.
- `npm run dev` starts the Vite development server.
- `npm run build` type-checks and builds the production frontend.
- `npm test` runs the Vitest suite.

## Pages

- `/` searches the bundled paper evidence with BM25 or hybrid retrieval.
- `/library` lists bundled papers and validates local PDF uploads (10 MB maximum).
- `/evaluation` compares the bundled BM25 and hybrid retrieval runs.

The development-only mock state selector accepts `data`, `loading`, `empty`, and `error`. It also reads `?previewState=` or `localStorage.previewState`. Light/dark/system preference is stored under `app-theme`.

All page data passes through `src/api/index.ts`; integration can replace that seam with a live `ApiClient` without changing page imports.