// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public (publishable) backend values. Used as a build-time fallback so the
// browser bundle never ships without them, even if the host's .env is missing
// (e.g. after a remix or on an external host like Vercel).
const PUBLIC_SUPABASE_URL = process.env['VITE_SUPABASE_URL'] || "https://aflkhahgjedcynwrtqka.supabase.co";
const PUBLIC_SUPABASE_KEY = process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || "sb_publishable_LVBQcM_vn7_Y2hjXZjitPQ_29vsWLCJ";
const PUBLIC_SUPABASE_PROJECT_ID = process.env['VITE_SUPABASE_PROJECT_ID'] || "aflkhahgjedcynwrtqka";

process.env['VITE_SUPABASE_URL'] ||= PUBLIC_SUPABASE_URL;
process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||= PUBLIC_SUPABASE_KEY;
process.env['VITE_SUPABASE_PROJECT_ID'] ||= PUBLIC_SUPABASE_PROJECT_ID;
process.env['SUPABASE_URL'] ||= PUBLIC_SUPABASE_URL;
process.env['SUPABASE_PUBLISHABLE_KEY'] ||= PUBLIC_SUPABASE_KEY;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_SUPABASE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(PUBLIC_SUPABASE_PROJECT_ID),
    },
  },
});
