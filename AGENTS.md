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

- Use TanStack file routes for public news, categories, login, and the administration screen; every linked URL must have a real route.
- Keep editorial server calls in api.functions.ts and server-only storage/auth helpers in src/server; endpoint-level administrator checks remain mandatory.
- Cloudflare D1/R2 are reached through native bindings when present, else the Cloudflare REST API with the CF_API_TOKEN secret (bindings.server.ts); Lovable hosting has no native bindings.
- Put shared leaf-page metadata in the browser-safe metadata helper and keep the administration editor separate from the dashboard for maintainability.
