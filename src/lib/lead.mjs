// Validação pura do lead. .mjs sem transpilar porque o `node --test` importa
// isto direto — mesmo padrão do roihub.

/**
 * O lead já validado e normalizado. Existe como typedef, e não como `object`
 * solto no @returns, porque `astro check` roda sobre este arquivo: sem ele,
 * `r.lead` chega no /api/lead como `object` e o endpoint acusa dois erros de
 * tipo (`isca` não existe, `gravarLead` não aceita). Era assim no repositório
 * de origem — o `npm run check` de lá reprova pelos mesmos dois erros.
 *
 * @typedef {object} LeadValidado
 * @property {string} solucao slug da vertical, já conferido contra a lista
 * @property {string} nome
 * @property {string} whatsapp em E.164
 * @property {string | null} contexto 3º campo; null quando veio vazio e é opcional
 * @property {string} origem
 * @property {boolean} isca true = honeypot preenchido, responder 200 e NÃO gravar
 */

const texto = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/**
 * Normaliza celular brasileiro para E.164 (+55DDNNNNNNNNN).
 *
 * Aceita o que a pessoa realmente digita: "(62) 98262-2220", "62982622220",
 * "+55 62 98262 2220". Rejeita o resto — WhatsApp errado é lead perdido em
 * silêncio, que é pior do que o formulário recusar na hora.
 *
 * @returns {string | null} número em E.164, ou null se não for celular válido.
 */
export function normalizarWhatsapp(bruto) {
  let d = String(bruto ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1); // 0XX de discagem antiga
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 11) return null; // celular no Brasil é DDD + 9 dígitos
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (d[2] !== "9") return null; // celular sempre começa com 9 depois do DDD
  return `+55${d}`;
}

/**
 * Valida o corpo de `POST /api/lead`.
 *
 * @param {unknown} body corpo cru do POST — form-urlencoded ou JSON, sem garantia
 *   nenhuma de forma. É `unknown` de propósito: é a fronteira de confiança, e
 *   fingir que já é um objeto aqui é onde esse tipo de código costuma quebrar.
 * @param {readonly string[]} slugs slugs de solução aceitos
 * @param {readonly string[]} obrigatorios slugs cujo 3º campo é `<select>` — sem
 *   contexto ali a resposta não roteia (a diferença entre um `<input>` de texto
 *   vazio, que ainda é uma pista, e um "Selecione" nunca escolhido)
 * @returns {{ok: true, lead: LeadValidado} | {ok: false, erro: string, campo: string}}
 */
export function parseLead(body, slugs, obrigatorios = []) {
  if (!body || typeof body !== "object") return { ok: false, erro: "Não recebemos os dados do formulário.", campo: "" };

  // Uma asserção só, logo depois da única guarda que a justifica. Todo acesso
  // abaixo passa por `texto()`/`normalizarWhatsapp()`, que tratam qualquer
  // valor — a asserção compra o acesso por chave, não confiança no conteúdo.
  const b = /** @type {Record<string, unknown>} */ (body);

  const solucao = texto(b.solucao, 40);
  if (!slugs.includes(solucao)) return { ok: false, erro: "Escolha uma das soluções.", campo: "solucao" };

  const nome = texto(b.nome, 200);
  if (nome.length < 2) return { ok: false, erro: "Informe seu nome.", campo: "nome" };

  const whatsapp = normalizarWhatsapp(b.whatsapp);
  if (!whatsapp) return { ok: false, erro: "Confira o WhatsApp: use DDD + 9 dígitos.", campo: "whatsapp" };

  const contexto = texto(b.contexto, 300);
  if (!contexto && obrigatorios.includes(solucao)) return { ok: false, erro: "Selecione uma opção.", campo: "contexto" };

  // Honeypot: campo escondido que só robô preenche. Responde sucesso para não
  // ensinar o robô a contornar, mas não grava.
  const isca = texto(b.empresa, 100);

  return {
    ok: true,
    lead: {
      solucao,
      nome,
      whatsapp,
      contexto: contexto || null,
      origem: texto(b.origem, 80) || "site",
      isca: isca.length > 0,
    },
  };
}
