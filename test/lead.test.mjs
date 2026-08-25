import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarWhatsapp, parseLead } from "../src/lib/lead.mjs";

// Dois slugs porque um dos testes precisa de um valor FORA da lista para
// recusar. "seguro" é o slug real deste site; o outro é só um vizinho
// plausível do hub, para o teste não depender do que este repo publica.
const SLUGS = ["seguro", "consorcio"];

test("normaliza os formatos que a pessoa realmente digita", () => {
  for (const entrada of ["(62) 98262-2220", "62982622220", "+55 62 98262-2220", "5562982622220", "062 98262 2220"]) {
    assert.equal(normalizarWhatsapp(entrada), "+5562982622220", entrada);
  }
});

test("recusa número que não é celular", () => {
  assert.equal(normalizarWhatsapp("6232622220"), null, "fixo de 10 dígitos");
  assert.equal(normalizarWhatsapp("62 3262-2220"), null, "não começa com 9 após o DDD");
  assert.equal(normalizarWhatsapp("09982622220"), null, "DDD inválido");
  assert.equal(normalizarWhatsapp("9826222"), null, "curto demais");
  assert.equal(normalizarWhatsapp(""), null);
  assert.equal(normalizarWhatsapp(undefined), null);
});

test("aceita lead completo e normaliza", () => {
  const r = parseLead(
    { solucao: "seguro", nome: "  Maria   Silva ", whatsapp: "(62) 98262-2220", contexto: "Onix 2021" },
    SLUGS
  );
  assert.equal(r.ok, true);
  assert.equal(r.lead.nome, "Maria Silva");
  assert.equal(r.lead.whatsapp, "+5562982622220");
  assert.equal(r.lead.origem, "site");
  assert.equal(r.lead.isca, false);
});

test("recusa solução fora da lista", () => {
  const r = parseLead({ solucao: "cripto", nome: "Ana", whatsapp: "62982622220" }, SLUGS);
  assert.equal(r.ok, false);
  assert.equal(r.campo, "solucao");
});

test("aponta o campo errado para a mensagem grudar nele", () => {
  assert.equal(parseLead({ solucao: "seguro", nome: "A", whatsapp: "62982622220" }, SLUGS).campo, "nome");
  assert.equal(parseLead({ solucao: "seguro", nome: "Ana", whatsapp: "123" }, SLUGS).campo, "whatsapp");
});

test("marca o honeypot sem recusar", () => {
  const r = parseLead({ solucao: "seguro", nome: "Bot", whatsapp: "62982622220", empresa: "spam" }, SLUGS);
  assert.equal(r.ok, true);
  assert.equal(r.lead.isca, true);
});

test("exige contexto só na solução marcada como obrigatória", () => {
  const semContexto = { solucao: "seguro", nome: "Ana", whatsapp: "62982622220" };
  assert.equal(parseLead(semContexto, SLUGS, ["seguro"]).campo, "contexto", "obrigatório e vazio recusa");
  assert.equal(parseLead(semContexto, SLUGS, []).ok, true, "sem exigência, vazio passa");
  assert.equal(parseLead(semContexto, SLUGS).ok, true, "obrigatorios é opcional");
});

// O slug desta vertical é contrato com OUTRO sistema: o /api/lead do hub já
// aceita "seguro", os leads gravados usam esse valor e o Kanban de
// admin.autogestor.roilabs.com.br lê essa coluna. Renomear para "seguros"
// (que é o subdomínio) quebraria o funil sem quebrar nenhum build — e é
// exatamente o tipo de troca que alguém faz "arrumando" a nomenclatura.
// Lê o arquivo como texto porque solucoes.ts é TypeScript e `node --test`
// não transpila; o que importa aqui é a string literal, não o módulo.
test("o slug da vertical continua sendo `seguro` (contrato com o CRM do hub)", async () => {
  const { readFile } = await import("node:fs/promises");
  const fonte = await readFile(new URL("../src/data/solucoes.ts", import.meta.url), "utf8");
  assert.match(fonte, /slug:\s*"seguro"/, "SEGURO.slug precisa ser exatamente \"seguro\"");
  assert.doesNotMatch(fonte, /slug:\s*"seguros"/, 'nunca "seguros" — esse é o subdomínio, não o pipeline');
});
