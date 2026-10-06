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

- Backend public config: vite.config.ts injects the publishable backend URL/key as a build-time fallback — builds must never depend on a host .env being present.
- Build deploys: projects needing dependency install/build are sent to the Vercel Deployments API (VERCEL_TOKEN) via auth-protected server fns; the Worker runtime cannot run builds itself.
