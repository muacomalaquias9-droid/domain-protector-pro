import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, IdCard, CheckCircle2, UserPlus, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lookupDocument } from "@/lib/scan.functions";
import { secureLogin } from "@/lib/security.functions";
import { useAuth } from "@/hooks/use-auth";
import { AppIcon } from "@/components/AppIcon";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: s["mode"] === "signup" ? ("signup" as const) : ("login" as const) }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — GuardaWeb" },
      { name: "description", content: "Aceda ao painel GuardaWeb ou crie conta com NIF ou BI angolano." },
      { property: "og:title", content: "Conta GuardaWeb" },
      { property: "og:description", content: "Entre ou registe-se com NIF ou BI." },
    ],
  }),
  component: AuthPage,
});

const input = "w-full rounded-xl border-2 border-input bg-background px-4 py-3 outline-none focus:border-primary";

function calcAge(d: string) {
  if (!d) return "";
  const b = new Date(d);
  if (isNaN(+b)) return "";
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 && a < 130 ? String(a) : "";
}

function toIsoDate(s: string) {
  if (!s) return "";
  const m = /(\d{2})[/-](\d{2})[/-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = /(\d{4}-\d{2}-\d{2})/.exec(s);
  return iso ? iso[1] : "";
}

const signupSchema = z.object({
  full_name: z.string().trim().min(3, "Nome obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha com pelo menos 8 caracteres").max(72),
  doc_number: z.string().trim().min(6, "Documento inválido").max(20),
  birth_date: z.string().min(10, "Data obrigatória"),
  age: z.string().regex(/^\d{1,3}$/, "Idade inválida"),
  company_name: z.string().trim().min(2, "Nome da empresa obrigatório").max(150),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", password: "", doc_type: "nif" as "nif" | "bi", doc_number: "", birth_date: "", age: "", company_name: "" });
  const [lookup, setLookup] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (user) navigate({ to: "/painel" }); }, [user, navigate]);

  async function doLookup() {
    if (f.doc_number.trim().length < 6) return;
    setLookup("loading");
    const r = await lookupDocument({ data: { type: f.doc_type, number: f.doc_number.trim() } });
    if (!r.ok) { setLookup("fail"); toast.error(r.error); return; }
    setLookup("ok");
    const bd = toIsoDate(r.data.birthDate ?? "");
    setF((p) => ({
      ...p,
      full_name: r.data.name || p.full_name,
      company_name: r.data.company || (p.doc_type === "nif" ? r.data.name : "") || p.company_name,
      birth_date: bd || p.birth_date,
      age: bd ? calcAge(bd) : p.age,
    }));
    toast.success("Dados preenchidos a partir do documento");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const r = await secureLogin({ data: { email: f.email.trim(), password: f.password } });
        if (!r.ok) throw new Error(r.error);
        const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
        if (error) throw error;
        navigate({ to: "/painel" });
      } else {
        const parsed = signupSchema.safeParse(f);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + "/painel",
            data: { full_name: parsed.data.full_name, doc_type: f.doc_type.toUpperCase(), doc_number: parsed.data.doc_number.toUpperCase(), birth_date: parsed.data.birth_date, age: parsed.data.age, company_name: parsed.data.company_name },
          },
        });
        if (error) throw error;
        if (data.session) { toast.success("Conta criada com sucesso!"); navigate({ to: "/painel" }); }
        else toast.success("Conta criada! Já pode entrar.");
      }
    } catch (err) {
      const m = (err as Error).message;
      toast.error(m === "Invalid login credentials" ? "E-mail ou senha incorretos" : m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <div className="flex items-center gap-4">
        <AppIcon icon={mode === "login" ? LogIn : UserPlus} size="lg" />
        <div>
          <h1 className="text-4xl font-extrabold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
          <p className="text-muted-foreground">{mode === "login" ? "Aceda ao seu painel de segurança." : "Use o seu NIF ou BI para preencher os dados."}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 rounded-2xl bg-muted p-1.5 font-bold">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} onClick={() => navigate({ to: "/auth", search: { mode: m } })} className={`rounded-xl py-2.5 ${mode === m ? "bg-card shadow" : "text-muted-foreground"}`}>
            {m === "login" ? "Entrar" : "Registar"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-3xl border-2 border-border bg-card p-6">
        {mode === "signup" && (
          <>
            <div className="rounded-2xl bg-secondary p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-secondary-foreground"><IdCard size={18} strokeWidth={2.75} /> Documento</label>
              <div className="flex gap-2">
                <select value={f.doc_type} onChange={(e) => { set("doc_type", e.target.value); setLookup("idle"); }} className="rounded-xl border-2 border-input bg-background px-3 font-bold">
                  <option value="nif">NIF</option>
                  <option value="bi">BI</option>
                </select>
                <input className={input} placeholder={f.doc_type === "nif" ? "Número do NIF" : "Número do BI"} value={f.doc_number} onChange={(e) => { set("doc_number", e.target.value.replace(/\s/g, "")); setLookup("idle"); }} onBlur={doLookup} />
                <button type="button" onClick={doLookup} className="shrink-0 rounded-xl bg-primary px-4 font-bold text-primary-foreground">
                  {lookup === "loading" ? <Loader2 className="animate-spin" size={20} /> : lookup === "ok" ? <CheckCircle2 size={20} strokeWidth={2.75} /> : "Validar"}
                </button>
              </div>
              {lookup === "loading" && <p className="mt-2 text-xs text-muted-foreground">A consultar o documento… na base da AGT</p>}
              {lookup === "fail" && <p className="mt-2 text-xs text-destructive">Não encontrado — preencha os dados manualmente.</p>}
            </div>
            <Field label="Nome completo"><input className={input} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Field label="Data de nascimento"><input type="date" className={input} value={f.birth_date} onChange={(e) => { set("birth_date", e.target.value); set("age", calcAge(e.target.value)); }} /></Field>
              <Field label="Idade"><input className={input} inputMode="numeric" value={f.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))} /></Field>
            </div>
            <Field label="Nome da empresa"><input className={input} value={f.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
          </>
        )}
        <Field label="E-mail"><input type="email" className={input} value={f.email} onChange={(e) => set("email", e.target.value)} required /></Field>
        <Field label="Senha"><input type="password" className={input} value={f.password} onChange={(e) => set("password", e.target.value)} required /></Field>
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-lg font-bold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="animate-spin" size={20} />} {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
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
