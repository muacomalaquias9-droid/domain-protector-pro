import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, MonitorSmartphone, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accessDevice } from "@/lib/security.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Aceder neste dispositivo — GuardaWeb" },
      { name: "description", content: "Abra a GuardaWeb com o ID seguro guardado no seu dispositivo." },
      { property: "og:title", content: "Acesso por dispositivo — GuardaWeb" },
      { property: "og:description", content: "Acesso privado sem cadastro tradicional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const input = "w-full rounded-2xl border border-border bg-card/60 px-4 py-3.5 outline-none backdrop-blur-xl focus:border-primary";
const DEVICE_KEY = "guardaweb_device_id";

function newDeviceId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const raw = Array.from(bytes, (b) => b.toString(36).toUpperCase().padStart(2, "0")).join("").slice(0, 16);
  return `GW-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [password, setPassword] = useState("");
  const [recover, setRecover] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/painel" }); }, [user, navigate]);
  useEffect(() => {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) { setDeviceId(saved); setRecover(true); }
    else setDeviceId(newDeviceId());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await accessDevice({ data: { deviceId, password, mode: recover ? "access" : "create" } });
      if (!r.ok) throw new Error(r.error);
      const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      if (error) throw error;
      localStorage.setItem(DEVICE_KEY, deviceId);
      toast.success(recover ? "Dispositivo reconhecido" : "Acesso protegido criado");
      navigate({ to: "/painel" });
    } catch (err) {
      const m = (err as Error).message;
      toast.error(m === "Invalid login credentials" ? "E-mail ou senha incorretos" : m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:py-20">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card/70 shadow-glass backdrop-blur-xl"><MonitorSmartphone size={30} /></span>
        <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">Aceder neste dispositivo</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Sem e-mail e sem cadastro tradicional. O seu ID abre os ficheiros que permanecem online.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-3xl border border-border bg-card/65 p-5 shadow-glass backdrop-blur-2xl sm:p-7">
        <Field label="ID do dispositivo">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input className={input} value={deviceId} onChange={(e) => setDeviceId(e.target.value.toUpperCase())} required />
            <Button type="button" variant="outline" size="icon" className="h-[54px] w-[54px] rounded-2xl" aria-label="Copiar ID" onClick={() => { navigator.clipboard.writeText(deviceId); toast.success("ID copiado"); }}><Copy /></Button>
          </div>
        </Field>
        <Field label="Senha privada"><input type="password" minLength={10} maxLength={72} className={input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 10 caracteres" required /></Field>
        <Button disabled={busy || !/^GW-[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(deviceId.trim()) || password.length < 10} className="h-14 w-full rounded-2xl text-base font-bold">
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} {recover ? "Abrir a GuardaWeb" : "Proteger este dispositivo"}
        </Button>
        <button type="button" className="mx-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => { setRecover(!recover); if (recover) setDeviceId(newDeviceId()); else setDeviceId(""); }}>
          <RefreshCw size={15} /> {recover ? "Criar um novo acesso" : "Recuperar com um ID existente"}
        </button>
        <p className="flex gap-2 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground"><KeyRound className="mt-0.5 shrink-0" size={16} /> Guarde este ID. Se limpar os dados do navegador, precisará dele e da senha para recuperar os seus sites.</p>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
