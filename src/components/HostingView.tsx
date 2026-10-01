import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Upload, Trash2, Globe, KeyRound, Copy, CheckCircle2, AlertTriangle, ExternalLink, HardDrive, Loader2, FileCode2, Server } from "lucide-react";
import { hostingOverview, createSite, uploadSiteFile, deleteSiteFile, deleteSite, setDomain, verifyDomain, createApiKey } from "@/lib/hosting.functions";

type Data = Awaited<ReturnType<typeof hostingOverview>>;
const fmt = (b: number) => (b > 1e9 ? (b / 1e9).toFixed(2) + " GB" : b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : (b / 1e3).toFixed(1) + " KB");
const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado"); };

function toB64(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function HostingView() {
  const load = useServerFn(hostingOverview);
  const [d, setD] = useState<Data | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const refresh = () => load().then((r) => { setD(r); setSel((s) => s ?? r.sites[0]?.id ?? null); });
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  if (!d) return <div className="grid h-64 place-items-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  const pct = Math.min(100, (d.used / d.quota) * 100);
  const site = d.sites.find((s) => s.id === sel) ?? null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Server} label="Sites alojados" value={String(d.sites.length)} />
        <Stat icon={FileCode2} label="Ficheiros" value={String(d.files.length)} />
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><HardDrive size={16} /> Armazenamento</p>
          <p className="mt-2 text-2xl font-extrabold">{fmt(d.used)} <span className="text-base font-semibold text-muted-foreground">/ 5 GB</span></p>
          <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(pct, 1)}%` }} /></div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <SiteList d={d} sel={sel} setSel={setSel} onChange={refresh} />
        {site ? <SiteDetail key={site.id} site={site} files={d.files.filter((f) => f.site_id === site.id)} target={d.target} origin={origin} onChange={refresh} /> : (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">Crie o seu primeiro site para começar.</div>
        )}
      </div>

      <ApiKeys d={d} origin={origin} onChange={refresh} />
    </div>
  );
}

function Stat({ icon: I, label, value }: { icon: typeof Server; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><I size={16} /> {label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function SiteList({ d, sel, setSel, onChange }: { d: Data; sel: string | null; setSel: (s: string) => void; onChange: () => void }) {
  const create = useServerFn(createSite);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const r = await create({ data: { name } }); setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        setName(""); setSel(r.site.id); onChange();
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do site" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        <button disabled={busy || name.length < 2} className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50" aria-label="Criar site"><Plus size={20} /></button>
      </form>
      <ul className="mt-4 space-y-1">
        {d.sites.map((s) => (
          <li key={s.id}>
            <button onClick={() => setSel(s.id)} className={`w-full rounded-xl px-3 py-2.5 text-left ${sel === s.id ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}>
              <p className="truncate font-bold">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">{s.custom_domain ?? `/h/${s.slug}`} · {fmt(Number(s.storage_used))}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SiteDetail({ site, files, target, origin, onChange }: { site: Data["sites"][number]; files: Data["files"]; target: string; origin: string; onChange: () => void }) {
  const upload = useServerFn(uploadSiteFile);
  const delFile = useServerFn(deleteSiteFile);
  const delSite = useServerFn(deleteSite);
  const saveDomain = useServerFn(setDomain);
  const verify = useServerFn(verifyDomain);
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [domain, setDomainInput] = useState(site.custom_domain ?? "");
  const [check, setCheck] = useState<{ txtOk: boolean; cnameOk: boolean } | null>(null);
  const url = `${origin}/h/${site.slug}/`;

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    let ok = 0;
    for (const [i, f] of Array.from(list).entries()) {
      const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath?.split("/").slice(1).join("/") || f.name;
      setProgress(`${i + 1}/${list.length} · ${path}`);
      const r = await upload({ data: { siteId: site.id, path, base64: await toB64(f) } });
      if (r.ok) ok++; else toast.error(`${path}: ${r.error}`);
    }
    setProgress(null); toast.success(`${ok} ficheiro(s) publicados`); onChange();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold">{site.name}</h2>
            <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-sm font-semibold text-primary">{url} <ExternalLink size={14} /></a>
          </div>
          <button onClick={async () => { if (!confirm(`Apagar "${site.name}" e todos os ficheiros?`)) return; await delSite({ data: { siteId: site.id } }); onChange(); }} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10"><Trash2 size={16} /> Apagar</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button onClick={() => { input.current?.removeAttribute("webkitdirectory"); input.current?.click(); }} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground"><Upload size={18} /> Enviar ficheiros</button>
          <button onClick={() => { input.current?.setAttribute("webkitdirectory", ""); input.current?.click(); }} className="flex items-center justify-center gap-2 rounded-xl border-2 border-border px-4 py-3 font-bold"><Upload size={18} /> Enviar pasta inteira</button>
          <input ref={input} type="file" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </div>
        {progress && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {progress}</p>}
        <p className="mt-3 text-xs text-muted-foreground">Inclua um ficheiro index.html. Aceita HTML, CSS, JavaScript, imagens, fontes e sites gerados por React, Vue, Angular, Next (export), Hugo, etc. Máx. 25 MB por ficheiro.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-lg font-extrabold"><Globe size={20} /> Domínio próprio</h3>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => {
          e.preventDefault();
          const r = await saveDomain({ data: { siteId: site.id, domain: domain.trim() || null } });
          if (!r.ok) { toast.error(r.error); return; }
          toast.success("Domínio guardado"); setCheck(null); onChange();
        }}>
          <input value={domain} onChange={(e) => setDomainInput(e.target.value)} placeholder="www.meusite.ao" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5" />
          <button className="rounded-xl bg-navy px-4 py-2.5 font-bold text-primary-foreground">Guardar</button>
        </form>
        {site.custom_domain && (
          <>
            <p className="mt-4 text-sm font-semibold">Adicione estes registos DNS no painel onde comprou o domínio:</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Tipo</th><th>Nome</th><th>Valor</th><th /></tr></thead>
                <tbody className="font-mono">
                  <tr className="border-t border-border"><td className="py-2 font-bold">CNAME</td><td>{site.custom_domain}</td><td className="break-all">{target}</td><td><button onClick={() => copy(target)} aria-label="Copiar"><Copy size={14} /></button></td></tr>
                  <tr className="border-t border-border"><td className="py-2 font-bold">TXT</td><td>_guardaweb.{site.custom_domain}</td><td className="break-all">{site.verify_token}</td><td><button onClick={() => copy(site.verify_token)} aria-label="Copiar"><Copy size={14} /></button></td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={async () => {
                const r = await verify({ data: { siteId: site.id } });
                if (!r.ok) { toast.error(r.error); return; }
                setCheck(r); r.verified ? toast.success("Domínio verificado") : toast.error("DNS ainda não está correto"); onChange();
              }} className="rounded-xl border-2 border-border px-4 py-2 font-bold">Verificar DNS</button>
              {site.domain_verified
                ? <span className="flex items-center gap-1.5 font-bold text-success"><CheckCircle2 size={18} /> Verificado</span>
                : <span className="flex items-center gap-1.5 font-bold text-warning"><AlertTriangle size={18} /> A aguardar DNS</span>}
              {check && <span className="text-sm text-muted-foreground">CNAME {check.cnameOk ? "✓" : "✗"} · TXT {check.txtOk ? "✓" : "✗"}</span>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">A propagação do DNS pode demorar até 24 horas.</p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <h3 className="border-b border-border px-5 py-4 text-lg font-extrabold">Ficheiros ({files.length})</h3>
        {files.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Ainda sem ficheiros.</p> : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <FileCode2 size={16} className="shrink-0 text-muted-foreground" />
                <a href={`${url}${f.path}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-mono hover:text-primary">{f.path}</a>
                <span className="text-xs text-muted-foreground">{fmt(Number(f.size))}</span>
                <button onClick={async () => { await delFile({ data: { siteId: site.id, path: f.path } }); onChange(); }} className="text-muted-foreground hover:text-destructive" aria-label="Apagar"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ApiKeys({ d, origin, onChange }: { d: Data; origin: string; onChange: () => void }) {
  const create = useServerFn(createApiKey);
  const [fresh, setFresh] = useState<string | null>(null);
  const siteId = d.sites[0]?.id ?? "ID_DO_SITE";
  const curl = `curl -X POST ${origin}/api/public/v1/deploy \\
  -H "Authorization: Bearer ${fresh ?? "gw_live_..."}" \\
  -H "Content-Type: application/json" \\
  -d '{"site_id":"${siteId}","files":[{"path":"index.html","content":"<h1>Olá</h1>"}]}'`;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex flex-1 items-center gap-2 text-lg font-extrabold"><KeyRound size={20} /> API pública de deploy</h3>
        <button onClick={async () => { const r = await create({ data: { name: "Chave " + (d.keys.length + 1) } }); if (!r.ok) { toast.error(r.error); return; } setFresh(r.key); onChange(); }} className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">Nova chave</button>
      </div>
      {fresh && (
        <div className="mt-4 rounded-xl border-2 border-warning bg-warning/10 p-4">
          <p className="text-sm font-bold">Guarde esta chave agora — não voltará a ser mostrada.</p>
          <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-sm">{fresh}</code><button onClick={() => copy(fresh)} aria-label="Copiar"><Copy size={16} /></button></div>
        </div>
      )}
      <ul className="mt-4 divide-y divide-border text-sm">
        {d.keys.map((k) => <li key={k.id} className="flex gap-3 py-2"><span className="font-mono">{k.prefix}…</span><span className="text-muted-foreground">{k.name}</span><span className="ml-auto text-xs text-muted-foreground">{k.last_used_at ? "Usada " + new Date(k.last_used_at).toLocaleDateString("pt-PT") : "Nunca usada"}</span></li>)}
      </ul>
      <p className="mt-4 text-sm font-semibold">Endpoints</p>
      <ul className="mt-1 space-y-1 font-mono text-xs text-muted-foreground">
        <li>GET  /api/public/v1/sites — lista os seus sites</li>
        <li>POST /api/public/v1/deploy — publica ficheiros (utf8 ou base64, até 200 por pedido)</li>
      </ul>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-navy p-4 text-xs text-primary-foreground">{curl}</pre>
    </div>
  );
}
