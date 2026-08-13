<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Project Deployment & Build Rules

1. **Vite & Nitro Configuration (`vite.config.ts`)**:
   - Use standard `vite` import (`import { defineConfig } from "vite"`) instead of `@lovable.dev/vite-tanstack-config` to prevent sandbox port 8080 redirection.
   - Configure Nitro with `preset: "node-server"` so SSR builds output to `.output/server/index.mjs`.
   - Ensure `server` and `preview` host is set to `0.0.0.0` and port is set to `3000`.

2. **Package Configuration (`package.json`)**:
   - Keep `"name": "self-maxizer-app"` matching `metadata.json`.
   - Ensure `"start": "node .output/server/index.mjs"` is defined for Cloud Run execution.

3. **Supabase Initialization (`src/integrations/supabase/client.ts`)**:
   - Do NOT throw hard exceptions at module load time if Supabase environment variables are missing; use fallback placeholders so SSR rendering never crashes on startup.

