import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import JSZip from "jszip";
import { toast } from "sonner";
import { ExternalLink, FileArchive, Loader2, Rocket, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startBuildDeploy, buildStatus } from "@/lib/build.functions";

const SKIP = /(^|\/)(node_modules|\.git|\.next|dist|build|\.vercel)\//;

async function zipToFiles(file: File) {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n]!.dir && !SKIP.test(n) && !n.startsWith("__MACOSX"));
  // Strip a single top-level folder (common when zipping a project folder).
  const tops = new Set(names.map((n) => n.split("/")[0]));
  const strip = tops.size === 1 && names.every((n) => n.includes("/")) ? `${[...tops][0]}/` : "";
  return Promise.all(names.map(async (n) => ({ file: n.slice(strip.length), data: await zip.files[n]!.async("base64") })));
}

export function BuildDeployView() {
  const deploy = useServerFn(startBuildDeploy);
  const status = useServerFn(buildStatus);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [zip, setZip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  async function poll(id: string): Promise<string | undefined> {
    for (let i = 0; i < 120; i++) {
      const s = await status({ data: { id } });
      setState(s.state); setLogs(s.logs); if (s.url) setUrl(s.url);
      if (s.state === "READY" || s.state === "ERROR" || s.state === "CANCELED") return s.state;
      await new Promise((r) => setTimeout(r, 4000));
    }
    return undefined;
  }

  async function onDeploy() {
    if (!zip) return;
    setBusy(true); setLogs([]); setUrl(null); setState("A preparar ficheiros");
    try {
      const files = await zipToFiles(zip);
      if (!files.length) throw new Error("O ZIP está vazio.");
      const r = await deploy({ data: { name, files } });
      if (!r.ok) throw new Error(r.error);
      setUrl(r.url); setState("QUEUED");
      const final = await poll(r.id);
      final === "READY" ? toast.success("Site publicado") : toast.error("O deploy falhou — veja o registo");
    } catch (e) {
      toast.error((e as Error).message); setState(null);
    } finally { setBusy(false); }
  }

  const label: Record<string, string> = { QUEUED: "Na fila", BUILDING: "A instalar e compilar", INITIALIZING: "A iniciar", READY: "Online", ERROR: "Erro", CANCELED: "Cancelado" };

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card/65 p-5 shadow-glass backdrop-blur-2xl sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-background/60"><Rocket /></span>
        <div>
          <h2 className="text-xl font-extrabold">Deploy com compilação</h2>
          <p className="text-sm text-muted-foreground">React, Next.js, Vue, Svelte, Node, HTML e mais. Instalamos as dependências e compilamos por si.</p>
        </div>
      </div>
      <input className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3.5 outline-none focus:border-primary" placeholder="nome-do-projeto" value={name} onChange={(e) => setName(e.target.value.toLowerCase())} />
      <input ref={inputRef} type="file" accept=".zip" hidden onChange={(e) => setZip(e.target.files?.[0] ?? null)} />
      <Button type="button" variant="outline" className="h-14 w-full justify-start rounded-2xl" onClick={() => inputRef.current?.click()}>
        <FileArchive /> {zip ? `${zip.name} (${(zip.size / 1048576).toFixed(1)} MB)` : "Escolher ficheiro ZIP do projeto"}
      </Button>
      <Button disabled={busy || !zip || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(name)} onClick={onDeploy} className="h-14 w-full rounded-2xl text-base font-bold">
        {busy ? <Loader2 className="animate-spin" /> : <Rocket />} Fazer deploy
      </Button>
      {state && <p className="text-sm font-bold">Estado: {label[state] ?? state}</p>}
      {url && state === "READY" && <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold underline"><ExternalLink size={16} /> {url}</a>}
      {logs.length > 0 && (
        <pre className="max-h-64 overflow-auto rounded-2xl bg-muted/60 p-3 text-xs"><Terminal size={14} className="mb-1" />{logs.join("\n")}</pre>
      )}
    </section>
  );
}
