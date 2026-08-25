// ponytail: duplicado de C:\dev\autogestor\src\consts.ts, pelo mesmo motivo e
// com a mesma regra do coopluz — os dois repositórios não compartilham pacote
// nem monorepo ("nenhum import atravessando a fronteira", decisão do hub),
// então o NAP da Autogestor existe fisicamente nos dois lugares. Atualizar
// aqui manualmente sempre que o hub mudar endereço, e-mail, fundação, telefone
// ou o prazo/horário de atendimento.
//
// Diferença deliberada em relação ao coopluz: aqui o telefone é o MESMO do hub
// (62 98262-2220). O coopluz ganhou linha própria; a vertical de seguros não —
// é o número que já está impresso nas peças de captação da Autogestor Seguros.

/** Dados de NAP (nome/endereço/telefone). Ficam num lugar só porque saem em três
 *  lugares — rodapé, JSON-LD e página de contato — e divergir entre eles é o
 *  erro clássico que derruba SEO local. */
export const EMPRESA = {
  nome: "Autogestor",
  nomeLegal: "Grupo Autogestor Adm de Serviços — Seguros, Financiamentos e Turismo",
  fundacao: "2004",
  susep: "202070004",
  telefone: "+5562982622220",
  telefoneExibicao: "(62) 98262-2220",
  email: "atendimento@autogestor.com.br",
  endereco: {
    rua: "Av. Itália, 1326",
    bairro: "Jardim Europa",
    cidade: "Goiânia",
    uf: "GO",
    cep: "74325-110",
    pais: "BR",
  },
  geo: { lat: -16.7089, lon: -49.2325 },
  redes: [
    "https://www.instagram.com/autogestorseguros/",
    "https://www.facebook.com/autogestorseguros/",
    "https://twitter.com/autogestors",
  ],
} as const;

export const enderecoLinha = `${EMPRESA.endereco.rua} — ${EMPRESA.endereco.bairro}, ${EMPRESA.endereco.cidade}/${EMPRESA.endereco.uf}, CEP ${EMPRESA.endereco.cep}`;

/** Link de WhatsApp com mensagem pronta. O contexto no texto poupa a primeira
 *  pergunta do atendente — é o passo que o formulário de 3 campos economizou. */
export function whatsapp(mensagem: string): string {
  return `https://wa.me/${EMPRESA.telefone.replace("+", "")}?text=${encodeURIComponent(mensagem)}`;
}

/** Destinos externos desta vertical. Copiados do hub porque são os canais de
 *  cotação completa que a corretora já opera — quem já sabe o que quer pula o
 *  formulário de 3 campos e preenche a ficha inteira lá. */
export const EXTERNOS = {
  cotacaoVeiculo: "https://www.corretor-online.com.br/canalcliente/index.htm?Pw=WUtjNkJwM05vNC9iZ1RhblcyT3RMUT09",
  cotacaoMoto: "https://www.corretor-online.com.br/canalcliente/index.htm?Pw=bkZCWmtZUHRFZE00ZTdtZml6bkV1QT09",
  cotacaoCaminhao: "https://www.corretor-online.com.br/canalcliente/index.htm?Pw=QlhjVzV2QjlKdjFHc05ua1ZSU2YrUT09",
  /** Consulta pública de corretores da SUSEP. Este site afirma um registro em
   *  quatro lugares (cabeçalho, JSON-LD, rodapé, llms.txt); sem o caminho para
   *  conferir, é só um número na tela — e é o tipo de alegação que motor de
   *  resposta não cita sem fonte. */
  susepConsulta: "https://www2.susep.gov.br/safe/Corretores/pesquisa",
} as const;

/** Prazo e horário de atendimento. Ficam aqui pelo mesmo motivo do NAP acima:
 *  saem no formulário, no /obrigado, no JSON-LD e no llms.txt — e uma promessa
 *  que diverge entre esses quatro é promessa quebrada em pelo menos um deles. */
export const ATENDIMENTO = {
  /** Encaixa depois de um verbo: "responde <prazo>". */
  prazo: "no mesmo dia útil",
  horario: "de segunda a sexta, das 8h às 18h",
  horarioCurto: "seg–sex, 8h–18h",
  /** openingHoursSpecification do JSON-LD. Mesmo horário de cima, no formato
   *  que o schema.org exige — derivar um do outro por parse não vale o código. */
  horarioSchema: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "18:00",
  },
} as const;

/** Medição. Mesma propriedade GA4 do hub e do coopluz — o tráfego deste site é
 *  distinguível por hostname dentro dela. Trocar por propriedade dedicada é
 *  uma linha aqui. */
export const GA4 = "G-SHG12H2NZX";

/** Nome DESTE site. Sai no cabeçalho, no rodapé, no og:site_name e no WebSite
 *  do JSON-LD — os quatro precisam bater, e por isso vivem aqui.
 *
 *  Ao contrário do coopluz, aqui NÃO existe um segundo dono: o site é da
 *  própria Autogestor, sobre a própria vertical de seguros. Não há
 *  `papel`/`representante autorizado` a declarar, e a divulgação obrigatória
 *  de terceiro (Princípio VI da constituição) não se aplica — não há terceiro.
 *  O que ocupa o lugar dela é a CREDENCIAL: registro SUSEP e ano de fundação,
 *  que é o que muda a decisão de quem vai contratar seguro. */
export const SITE = {
  nome: "Autogestor Seguros",
  /** Vai colado à marca no cabeçalho, como nas peças de captação impressas. */
  selo: `SUSEP ${EMPRESA.susep} · desde ${EMPRESA.fundacao}`,
} as const;

/** As companhias com que a corretora trabalha, na ordem em que aparecem na
 *  peça de captação de agosto/2026 (docs/seguros/ do hub).
 *
 *  Só o NOME, nunca o logotipo: são marcas registradas de terceiros e não há
 *  ativo licenciado neste repositório. É a mesma decisão que o coopluz tomou
 *  com os logos de emissora na seção "Na mídia" — prova social por tipografia,
 *  não por marca alheia reexibida como se fosse nossa. */
export const SEGURADORAS = [
  "Porto",
  "Allianz",
  "Bradesco Seguros",
  "HDI",
  "Azul Seguros",
  "Zurich",
  "Mapfre",
  "Itaú",
] as const;

/** Data da última revisão dos textos legais. Sai nas duas páginas e no llms.txt;
 *  política sem data é política que ninguém sabe se ainda vale. */
export const LEGAL_ATUALIZADO = "2026-08-24";
