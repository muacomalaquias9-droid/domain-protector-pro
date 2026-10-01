export const ADS = [
  { tag: "Novo", text: "Auditoria completa de segurança para bancos e fintechs — 30% de desconto este mês.", cta: "Saber mais" },
  { tag: "Alerta", text: "Onda de phishing a imitar o Multicaixa Express. Verifique qualquer link antes de clicar.", cta: "Verificar link" },
  { tag: "Oferta", text: "Monitorização 24/7 do seu domínio e certificado SSL por apenas 9.900 Kz/mês.", cta: "Ativar" },
  { tag: "Formação", text: "Curso de engenharia social para equipas de RH e atendimento — vagas abertas.", cta: "Inscrever" },
  { tag: "SEO", text: "Relatório de SEO grátis: descubra porque o seu site não aparece no Google.", cta: "Analisar" },
  { tag: "VPS", text: "Hardening de servidores VPS: firewall, SSH seguro e backups automáticos.", cta: "Pedir orçamento" },
  { tag: "Denúncia", text: "Encontrou um site de burla? Denuncie — enviamos ao registrador e ao alojamento.", cta: "Denunciar" },
];

/** Changes every 24h (UTC day). */
export function adOfTheDay(now = Date.now()) {
  const day = Math.floor(now / 86400000);
  return ADS[day % ADS.length]!;
}

export function msUntilNextAd(now = Date.now()) {
  return 86400000 - (now % 86400000);
}
