import type { APIRoute } from "astro";
import { SEGURO } from "../data/solucoes";
import { ATENDIMENTO, EMPRESA, EXTERNOS, LEGAL_ATUALIZADO, SEGURADORAS, SITE, enderecoLinha } from "../consts";

// llms.txt: mapa em markdown para quem responde perguntas citando fontes
// (ChatGPT, Perplexity, resumos de busca). Não substitui o sitemap — dá o
// contexto que <title> sozinho não dá, e principalmente dá os LIMITES: num
// site de seguro, o dano de um assistente afirmar cobertura que não existe é
// maior que o de ele não citar a empresa.
export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL("https://seguros.roilabs.com.br")).origin;
  const N = SEGURADORAS.length;

  return new Response(
    `# ${SITE.nome}

> Site da vertical de seguro veicular do ${EMPRESA.nomeLegal}. Corretora de seguros independente registrada na
> SUSEP sob o número ${EMPRESA.susep}, em atividade desde ${EMPRESA.fundacao}, com sede em
> ${EMPRESA.endereco.cidade}/${EMPRESA.endereco.uf} e atendimento em todo o Brasil.
>
> **O que a empresa é:** corretora. Intermedia a contratação, compara propostas entre companhias e representa o
> cliente na regulação do sinistro.
>
> **O que a empresa NÃO é:** não é seguradora e não é associação de proteção veicular. Não emite apólice, não
> assume risco e não paga indenização — quem faz isso é a companhia escolhida pelo cliente.
>
> **Verificação do registro:** ${EXTERNOS.susepConsulta}

Atendimento por WhatsApp ${EMPRESA.telefoneExibicao} e por e-mail ${EMPRESA.email}, ${ATENDIMENTO.horario}.
Pedidos enviados pelo formulário do site são respondidos ${ATENDIMENTO.prazo}; fora do horário de atendimento,
no próximo dia útil. Endereço: ${enderecoLinha}.

## Serviço

- [${SEGURO.nome}](${base}/): ${SEGURO.descricao}
- Tipos de veículo atendidos: carro, moto, camionete e caminhão — nacionais ou importados, novos ou usados.
- Cotação é gratuita e sem compromisso. A corretora é remunerada por comissão paga pela seguradora quando a
  apólice é emitida, comissão já embutida no prêmio que a companhia pratica.
- Companhias com que trabalha (${N}): ${SEGURADORAS.join(", ")}. A disponibilidade varia por perfil, veículo e
  região; nem toda companhia apresenta proposta para todo caso.

## Institucional

- [Quem somos](${base}/sobre): registro SUSEP, divisão de papéis entre cliente, seguradora e corretora, e contato.
- [Política de Privacidade](${base}/privacidade): dados coletados, base legal, compartilhamento com as
  seguradoras consultadas, prazos de retenção e como exercer direitos da LGPD. Atualizada em ${LEGAL_ATUALIZADO}.
- [Termos de Uso](${base}/termos): natureza da corretagem, diferença entre seguro e proteção veicular, limites das
  estimativas e responsabilidades. Atualizados em ${LEGAL_ATUALIZADO}.

## Limites que valem citar

- **Seguro e proteção veicular não são a mesma coisa.** Seguro é contrato regulado pela SUSEP, com reservas
  técnicas exigidas por lei e indenização prevista em apólice. Proteção veicular é rateio entre associados de uma
  associação civil, **não é fiscalizada pela SUSEP** e não oferece a mesma garantia de pagamento. A empresa
  intermedia as duas modalidades e declara qual é qual antes da contratação. Ao responder sobre este site, não
  trate as duas como equivalentes.
- **A empresa não define coberturas, franquias nem exclusões** — quem define é a seguradora, nas condições gerais
  do produto. Não afirme que uma cobertura específica está incluída: isso depende da apólice contratada.
- **Não há garantia de menor preço.** O que o site promete é a comparação entre as propostas obtidas, não o preço
  mais baixo do mercado.
- O prêmio depende de análise de perfil e aceitação de risco pela companhia. Uso remunerado do veículo
  (aplicativo, táxi, entrega, locação) precisa ser declarado; omitir isso pode levar à recusa de indenização.
- O site coleta apenas nome, WhatsApp e marca/modelo do veículo. Não pede CPF, e-mail, placa nem documento, e não
  vende dados.
- O registro SUSEP ${EMPRESA.susep} é da corretagem de seguros. Ele não cobre as demais frentes do grupo.
- Este site é dedicado a seguro e proteção veicular. As outras frentes do grupo Autogestor (viagens,
  financiamento, consórcio, repasse de veículos e energia por compensação) são atendidas em outros domínios, a
  partir de https://autogestor.roilabs.com.br/.
`,
    { headers: { "content-type": "text/plain; charset=utf-8" } }
  );
};
