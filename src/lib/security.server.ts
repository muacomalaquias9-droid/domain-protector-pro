import { getRequestHeader } from "@tanstack/react-start/server";

export function clientIp(): string {
  const h = (n: string) => getRequestHeader(n) ?? "";
  const ip = h("cf-connecting-ip") || h("x-real-ip") || h("x-forwarded-for").split(",")[0] || "";
  return ip.trim() || "desconhecido";
}

export type IpInfo = { ip: string; country: string | null; isp: string | null; vpn: boolean; hosting: boolean };

export async function ipInfo(ip: string): Promise<IpInfo> {
  const base: IpInfo = { ip, country: null, isp: null, vpn: false, hosting: false };
  if (!/^[0-9a-f.:]+$/i.test(ip) || ip === "127.0.0.1" || ip === "::1") return base;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,isp,proxy,hosting`, { signal: ctrl.signal });
    clearTimeout(t);
    const j: any = await r.json();
    if (j.status !== "success") return base;
    return { ip, country: j.country ?? null, isp: j.isp ?? null, vpn: !!j.proxy, hosting: !!j.hosting };
  } catch {
    return base;
  }
}
