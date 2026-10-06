import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VERCEL = "https://api.vercel.com";

function token() {
  const t = process.env["VERCEL_TOKEN"];
  if (!t) throw new Error("O serviço de compilação ainda não está configurado.");
  return t;
}

const DeployInput = z.object({
  name: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "Nome inválido (use letras, números e hífen)"),
  files: z
    .array(z.object({ file: z.string().min(1).max(400), data: z.string() }))
    .min(1)
    .max(3000),
});

// Sends the project to the build service, which installs dependencies,
// detects the framework and builds it (like Vercel).
export const startBuildDeploy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeployInput.parse(d))
  .handler(async ({ data, context }) => {
    const safe = data.files.filter((f) => !f.file.includes("..") && !f.file.startsWith("node_modules/") && !f.file.startsWith(".git/"));
    const project = `gw-${context.userId.slice(0, 8)}-${data.name}`.slice(0, 90);
    const res = await fetch(`${VERCEL}/v13/deployments?skipAutoDetectionConfirmation=1`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: project,
        target: "production",
        files: safe.map((f) => ({ file: f.file, data: f.data, encoding: "base64" })),
        projectSettings: { framework: null },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !body.id) {
      console.error("build deploy failed", res.status, body.error);
      return { ok: false as const, error: body.error?.message ?? "Não foi possível iniciar o deploy." };
    }
    return { ok: true as const, id: body.id, url: `https://${body.url}` };
  });

export const buildStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().regex(/^[a-zA-Z0-9_]+$/) }).parse(d))
  .handler(async ({ data }) => {
    const res = await fetch(`${VERCEL}/v13/deployments/${data.id}`, { headers: { Authorization: `Bearer ${token()}` } });
    const b = (await res.json().catch(() => ({}))) as { readyState?: string; url?: string; alias?: string[] };
    let logs: string[] = [];
    try {
      const ev = await fetch(`${VERCEL}/v3/deployments/${data.id}/events?limit=40&direction=backward`, { headers: { Authorization: `Bearer ${token()}` } });
      const arr = (await ev.json()) as Array<{ text?: string; payload?: { text?: string } }>;
      if (Array.isArray(arr)) logs = arr.map((e) => e.text ?? e.payload?.text ?? "").filter(Boolean).reverse();
    } catch { /* logs are optional */ }
    const host = b.alias?.[0] ?? b.url;
    return { state: b.readyState ?? "UNKNOWN", url: host ? `https://${host}` : null, logs };
  });
