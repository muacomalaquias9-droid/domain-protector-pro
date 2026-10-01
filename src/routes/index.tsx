import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bug, Search, Globe, Lock, Flag, Server, UserX, Mail, ArrowRight, TrendingUp, Ban, ShieldCheck, Fingerprint } from "lucide-react";
import { AppIcon } from "@/components/AppIcon";

const TITLE = "GuardaWeb — Scanner de vulnerabilidades, SEO e sites falsos em Angola";
const DESC = "Analise qualquer site grátis: vulnerabilidades, erros, SEO, domínio, certificado SSL, spam e phishing. Denuncie e bana sites falsos em Angola.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "scanner de vulnerabilidades, segurança de sites Angola, SEO, SSL, phishing, sites falsos, denunciar burla, Luanda" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://guardaweb.info/" },
    ],
    links: [{ rel: "canonical", href: "https://guardaweb.info/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "GuardaWeb",
          url: "https://guardaweb.info",
          logo: "https://guardaweb.info/apple-touch-icon.png",
          address: { "@type": "PostalAddress", addressLocality: "Luanda", addressCountry: "AO" },
          description: DESC,
        }),
      },
    ],
  }),
  component: Home,
});

const apps = [
  { icon: Bug, tone: "red", t: "Vulnerabilidades", d: "Cabeçalhos, cookies, ficheiros expostos e bibliotecas antigas." },
  { icon: TrendingUp, tone: "blue", t: "SEO", d: "Título, descrição, H1, sitemap, robots e telemóvel." },
  { icon: Globe, tone: "navy", t: "Domínio", d: "Registrador, idade, expiração e DNS." },
  { icon: Lock, tone: "green", t: "Certificado SSL", d: "Emissor, validade e cifra." },
  { icon: UserX, tone: "amber", t: "Spam & Phishing", d: "Imitação de marcas e código ofuscado." },
  { icon: Server, tone: "sky", t: "Servidor / VPS", d: "IP, fornecedor, país e tecnologia." },
  { icon: Mail, tone: "blue", t: "E-mail", d: "SPF e DMARC contra falsificação." },
  { icon: Flag, tone: "red", t: "Denunciar", d: "Enviado ao registrador e alojamento." },
] as const;

const steps = [
  { n: "01", t: "Cole o endereço", d: "Qualquer site, com ou sem https." },
  { n: "02", t: "Analisamos ao vivo", d: "Site, DNS, RDAP e certificado em segundos." },
  { n: "03", t: "Relatório e ação", d: "Corrija os erros ou denuncie a burla." },
];

function Home() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" /> Luanda · Angola
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
              Descubra as falhas do seu site <span className="text-primary">antes dos burlões.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Vulnerabilidades, SEO, domínio e certificado num só relatório. Sites falsos são banidos e denunciados a quem os alojou.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); navigate({ to: "/painel", search: url ? { url } : {} }); }}
              className="mt-7 flex max-w-xl flex-col gap-2 rounded-2xl border-2 border-foreground/80 bg-background p-2 sm:flex-row"
            >
              <div className="flex flex-1 items-center">
                <Search className="ml-2 shrink-0 text-muted-foreground" size={22} strokeWidth={2.75} />
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="exemplo.co.ao" aria-label="Endereço do site" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-lg outline-none" />
              </div>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">
                Analisar <ArrowRight size={18} strokeWidth={2.75} />
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} /> Anti brute-force</span>
              <span className="inline-flex items-center gap-1.5"><Fingerprint size={16} /> Bloqueio de VPN</span>
              <span className="inline-flex items-center gap-1.5"><Ban size={16} /> Banimento de sites falsos</span>
            </div>
          </div>
          <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-6 rounded-3xl bg-secondary p-6 sm:p-8">
            {apps.slice(0, 6).map((a) => (
              <div key={a.t} className="flex flex-col items-center gap-2">
                <AppIcon icon={a.icon} tone={a.tone} size="lg" />
                <span className="text-center text-xs font-bold sm:text-sm">{a.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="border-l-4 border-primary pl-4">
              <p className="font-display text-sm font-extrabold text-primary">{s.n}</p>
              <h3 className="text-lg font-bold">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Tudo o que verificamos</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {apps.map((a) => (
            <article key={a.t} className="rounded-2xl border border-border bg-card p-5">
              <AppIcon icon={a.icon} tone={a.tone} size="md" />
              <h3 className="mt-4 text-lg font-bold">{a.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-navy p-8 text-primary-foreground sm:p-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">Crie a sua conta com NIF ou BI</h2>
            <p className="mt-2 opacity-90">O nome é preenchido automaticamente a partir da base da AGT.</p>
          </div>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-xl bg-primary px-6 py-3.5 font-bold">Começar agora</Link>
        </div>
      </section>
    </>
  );
}
