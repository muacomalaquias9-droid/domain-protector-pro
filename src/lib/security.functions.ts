import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clientIp, ipInfo } from "./security.server";
import { analyzeSite } from "./scan.server";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

/** Login protegido: anti brute-force (por e-mail e IP) + bloqueio de VPN/proxy. */
export const secureLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const ip = clientIp();
    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();

    const [{ count: byEmail }, { count: byIp }] = await Promise.all([
      supabaseAdmin.from("login_attempts").select("id", { count: "exact", head: true }).eq("email", email).eq("success", false).gte("created_at", since),
      supabaseAdmin.from("login_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).eq("success", false).gte("created_at", since),
    ]);
    const log = (success: boolean, reason: string) => supabaseAdmin.from("login_attempts").insert({ email, ip, success, reason });

    if ((byEmail ?? 0) >= MAX_FAILS || (byIp ?? 0) >= MAX_FAILS * 2) {
      await log(false, "bloqueado");
      return { ok: false as const, error: `Demasiadas tentativas. Conta bloqueada por ${WINDOW_MIN} minutos.` };
    }

    const info = await ipInfo(ip);
    if (info.vpn || info.hosting) {
      await log(false, "vpn");
      return { ok: false as const, error: "Ligação por VPN, proxy ou servidor detetada. Desligue a VPN para entrar." };
    }

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: s, error } = await sb.auth.signInWithPassword({ email, password: data.password });
    if (error || !s.session) {
      await log(false, "senha");
      const left = MAX_FAILS - (byEmail ?? 0) - 1;
      return { ok: false as const, error: left > 0 ? `E-mail ou senha incorretos. Restam ${left} tentativas.` : `Conta bloqueada por ${WINDOW_MIN} minutos.` };
    }
    await log(true, "ok");
    await supabaseAdmin.from("user_sessions_ip").upsert({ user_id: s.user.id, ip, country: info.country, updated_at: new Date().toISOString() });
    return { ok: true as const, access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });

/** Verifica se o IP mudou desde o login ou se passou a usar VPN. */
export const checkSessionIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ip = clientIp();
    const { data: row } = await context.supabase.from("user_sessions_ip").select("ip").eq("user_id", context.userId).maybeSingle();
    const info = await ipInfo(ip);
    if (info.vpn || info.hosting) return { ok: false as const, reason: "vpn" as const, ip };
    if (!row) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("user_sessions_ip").upsert({ user_id: context.userId, ip, country: info.country, updated_at: new Date().toISOString() });
      return { ok: true as const, ip, country: info.country };
    }
    if (row.ip !== ip) return { ok: false as const, reason: "ip" as const, ip };
    return { ok: true as const, ip, country: info.country };
  });

/** Painel de segurança: tentativas recentes e auditoria do próprio site. */
export const securityOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = String(context.claims.email ?? "").toLowerCase();
    const { data } = await supabaseAdmin.from("login_attempts").select("ip,success,reason,created_at").eq("email", email).order("created_at", { ascending: false }).limit(15);
    const ip = clientIp();
    return { attempts: data ?? [], current: await ipInfo(ip) };
  });

export const auditOwnSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      return { ok: true as const, result: await analyzeSite("https://digital-sherlock-api.lovable.app") };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });
