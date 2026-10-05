import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeSite, normalizeUrl, rdapDomain, rdapIp } from "./scan.server";

export const runScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const result = await analyzeSite(data.url);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const dom = result.host.replace(/^www\./, "");
      const { data: ban } = await supabaseAdmin.from("blocked_domains").select("reason").eq("domain", dom).maybeSingle();
      let banned = ban?.reason ?? null;
      if (!banned && result.spam.score >= 50) {
        banned = `Banido automaticamente: ${result.spam.reasons.slice(0, 3).join(" · ")}`;
        await supabaseAdmin.from("blocked_domains").upsert({ domain: dom, reason: banned, spam_score: result.spam.score });
      }
      const { data: row, error } = await context.supabase
        .from("scans")
        .insert({ user_id: context.userId, url: result.host, score: result.score, result: { ...result, banned } as any })
        .select("id")
        .single();
      if (error) console.error(error);
      return { ok: true as const, id: row?.id ?? null, result, banned };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message || "Falha na análise" };
    }
  });

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        url: z.string().trim().min(3).max(500),
        category: z.enum(["phishing", "burla", "spam", "malware", "conteudo_sensivel", "roubo_identidade"]),
        description: z.string().trim().min(10).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let host: string;
    try {
      host = normalizeUrl(data.url).hostname.replace(/^www\./, "");
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
    const rdap = await rdapDomain(host.split(".").slice(-2).join("."));
    let hostAbuse: string | null = null;
    let hostName: string | null = null;
    try {
      const r = await fetch(`https://dns.google/resolve?name=${host}&type=A`);
      const j: any = await r.json();
      const ip = (j.Answer || []).map((a: any) => a.data).find((x: string) => /^\d+\.\d+\.\d+\.\d+$/.test(x));
      if (ip) {
        const ipr = await rdapIp(ip);
        hostAbuse = ipr?.abuseEmail ?? null;
        hostName = ipr?.name ?? null;
      }
    } catch {}
    const abuse = [rdap?.abuseEmail, hostAbuse].filter(Boolean).join(", ") || null;
    const { error } = await context.supabase.from("reports").insert({
      user_id: context.userId,
      url: data.url,
      domain: host,
      category: data.category,
      description: data.description,
      registrar: rdap?.registrar ?? hostName,
      abuse_email: abuse,
    });
    if (error) return { ok: false as const, error: "Não foi possível registar a denúncia" };
    {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("domain", host);
      if ((count ?? 0) >= 3) {
        await supabaseAdmin.from("blocked_domains").upsert({ domain: host, reason: `Banido após ${count} denúncias da comunidade (${data.category})`, reports: count ?? 0, updated_at: new Date().toISOString() });
      }
    }
    return { ok: true as const, domain: host, registrar: rdap?.registrar ?? null, registrarAbuse: rdap?.abuseEmail ?? null, hostName, hostAbuse };
  });

export const lookupDocument = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ type: z.enum(["nif", "bi"]), number: z.string().trim().regex(/^[A-Za-z0-9]{6,20}$/) }).parse(d))
  .handler(async ({ data }) => {
    const n = data.number.toUpperCase();
    if (data.type === "bi" && !/^\d{9}[A-Z]{2}\d{3}$/.test(n)) return { ok: false as const, error: "Formato de BI inválido (ex.: 001234567LA041)" };
    if (data.type === "nif" && !/^(\d{10}|\d{9}[A-Z]{2}\d{3})$/.test(n)) return { ok: false as const, error: "Formato de NIF inválido (10 dígitos ou nº do BI)" };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      // Base de contribuintes da AGT (para pessoas singulares, o NIF é o nº do BI)
      const r = await fetch(`https://invoice.minfin.gov.ao/commonServer/common/taxpayer/get/${encodeURIComponent(n)}`, { signal: ctrl.signal });
      const j: any = await r.json().catch(() => null);
      if (!j) return { ok: false as const, error: "Serviço da AGT indisponível" };
      if (!j.success || !j.data) return { ok: false as const, error: "Documento não encontrado na base da AGT" };
      const d = j.data;
      const isCompany = /^\d{10}$/.test(n) && n.startsWith("5");
      return {
        ok: true as const,
        data: {
          name: String(d.gsmc ?? ""),
          birthDate: String(d.birthDate ?? d.birth_date ?? d.dataNascimento ?? d.dtNascimento ?? d.csrq ?? d.csny ?? ""),
          company: isCompany || data.type === "bi" ? String(d.gsmc ?? "") : "",
          address: String(d.nsrdz ?? ""),
          status: String(d.hdzt ?? ""),
        },
      };
    } catch {
      return { ok: false as const, error: "A AGT demorou demasiado. Tente novamente." };
    } finally {
      clearTimeout(t);
    }
  });
