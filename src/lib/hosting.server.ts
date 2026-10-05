import { createHash, randomBytes } from "crypto";

export const QUOTA_BYTES = 128 * 1024 * 1024 * 1024; // 128 GB por identidade de dispositivo
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", ico: "image/x-icon", txt: "text/plain; charset=utf-8", xml: "application/xml",
  pdf: "application/pdf", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", mp4: "video/mp4",
  webmanifest: "application/manifest+json", wasm: "application/wasm",
};
export function mimeOf(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export function cleanPath(p: string) {
  const parts = p.replace(/\\/g, "/").split("/").filter((s) => s && s !== "." && s !== "..");
  const out = parts.join("/");
  if (!out || out.length > 300 || !/^[\w\-./@ ]+$/.test(out)) throw new Error("Caminho de ficheiro inválido");
  return out;
}

export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");
export const newApiKey = () => "gw_live_" + randomBytes(24).toString("base64url");

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export async function userUsage(userId: string) {
  const sb = await admin();
  const { data } = await sb.from("hosted_sites").select("storage_used").eq("user_id", userId);
  return (data ?? []).reduce((a, r) => a + Number(r.storage_used), 0);
}

async function recompute(siteId: string) {
  const sb = await admin();
  const { data } = await sb.from("site_files").select("size").eq("site_id", siteId);
  const total = (data ?? []).reduce((a, r) => a + Number(r.size), 0);
  await sb.from("hosted_sites").update({ storage_used: total }).eq("id", siteId);
  return total;
}

export async function putFile(userId: string, siteId: string, rawPath: string, bytes: Uint8Array) {
  const sb = await admin();
  const path = cleanPath(rawPath);
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error("Ficheiro maior que 25 MB");
  const { data: site } = await sb.from("hosted_sites").select("id,user_id,deploys").eq("id", siteId).maybeSingle();
  if (!site || site.user_id !== userId) throw new Error("Site não encontrado");
  const used = await userUsage(userId);
  const { data: prev } = await sb.from("site_files").select("size").eq("site_id", siteId).eq("path", path).maybeSingle();
  if (used - Number(prev?.size ?? 0) + bytes.byteLength > QUOTA_BYTES) throw new Error("Limite de 128 GB atingido");
  const type = mimeOf(path);
  const { error } = await sb.storage.from("sites").upload(`${siteId}/${path}`, bytes, { contentType: type, upsert: true });
  if (error) throw new Error(error.message);
  await sb.from("site_files").upsert({ site_id: siteId, user_id: userId, path, size: bytes.byteLength, content_type: type, updated_at: new Date().toISOString() }, { onConflict: "site_id,path" });
  await sb.from("hosted_sites").update({ deploys: site.deploys + 1 }).eq("id", siteId);
  await recompute(siteId);
  return { path, size: bytes.byteLength };
}

export async function removeFile(userId: string, siteId: string, path: string) {
  const sb = await admin();
  const { data: f } = await sb.from("site_files").select("id,user_id").eq("site_id", siteId).eq("path", path).maybeSingle();
  if (!f || f.user_id !== userId) throw new Error("Ficheiro não encontrado");
  await sb.storage.from("sites").remove([`${siteId}/${path}`]);
  await sb.from("site_files").delete().eq("id", f.id);
  await recompute(siteId);
}

export async function removeSite(userId: string, siteId: string) {
  const sb = await admin();
  const { data: files } = await sb.from("site_files").select("path").eq("site_id", siteId).eq("user_id", userId);
  if (files?.length) await sb.storage.from("sites").remove(files.map((f) => `${siteId}/${f.path}`));
  await sb.from("hosted_sites").delete().eq("id", siteId).eq("user_id", userId);
}

async function doh(name: string, type: string) {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: "application/dns-json" } });
  const j = (await r.json()) as { Answer?: { data: string }[] };
  return (j.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, "").replace(/\.$/, ""));
}

export async function checkDomain(domain: string, token: string, target: string) {
  const [txt, cname] = await Promise.all([doh(`_guardaweb.${domain}`, "TXT"), doh(domain, "CNAME")]);
  const txtOk = txt.some((t) => t.includes(token));
  const cnameOk = cname.some((c) => c.toLowerCase() === target.toLowerCase());
  return { txtOk, cnameOk, txt, cname };
}

export async function serveFile(slug: string, rawPath: string): Promise<Response> {
  const sb = await admin();
  const { data: site } = await sb.from("hosted_sites").select("id").eq("slug", slug).maybeSingle();
  if (!site) return new Response("Site não encontrado", { status: 404 });
  let path = rawPath.replace(/^\/+/, "");
  if (!path || path.endsWith("/")) path += "index.html";
  const candidates = [path, path.includes(".") ? null : `${path}/index.html`, "index.html"].filter(Boolean) as string[];
  for (const p of candidates) {
    const { data } = await sb.storage.from("sites").download(`${site.id}/${p}`);
    if (data) {
      return new Response(data, {
        status: p === path || p === `${path}/index.html` ? 200 : 200,
        headers: { "content-type": mimeOf(p), "cache-control": "public, max-age=60", "x-content-type-options": "nosniff", "x-hosted-by": "GuardaWeb" },
      });
    }
  }
  return new Response("Ficheiro não encontrado", { status: 404 });
}

export async function userFromApiKey(req: Request) {
  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!key.startsWith("gw_live_")) return null;
  const sb = await admin();
  const { data } = await sb.from("api_keys").select("id,user_id").eq("key_hash", hashKey(key)).maybeSingle();
  if (!data) return null;
  await sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.user_id;
}
