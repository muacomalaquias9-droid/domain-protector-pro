import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { userFromApiKey, putFile } from "@/lib/hosting.server";

const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { "cache-control": "no-store" } });

const Body = z.object({
  site_id: z.string().uuid(),
  files: z.array(z.object({ path: z.string().min(1).max(300), content: z.string(), encoding: z.enum(["utf8", "base64"]).default("utf8") })).min(1).max(200),
});

export const Route = createFileRoute("/api/public/v1/deploy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await userFromApiKey(request);
        if (!userId) return json({ error: "Chave de API inválida" }, 401);
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Pedido inválido", details: parsed.error.issues }, 400);
        const results = [];
        for (const f of parsed.data.files) {
          try {
            const bytes = f.encoding === "base64" ? new Uint8Array(Buffer.from(f.content, "base64")) : new TextEncoder().encode(f.content);
            results.push({ ok: true, ...(await putFile(userId, parsed.data.site_id, f.path, bytes)) });
          } catch (e) {
            results.push({ ok: false, path: f.path, error: (e as Error).message });
          }
        }
        return json({ deployed: results.filter((r) => r.ok).length, results });
      },
    },
  },
});
