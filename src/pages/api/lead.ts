import type { APIRoute } from "astro";
import { parseLead } from "../../lib/lead.mjs";
import { dbOn, gravarLead } from "../../lib/db";
import { SEGURO } from "../../data/solucoes";

// Única rota dinâmica do site. O resto é HTML estático.
export const prerender = false;

// Uma solução só neste site (o hub aceita 8) — mesma lógica, lista reduzida.
// O slug continua sendo "seguro", igual ao do hub: os leads já gravados usam
// esse valor e o Kanban de admin.autogestor.roilabs.com.br lê essa coluna.
const TODAS = [SEGURO];
const SLUGS = TODAS.map((s) => s.slug);
// Sem `opcoes` o 3º campo é texto livre — vazio ainda é uma resposta válida
// ("não sabe o modelo do carro" também é informação). Com `<select>`, vazio é
// só o placeholder nunca tocado.
const CONTEXTO_OBRIGATORIO = TODAS.filter((s) => s.campo.opcoes).map((s) => s.slug);

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// ponytail: Map em memória do processo — reseta a cada cold start e não é
// compartilhado entre instâncias serverless. Barra um script batendo na mesma
// instância, não um pool de IPs distribuído. Trocar por KV/Redis se abuso real
// aparecer nos logs.
const LIMITE = 5;
const JANELA_MS = 60 * 60 * 1000;
const tentativas = new Map<string, { n: number; expira: number }>();

function limitado(ip: string): boolean {
  const agora = Date.now();
  const registro = tentativas.get(ip);
  if (!registro || registro.expira < agora) {
    tentativas.set(ip, { n: 1, expira: agora + JANELA_MS });
    return false;
  }
  registro.n++;
  return registro.n > LIMITE;
}

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  // Sem JS o navegador manda form-urlencoded e espera navegar; com JS o script
  // manda JSON e espera resposta. Aceitar os dois é o que faz o formulário
  // continuar funcionando quando o bundle não carrega.
  const form = !(request.headers.get("content-type") ?? "").includes("application/json");

  if (clientAddress && limitado(clientAddress)) {
    return form
      ? redirect("/obrigado?erro=1", 303)
      : json({ erro: "Muitas tentativas. Chame no WhatsApp que respondemos na hora." }, 429);
  }

  let body: unknown;
  try {
    body = form ? Object.fromEntries(await request.formData()) : await request.json();
  } catch {
    return json({ erro: "Não recebemos os dados do formulário." }, 400);
  }

  const r = parseLead(body, SLUGS, CONTEXTO_OBRIGATORIO);
  if (!r.ok) return form ? redirect(`/obrigado?erro=${r.campo || "1"}`, 303) : json({ erro: r.erro, campo: r.campo }, 400);

  // Robô recebe 200 e vai embora achando que funcionou. Ensinar o robô qual
  // campo o denunciou só faz ele voltar sabendo contornar.
  if (r.lead.isca) return form ? redirect("/obrigado", 303) : json({ ok: true }, 200);

  if (!dbOn()) {
    // Fail closed e honesto: o formulário mostra o WhatsApp em vez de fingir
    // que gravou. Lead engolido em silêncio é pior que formulário fora do ar.
    return form
      ? redirect("/obrigado?erro=1", 303)
      : json({ erro: "Nosso formulário está fora do ar. Fale com a gente no WhatsApp." }, 503);
  }

  try {
    const { created } = await gravarLead(r.lead, {
      ua: request.headers.get("user-agent")?.slice(0, 200) ?? null,
      referer: request.headers.get("referer")?.slice(0, 300) ?? null,
      ip: clientAddress ?? null,
    });
    return form ? redirect("/obrigado", 303) : json({ ok: true, duplicado: !created }, 200);
  } catch (e) {
    console.error("falha ao gravar lead", e);
    return form
      ? redirect("/obrigado?erro=1", 303)
      : json({ erro: "Não conseguimos registrar agora. Chame no WhatsApp que respondemos na hora." }, 500);
  }
};
