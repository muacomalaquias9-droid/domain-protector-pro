// Server-only site analysis helpers.
const UA = "Mozilla/5.0 (compatible; GuardaWebScanner/1.0; +https://guardaweb.ao)";

async function timed(url: string, init: RequestInit = {}, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, headers: { "user-agent": UA, ...(init.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

async function json<T = any>(url: string, ms = 10000): Promise<T | null> {
  try {
    const r = await timed(url, { headers: { accept: "application/json, application/rdap+json" } }, ms);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export function normalizeUrl(input: string): URL {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  const u = new URL(s);
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
    h.includes(":")
  ) {
    throw new Error("Endereço não permitido");
  }
  if (!h.includes(".")) throw new Error("Domínio inválido");
  return u;
}

export type Finding = {
  id: string;
  category: "seguranca" | "seo" | "erros" | "dominio" | "servidor" | "spam";
  severity: "critico" | "alto" | "medio" | "baixo" | "ok";
  title: string;
  detail: string;
};

function rootDomain(host: string) {
  const parts = host.replace(/^www\./, "").split(".");
  const twoLevel = ["co", "com", "gov", "org", "edu", "net", "it", "ac"];
  if (parts.length > 2 && twoLevel.includes(parts[parts.length - 2] ?? "")) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

export async function rdapDomain(domain: string) {
  const d = await json<any>(`https://rdap.org/domain/${domain}`, 10000);
  if (!d) return null;
  const events: any[] = d.events || [];
  const created = events.find((e) => e.eventAction === "registration")?.eventDate ?? null;
  const expires = events.find((e) => e.eventAction === "expiration")?.eventDate ?? null;
  let registrar: string | null = null;
  let abuseEmail: string | null = null;
  const walk = (ents: any[]) => {
    for (const e of ents || []) {
      const roles: string[] = e.roles || [];
      const vcard = e.vcardArray?.[1] || [];
      const fn = vcard.find((v: any) => v[0] === "fn")?.[3];
      const email = vcard.find((v: any) => v[0] === "email")?.[3];
      if (roles.includes("registrar") && fn) registrar = fn;
      if (roles.includes("abuse") && email) abuseEmail = email;
      if (e.entities) walk(e.entities);
    }
  };
  walk(d.entities);
  return { registrar, abuseEmail, created, expires, status: (d.status || []) as string[], nameservers: (d.nameservers || []).map((n: any) => n.ldhName) as string[] };
}

export async function rdapIp(ip: string) {
  const d = await json<any>(`https://rdap.org/ip/${ip}`, 10000);
  if (!d) return null;
  let abuseEmail: string | null = null;
  const walk = (ents: any[]) => {
    for (const e of ents || []) {
      const email = (e.vcardArray?.[1] || []).find((v: any) => v[0] === "email")?.[3];
      if ((e.roles || []).includes("abuse") && email) abuseEmail = email;
      if (e.entities) walk(e.entities);
    }
  };
  walk(d.entities);
  return { name: d.name as string | null, abuseEmail };
}

async function dns(name: string, type: string): Promise<string[]> {
  const d = await json<any>(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, 8000);
  return (d?.Answer || []).map((a: any) => String(a.data).replace(/^"|"$/g, ""));
}

async function cert(domain: string) {
  const list = await json<any[]>(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&exclude=expired`, 15000);
  if (!list || !list.length) return null;
  const latest = list.sort((a, b) => +new Date(b.not_before) - +new Date(a.not_before))[0];
  const issuer = /O=([^,]+)/.exec(latest.issuer_name)?.[1] ?? latest.issuer_name;
  return { issuer, validFrom: latest.not_before, validTo: latest.not_after, commonName: latest.common_name };
}

const SPAM_WORDS = [
  "casino", "viagra", "cialis", "free bitcoin", "crypto giveaway", "verify your account", "confirme a sua conta",
  "ganhe dinheiro", "you have won", "ganhou um prémio", "clique aqui para ganhar", "porn", "xxx", "loan approved",
  "atualize seus dados bancários", "senha do banco", "urgent action required",
];
const BRANDS = ["paypal", "apple", "microsoft", "facebook", "instagram", "bai", "bfa", "unitel", "multicaixa", "netflix", "google", "whatsapp", "amazon"];
const BAD_TLDS = ["xyz", "top", "click", "gq", "tk", "ml", "cf", "ga", "work", "loan", "zip", "mov", "rest", "cam"];

export async function analyzeSite(input: string) {
  const url = normalizeUrl(input);
  const host = url.hostname.toLowerCase();
  const domain = rootDomain(host);
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  const started = Date.now();
  let res: Response | null = null;
  let html = "";
  let fetchError: string | null = null;
  try {
    res = await timed(url.toString(), { redirect: "follow" }, 15000);
    html = (await res.text()).slice(0, 800_000);
  } catch (e) {
    if (url.protocol === "https:") {
      try {
        const alt = new URL(url.toString());
        alt.protocol = "http:";
        res = await timed(alt.toString(), { redirect: "follow" }, 15000);
        html = (await res.text()).slice(0, 800_000);
        add({ id: "tls-fail", category: "seguranca", severity: "critico", title: "HTTPS indisponível ou certificado inválido", detail: "O site só respondeu por HTTP. A ligação não é cifrada." });
      } catch (e2) {
        fetchError = (e2 as Error).message;
      }
    } else fetchError = (e as Error).message;
  }
  const responseMs = Date.now() - started;

  const [aRec, mxRec, txtRec, dmarcRec, rdap, certificate] = await Promise.all([
    dns(host, "A"), dns(domain, "MX"), dns(domain, "TXT"), dns(`_dmarc.${domain}`, "TXT"), rdapDomain(domain), cert(domain),
  ]);
  const ip = aRec.find((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x)) ?? null;
  const [hosting, ipRdap] = await Promise.all([
    ip ? json<any>(`https://ipwho.is/${ip}`, 8000) : Promise.resolve(null),
    ip ? rdapIp(ip) : Promise.resolve(null),
  ]);

  if (fetchError || !res) {
    add({ id: "offline", category: "erros", severity: "critico", title: "Site inacessível", detail: `Não foi possível ligar ao site: ${fetchError ?? "sem resposta"}` });
  }

  const h = res?.headers;
  const finalUrl = res?.url || url.toString();
  if (res) {
    if (res.status >= 500) add({ id: "5xx", category: "erros", severity: "critico", title: `Erro do servidor (${res.status})`, detail: "O servidor devolveu um erro interno." });
    else if (res.status >= 400) add({ id: "4xx", category: "erros", severity: "alto", title: `Página com erro (${res.status})`, detail: "A página principal devolve um código de erro." });
    else add({ id: "status", category: "erros", severity: "ok", title: `Resposta ${res.status} em ${responseMs} ms`, detail: "A página principal carrega corretamente." });
    if (responseMs > 3000) add({ id: "slow", category: "erros", severity: "medio", title: "Carregamento lento", detail: `A resposta demorou ${(responseMs / 1000).toFixed(1)} s. O ideal é menos de 1 s.` });

    if (finalUrl.startsWith("https://")) add({ id: "https", category: "seguranca", severity: "ok", title: "HTTPS ativo", detail: "A ligação é cifrada." });
    else if (!findings.find((f) => f.id === "tls-fail")) add({ id: "no-https", category: "seguranca", severity: "critico", title: "Sem HTTPS", detail: "O site não redireciona para HTTPS." });

    const secHeaders: [string, string, Finding["severity"]][] = [
      ["strict-transport-security", "HSTS em falta — permite ataques de downgrade para HTTP.", "alto"],
      ["content-security-policy", "Content-Security-Policy em falta — maior risco de XSS e injeção de scripts.", "alto"],
      ["x-frame-options", "X-Frame-Options em falta — o site pode ser embutido para clickjacking.", "medio"],
      ["x-content-type-options", "X-Content-Type-Options em falta — permite MIME sniffing.", "medio"],
      ["referrer-policy", "Referrer-Policy em falta — pode vazar URLs para terceiros.", "baixo"],
      ["permissions-policy", "Permissions-Policy em falta — câmara/microfone/localização não restritos.", "baixo"],
    ];
    for (const [name, msg, sev] of secHeaders) {
      if (h!.get(name)) add({ id: `h-${name}`, category: "seguranca", severity: "ok", title: `${name} presente`, detail: h!.get(name)!.slice(0, 140) });
      else add({ id: `h-${name}`, category: "seguranca", severity: sev, title: `Cabeçalho ${name} ausente`, detail: msg });
    }
    const server = h!.get("server");
    const powered = h!.get("x-powered-by");
    if (powered) add({ id: "powered", category: "servidor", severity: "medio", title: "Tecnologia exposta (X-Powered-By)", detail: `O servidor revela: ${powered}. Facilita ataques direcionados.` });
    if (server && /\d/.test(server)) add({ id: "server-ver", category: "servidor", severity: "medio", title: "Versão do servidor exposta", detail: `Cabeçalho Server: ${server}` });
    const cookies = h!.get("set-cookie");
    if (cookies) {
      if (!/secure/i.test(cookies)) add({ id: "cookie-secure", category: "seguranca", severity: "alto", title: "Cookies sem flag Secure", detail: "Cookies podem ser enviados por HTTP e intercetados." });
      if (!/httponly/i.test(cookies)) add({ id: "cookie-http", category: "seguranca", severity: "medio", title: "Cookies sem HttpOnly", detail: "Scripts maliciosos podem ler os cookies." });
    }
    if (h!.get("access-control-allow-origin") === "*") add({ id: "cors", category: "seguranca", severity: "medio", title: "CORS aberto (*)", detail: "Qualquer origem pode ler respostas deste domínio." });
  }

  // HTML / SEO
  const lower = html.toLowerCase();
  const pick = (re: RegExp) => re.exec(html)?.[1]?.trim() ?? null;
  const title = pick(/<title[^>]*>([^<]*)<\/title>/i);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ?? pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((i) => !/\balt=/i.test(i)).length;
  const generator = pick(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i);
  if (html) {
    if (!title) add({ id: "title", category: "seo", severity: "alto", title: "Título da página em falta", detail: "Sem <title>, o Google não sabe como apresentar o site." });
    else if (title.length < 10 || title.length > 65) add({ id: "title", category: "seo", severity: "medio", title: "Título com tamanho inadequado", detail: `"${title}" tem ${title.length} caracteres (ideal 10–65).` });
    else add({ id: "title", category: "seo", severity: "ok", title: "Título adequado", detail: title });
    if (!desc) add({ id: "desc", category: "seo", severity: "alto", title: "Meta description em falta", detail: "Os resultados de pesquisa ficam sem resumo." });
    else if (desc.length < 50 || desc.length > 160) add({ id: "desc", category: "seo", severity: "baixo", title: "Meta description fora do ideal", detail: `${desc.length} caracteres (ideal 50–160).` });
    else add({ id: "desc", category: "seo", severity: "ok", title: "Meta description adequada", detail: desc });
    if (h1 === 0) add({ id: "h1", category: "seo", severity: "medio", title: "Sem título H1", detail: "A página não tem cabeçalho principal." });
    else if (h1 > 1) add({ id: "h1", category: "seo", severity: "baixo", title: `${h1} títulos H1`, detail: "Recomenda-se apenas um H1 por página." });
    if (noAlt > 0) add({ id: "alt", category: "seo", severity: "baixo", title: `${noAlt} imagens sem texto alternativo`, detail: "Prejudica acessibilidade e pesquisa de imagens." });
    if (!/<meta[^>]+name=["']viewport/i.test(html)) add({ id: "viewport", category: "seo", severity: "alto", title: "Não otimizado para telemóvel", detail: "Falta a meta viewport." });
    if (!/<link[^>]+rel=["']canonical/i.test(html)) add({ id: "canonical", category: "seo", severity: "baixo", title: "Sem URL canónica", detail: "Pode gerar conteúdo duplicado." });
    if (!/property=["']og:title/i.test(html)) add({ id: "og", category: "seo", severity: "baixo", title: "Sem Open Graph", detail: "Partilhas em redes sociais ficam sem pré-visualização." });
    if (!/<html[^>]+lang=/i.test(html)) add({ id: "lang", category: "seo", severity: "baixo", title: "Idioma não declarado", detail: "Falta o atributo lang no <html>." });
    if (finalUrl.startsWith("https://") && /(src|href)=["']http:\/\//i.test(html)) add({ id: "mixed", category: "seguranca", severity: "medio", title: "Conteúdo misto", detail: "Recursos carregados por HTTP numa página HTTPS." });
    if (/<form[^>]*action=["']http:\/\//i.test(html)) add({ id: "form-http", category: "seguranca", severity: "critico", title: "Formulário envia dados sem cifra", detail: "Um formulário submete para um endereço HTTP." });
    const jq = /jquery[.-]?(\d)\.(\d+)/i.exec(html);
    if (jq && (Number(jq[1]) < 3 || (Number(jq[1]) === 3 && Number(jq[2]) < 5))) add({ id: "jquery", category: "seguranca", severity: "alto", title: `jQuery desatualizado (${jq[1]}.${jq[2]})`, detail: "Versões antigas têm vulnerabilidades XSS conhecidas." });
    if (generator) add({ id: "gen", category: "servidor", severity: /\d/.test(generator) ? "medio" : "baixo", title: "CMS identificado", detail: `Gerador: ${generator}. Mantenha-o sempre atualizado.` });
  }

  // Exposed files
  const base = new URL(finalUrl).origin;
  const probes = await Promise.all(
    [
      ["/robots.txt", "robots"], ["/sitemap.xml", "sitemap"], ["/.git/HEAD", "git"], ["/.env", "env"], ["/wp-login.php", "wp"], ["/phpinfo.php", "phpinfo"],
    ].map(async ([p, k]) => {
      try {
        const r = await timed(base + p, { redirect: "manual" }, 7000);
        const body = r.status === 200 ? (await r.text()).slice(0, 2000) : "";
        return { k, ok: r.status === 200, body };
      } catch {
        return { k, ok: false, body: "" };
      }
    }),
  );
  const probe = (k: string) => probes.find((p) => p.k === k)!;
  if (html) {
    if (!probe("robots").ok) add({ id: "robots", category: "seo", severity: "baixo", title: "robots.txt em falta", detail: "Os motores de busca não têm instruções de rastreio." });
    if (!probe("sitemap").ok || !/<urlset|<sitemapindex/i.test(probe("sitemap").body)) add({ id: "sitemap", category: "seo", severity: "medio", title: "sitemap.xml em falta", detail: "Dificulta a indexação completa do site." });
  }
  if (probe("git").ok && /ref:/.test(probe("git").body)) add({ id: "git", category: "seguranca", severity: "critico", title: "Repositório .git exposto", detail: "O código-fonte pode ser descarregado por qualquer pessoa." });
  if (probe("env").ok && /[A-Z_]+=/.test(probe("env").body) && !/<html/i.test(probe("env").body)) add({ id: "env", category: "seguranca", severity: "critico", title: "Ficheiro .env exposto", detail: "Senhas e chaves do servidor estão públicas." });
  if (probe("phpinfo").ok && /phpinfo|PHP Version/i.test(probe("phpinfo").body)) add({ id: "phpinfo", category: "seguranca", severity: "alto", title: "phpinfo() público", detail: "Expõe configuração completa do servidor." });
  if (probe("wp").ok && /wp-submit|user_login/i.test(probe("wp").body)) add({ id: "wp", category: "servidor", severity: "baixo", title: "Login WordPress público", detail: "/wp-login.php acessível — alvo comum de força bruta." });

  // Email / DNS
  const spf = txtRec.find((t) => t.startsWith("v=spf1"));
  const dmarc = dmarcRec.find((t) => t.startsWith("v=DMARC1"));
  if (mxRec.length) {
    if (!spf) add({ id: "spf", category: "dominio", severity: "alto", title: "Sem registo SPF", detail: "Qualquer pessoa pode enviar e-mails a fingir ser este domínio." });
    else add({ id: "spf", category: "dominio", severity: "ok", title: "SPF configurado", detail: spf });
    if (!dmarc) add({ id: "dmarc", category: "dominio", severity: "alto", title: "Sem política DMARC", detail: "Domínio vulnerável a phishing por falsificação de remetente." });
    else add({ id: "dmarc", category: "dominio", severity: "ok", title: "DMARC configurado", detail: dmarc });
  }

  // Domain age & cert
  let ageDays: number | null = null;
  if (rdap?.created) {
    ageDays = Math.floor((Date.now() - +new Date(rdap.created)) / 86400000);
    if (ageDays < 30) add({ id: "age", category: "dominio", severity: "alto", title: `Domínio muito recente (${ageDays} dias)`, detail: "Domínios novos são frequentemente usados em fraudes." });
  }
  if (rdap?.expires) {
    const left = Math.floor((+new Date(rdap.expires) - Date.now()) / 86400000);
    if (left < 30) add({ id: "expire", category: "dominio", severity: "alto", title: `Domínio expira em ${left} dias`, detail: "Renove para evitar que seja sequestrado." });
  }
  if (certificate) {
    const left = Math.floor((+new Date(certificate.validTo) - Date.now()) / 86400000);
    if (left < 15) add({ id: "cert-exp", category: "seguranca", severity: "alto", title: `Certificado expira em ${left} dias`, detail: `Emitido por ${certificate.issuer}.` });
    else add({ id: "cert", category: "seguranca", severity: "ok", title: "Certificado SSL válido", detail: `Emitido por ${certificate.issuer}, válido até ${certificate.validTo.slice(0, 10)}.` });
  }

  // Spam / phishing heuristics
  let spamScore = 0;
  const reasons: string[] = [];
  const hits = SPAM_WORDS.filter((w) => lower.includes(w));
  if (hits.length) { spamScore += hits.length * 15; reasons.push(`Palavras suspeitas: ${hits.slice(0, 5).join(", ")}`); }
  const tld = host.split(".").pop()!;
  if (BAD_TLDS.includes(tld)) { spamScore += 20; reasons.push(`Extensão .${tld} frequentemente usada em abuso`); }
  if ((host.match(/-/g) || []).length >= 3) { spamScore += 15; reasons.push("Muitos hífenes no domínio"); }
  const brand = BRANDS.find((b) => host.includes(b) && !domain.startsWith(b + "."));
  if (brand) { spamScore += 30; reasons.push(`Imita a marca "${brand}"`); }
  if (ageDays !== null && ageDays < 30) { spamScore += 25; reasons.push("Domínio registado há menos de 30 dias"); }
  if (/type=["']password["']/i.test(html) && !finalUrl.startsWith("https://")) { spamScore += 30; reasons.push("Pede senha sem HTTPS"); }
  if (/<iframe[^>]+(width|height)=["']?0/i.test(html)) { spamScore += 15; reasons.push("Iframes ocultos"); }
  if (/eval\(unescape|document\.write\(unescape|atob\(["'][A-Za-z0-9+/=]{200,}/i.test(html)) { spamScore += 25; reasons.push("Código JavaScript ofuscado"); }
  spamScore = Math.min(100, spamScore);
  const verdict = spamScore >= 50 ? "perigoso" : spamScore >= 25 ? "suspeito" : "legitimo";
  add({
    id: "spam", category: "spam",
    severity: verdict === "perigoso" ? "critico" : verdict === "suspeito" ? "medio" : "ok",
    title: verdict === "perigoso" ? "Provável spam / phishing" : verdict === "suspeito" ? "Sinais suspeitos" : "Sem sinais de spam",
    detail: reasons.length ? reasons.join(" · ") : "Nenhum padrão de spam, phishing ou fraude foi detetado.",
  });

  const weights = { critico: 20, alto: 10, medio: 5, baixo: 2, ok: 0 } as const;
  const score = Math.max(0, 100 - findings.reduce((s, f) => s + weights[f.severity], 0));

  return {
    url: url.toString(), finalUrl, host, domain, score, responseMs,
    status: res?.status ?? null, title, description: desc,
    spam: { score: spamScore, verdict, reasons },
    domainInfo: rdap,
    certificate,
    server: {
      ip, software: h?.get("server") ?? null, poweredBy: h?.get("x-powered-by") ?? null,
      isp: hosting?.connection?.isp ?? hosting?.connection?.org ?? ipRdap?.name ?? null,
      country: hosting?.country ?? null, city: hosting?.city ?? null, asn: hosting?.connection?.asn ?? null,
      abuseEmail: ipRdap?.abuseEmail ?? null,
    },
    dns: { a: aRec, mx: mxRec, spf: spf ?? null, dmarc: dmarc ?? null },
    findings,
    scannedAt: new Date().toISOString(),
  };
}

export type ScanResult = Awaited<ReturnType<typeof analyzeSite>>;
