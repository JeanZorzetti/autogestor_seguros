// ponytail: duplicado (reduzido) de C:\dev\autogestor\src\data\solucoes.ts —
// mesmo motivo e mesma regra de atualização do comentário em consts.ts.
// Só a entrada `seguro` migrou; as outras 5 verticais do hub, `PARCEIRO` e
// `GERAL` não existem neste site.
//
// O `slug` continua sendo exatamente "seguro", e isso NÃO é detalhe: o
// /api/lead do hub já aceita esse slug, os leads já gravados usam esse valor e
// o Kanban de admin.autogestor.roilabs.com.br lê essa coluna. Renomear aqui
// para "seguros" (que é o subdomínio) quebraria o funil que já existe.

/** Mantido igual ao hub para o `LeadForm`/`api/lead` funcionarem sem adaptação. */
export type Solucao = {
  slug: string;
  nome: string;
  curto: string;
  resumo: string;
  titulo: string;
  descricao: string;
  abrangencia: "BR" | "GO";
  provedor?: string;
  campo: { rotulo: string; exemplo: string; opcoes?: readonly string[]; avisoPara?: { opcao: string; texto: string } };
  cta: string;
  fechamento: string;
  icone: string;
};

/** Conteúdo interno de <svg viewBox="0 0 24 24">, traçado em currentColor. */
export const ICONES = {
  zap: '<path d="M12 3.5c-4.7 0-8.5 3.3-8.5 7.4 0 2.4 1.3 4.5 3.3 5.9l-.8 3.2 3.5-1.6c.8.2 1.6.3 2.5.3 4.7 0 8.5-3.3 8.5-7.4s-3.8-7.4-8.5-7.4z"/>',
  carro: '<path d="M3.2 16.4h17.6v-3.9l-1.8-4.2a2 2 0 0 0-1.8-1.2H6.8a2 2 0 0 0-1.8 1.2l-1.8 4.2z"/><circle cx="7.3" cy="16.4" r="1.9"/><circle cx="16.7" cy="16.4" r="1.9"/>',
  moto: '<circle cx="5.4" cy="16.6" r="3.1"/><circle cx="18.6" cy="16.6" r="3.1"/><path d="M5.4 16.6h4.2l4-6.2h3.4"/><path d="M9.6 10.4h4.6l4.4 6.2"/><path d="M13.4 6.6h2.8"/>',
  caminhao: '<path d="M2.6 6.6h10.2v10.2H2.6z"/><path d="M12.8 10.2h3.6l2.9 3.1v3.5h-6.5z"/><circle cx="7" cy="18.4" r="1.7"/><circle cx="17" cy="18.4" r="1.7"/>',
  escudo: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4.2"/>',
  lupa: '<circle cx="11" cy="11" r="6.4"/><path d="m15.8 15.8 4 4"/>',
  cartao: '<rect x="2.5" y="5.4" width="19" height="13.2" rx="2"/><path d="M2.5 9.9h19"/><path d="M6.2 14.6h4"/>',
} as const;

export const SEGURO: Solucao = {
  slug: "seguro",
  nome: "Seguro e proteção veicular",
  curto: "Seguro",
  resumo: "Cotação de carro, moto, camionete e caminhão comparada entre seguradoras, com assistência 24h.",
  titulo: "Seguro de carro, moto e caminhão comparado entre seguradoras | Autogestor Seguros",
  descricao:
    "Corretora com registro SUSEP desde 2004. Comparamos seguro e proteção veicular para carro, moto, camionete e caminhão entre as principais companhias, com assistência 24h nacional e acompanhamento do sinistro.",
  abrangencia: "BR",
  campo: { rotulo: "Marca e modelo do veículo", exemplo: "ex.: Onix 2021" },
  cta: "Quero minha cotação",
  fechamento: "Peça sua cotação de seguro",
  icone: ICONES.escudo,
};

const TODAS = [SEGURO] as const;

export const porSlug = (slug: string): Solucao => {
  const s = TODAS.find((x) => x.slug === slug);
  if (!s) throw new Error(`solução desconhecida: ${slug}`);
  return s;
};

/** `areaServed` do schema.org a partir da abrangência. A vertical deste site é
 *  BR — GO fica só para o `type Solucao` continuar compatível com os
 *  componentes copiados do hub sem alteração. */
export const AREA_SERVIDA = {
  BR: { "@type": "Country", name: "Brasil" },
  GO: { "@type": "State", name: "Goiás" },
} as const;
