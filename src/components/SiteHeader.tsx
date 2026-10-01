import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Megaphone, LogOut, LayoutGrid } from "lucide-react";
import { adOfTheDay, msUntilNextAd } from "@/lib/ads";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function AdBar() {
  const [ad, setAd] = useState(() => adOfTheDay());
  useEffect(() => {
    setAd(adOfTheDay());
    const t = setTimeout(() => setAd(adOfTheDay()), msUntilNextAd() + 500);
    return () => clearTimeout(t);
  }, [ad]);
  if (!ad) return null;
  return (
    <div className="bg-navy text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 text-sm">
        <Megaphone size={20} strokeWidth={2.75} className="shrink-0" />
        <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-wide">{ad.tag}</span>
        <span className="truncate">{ad.text}</span>
        <Link to="/painel" className="ml-auto shrink-0 font-bold underline underline-offset-4">
          {ad.cta}
        </Link>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40">
      <AdBar />
      <div className="border-b-2 border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck size={26} strokeWidth={2.75} />
            </span>
            <span className="font-display text-2xl font-extrabold tracking-tight">
              Guarda<span className="text-primary">Web</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-[15px] font-semibold md:flex">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>Início</Link>
            <Link to="/servicos" activeProps={{ className: "text-primary" }}>Serviços</Link>
            <Link to="/painel" activeProps={{ className: "text-primary" }}>Scanner</Link>
          </nav>
          {user ? (
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <Link to="/painel" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground">
                <LayoutGrid size={18} strokeWidth={2.75} /> Painel
              </Link>
              <button
                aria-label="Sair"
                onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
                className="grid h-11 w-11 place-items-center rounded-xl border-2 border-border hover:bg-muted"
              >
                <LogOut size={18} strokeWidth={2.75} />
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <Link to="/auth" search={{ mode: "login" }} className="whitespace-nowrap rounded-xl px-3 py-2.5 font-bold hover:bg-muted">Entrar</Link>
              <Link to="/auth" search={{ mode: "signup" }} className="whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground">Criar conta</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
        <span className="font-display font-bold text-foreground">GuardaWeb · Luanda, Angola</span>
        <span>Segurança de sites, domínios, servidores e engenharia social.</span>
      </div>
    </footer>
  );
}
