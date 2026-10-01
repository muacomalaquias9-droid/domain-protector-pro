import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Globe, Server, ShieldAlert, FileSearch, Siren } from "lucide-react";
import { AppIcon } from "@/components/AppIcon";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — GuardaWeb" },
      { name: "description", content: "Engenharia social, engenharia de domínio, hardening de VPS, auditorias e resposta a incidentes." },
      { property: "og:title", content: "Serviços de cibersegurança — GuardaWeb" },
      { property: "og:description", content: "Engenharia social, domínios, servidores VPS e resposta a incidentes." },
      { property: "og:url", content: "https://guardaweb.info/servicos" },
    ],
    links: [{ rel: "canonical", href: "https://guardaweb.info/servicos" }],
  }),
  component: Services,
});

const items = [
  { icon: Users, tone: "amber", t: "Engenharia social", d: "Simulações de phishing, vishing e formação para equipas." },
  { icon: Globe, tone: "navy", t: "Engenharia de domínio", d: "DNS, SPF, DKIM, DMARC, DNSSEC e proteção contra typosquatting." },
  { icon: Server, tone: "blue", t: "Servidores VPS", d: "Hardening, firewall, SSH, monitorização e backups." },
  { icon: FileSearch, tone: "sky", t: "Auditoria web", d: "Testes de intrusão e relatório técnico detalhado." },
  { icon: ShieldAlert, tone: "green", t: "Monitorização 24/7", d: "Alertas de certificado, domínio e alterações suspeitas." },
  { icon: Siren, tone: "red", t: "Resposta a incidentes", d: "Remoção de sites falsos e contacto com registradores." },
] as const;

function Services() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Serviços</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Para além do scanner, a nossa equipa protege as pessoas, os domínios e os servidores da sua empresa.</p>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div key={i.t} className="flex gap-5 rounded-2xl border border-border bg-card p-6">
            <AppIcon icon={i.icon} tone={i.tone} size="lg" />
            <div>
              <h2 className="text-xl font-bold">{i.t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{i.d}</p>
            </div>
          </div>
        ))}
      </div>
      <Link to="/painel" className="mt-12 inline-block rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground">Fazer uma análise grátis</Link>
    </div>
  );
}
