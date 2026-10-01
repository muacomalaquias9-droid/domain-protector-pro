import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { putFile, removeFile, removeSite, checkDomain, newApiKey, hashKey, QUOTA_BYTES } from "./hosting.server";

export const HOST_TARGET = "digital-sherlock-api.lovable.app";

export const hostingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [{ data: sites }, { data: files }, { data: keys }] = await Promise.all([
      sb.from("hosted_sites").select("*").order("created_at", { ascending: false }),
      sb.from("site_files").select("id,site_id,path,size,content_type,updated_at").order("path"),
      sb.from("api_keys").select("id,name,prefix,last_used_at,created_at").order("created_at", { ascending: false }),
    ]);
    const used = (sites ?? []).reduce((a, s) => a + Number(s.storage_used), 0);
    return { sites: sites ?? [], files: files ?? [], keys: keys ?? [], used, quota: QUOTA_BYTES, target: HOST_TARGET };
  });

export const createSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const base = data.name.toLowerCase().normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").slice(0, 30) || "site";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { count } = await context.supabase.from("hosted_sites").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= 20) return { ok: false as const, error: "Máximo de 20 sites por conta" };
    const { data: row, error } = await context.supabase.from("hosted_sites").insert({ user_id: context.userId, name: data.name, slug }).select("*").single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, site: row };
  });

export const uploadSiteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteId: z.string().uuid(), path: z.string().min(1).max(300), base64: z.string().max(36_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const r = await putFile(context.userId, data.siteId, data.path, new Uint8Array(Buffer.from(data.base64, "base64")));
      return { ok: true as const, ...r };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

export const deleteSiteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteId: z.string().uuid(), path: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await removeFile(context.userId, data.siteId, data.path);
    return { ok: true };
  });

export const deleteSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await removeSite(context.userId, data.siteId);
    return { ok: true };
  });

export const setDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ siteId: z.string().uuid(), domain: z.string().trim().toLowerCase().regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Domínio inválido").max(253).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("hosted_sites").update({ custom_domain: data.domain, domain_verified: false }).eq("id", data.siteId);
    if (error) return { ok: false as const, error: error.code === "23505" ? "Este domínio já está ligado a outro site" : error.message };
    return { ok: true as const };
  });

export const verifyDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s } = await context.supabase.from("hosted_sites").select("custom_domain,verify_token").eq("id", data.siteId).single();
    if (!s?.custom_domain) return { ok: false as const, error: "Adicione primeiro um domínio" };
    const r = await checkDomain(s.custom_domain, s.verify_token, HOST_TARGET).catch(() => null);
    if (!r) return { ok: false as const, error: "Não foi possível consultar o DNS" };
    const verified = r.txtOk && r.cnameOk;
    await context.supabase.from("hosted_sites").update({ domain_verified: verified }).eq("id", data.siteId);
    return { ok: true as const, verified, ...r };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const key = newApiKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", context.userId);
    if ((count ?? 0) >= 10) return { ok: false as const, error: "Máximo de 10 chaves" };
    await supabaseAdmin.from("api_keys").insert({ user_id: context.userId, name: data.name, prefix: key.slice(0, 14), key_hash: hashKey(key) });
    return { ok: true as const, key };
  });
