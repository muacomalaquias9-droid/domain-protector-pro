import { createFileRoute } from "@tanstack/react-router";
import { userFromApiKey } from "@/lib/hosting.server";

const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { "cache-control": "no-store" } });

export const Route = createFileRoute("/api/public/v1/sites")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = await userFromApiKey(request);
        if (!userId) return json({ error: "Chave de API inválida" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("hosted_sites").select("id,name,slug,custom_domain,domain_verified,storage_used,deploys,created_at").eq("user_id", userId);
        const origin = new URL(request.url).origin;
        return json({ sites: (data ?? []).map((s) => ({ ...s, url: `${origin}/h/${s.slug}/` })) });
      },
    },
  },
});
