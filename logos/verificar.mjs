// Prova de que a tela funciona, e não opinião sobre ela.
//   npm run build && node logos/verificar.mjs
//
// Roda contra o BUILD (.vercel/output/static), nunca contra o `astro dev`: o
// dev server injeta a barra de ferramentas do Astro — DOM extra e ~1,8 MB de
// JavaScript que não existem em produção, e que envenenam qualquer medida.
//
// O que ele prova, nesta ordem:
//   1. console e rede limpos (nenhum 404, nenhum erro)
//   2. passagem de Tab: todo foco é visível e a ordem faz sentido
//   3. três larguras × quatro posições de rolagem, em imagem
//   4. um quadro com prefers-reduced-motion: reduce — a tela sobrevive parada
//   5. LCP e CLS medidos com CPU estrangulada, contra o orçamento declarado
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const RAIZ = ".vercel/output/static";
const SAIDA = "logos/_verificacao";
const LARGURAS = [360, 768, 1440];
const ROLAGENS = [0, 0.33, 0.66, 1];
const LCP_ALVO_MS = 2000; // faixa "captação" do orçamento declarado
const DESCRICAO_MAX = 155; // acima disso o Google corta a <meta description>
const TITULO_AVISO = 62; // acima disso o <title> trunca — avisa, não reprova

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

const servidor = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    if (!extname(p)) p += "/index.html";
    // normalize + prefixo: impede `../` sair da raiz servida.
    const alvo = join(RAIZ, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    const corpo = await readFile(alvo);
    res.writeHead(200, { "content-type": TIPOS[extname(alvo)] ?? "application/octet-stream" });
    res.end(corpo);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("404");
  }
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;
await mkdir(SAIDA, { recursive: true });

const navegador = await chromium.launch();
let falhas = 0;
const falhar = (msg) => {
  falhas++;
  console.log("  FALHA  " + msg);
};

// ------------------------------------------------- 1. console e rede
{
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  const problemas = [];
  pagina.on("console", (m) => m.type() === "error" && problemas.push("console: " + m.text()));
  pagina.on("pageerror", (e) => problemas.push("pageerror: " + e.message));
  pagina.on("response", (r) => {
    // fonts.googleapis/gstatic são externos e podem variar; o que importa é o
    // que ESTE site serve.
    if (r.status() >= 400 && r.url().startsWith(BASE)) problemas.push(`${r.status()} ${r.url()}`);
  });
  for (const rota of ["/", "/sobre", "/privacidade", "/termos", "/404.html"]) {
    await pagina.goto(BASE + rota, { waitUntil: "networkidle" });
  }
  console.log("\n1. console e rede");
  problemas.length ? problemas.forEach(falhar) : console.log("  ok     limpo em 5 rotas");
  await pagina.close();
}

// ------------------------------------------------- 2. passagem de Tab
{
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  await pagina.goto(BASE + "/", { waitUntil: "networkidle" });
  console.log("\n2. passagem de Tab (primeiros 14 focos)");
  const ordem = [];
  for (let i = 0; i < 14; i++) {
    await pagina.keyboard.press("Tab");
    const info = await pagina.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const e = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // O nome acessível na ordem em que o leitor de tela o resolve: aria-label,
      // depois o <label for>, depois o texto. Sem o passo do <label>, todo campo
      // de formulário aparecia sem nome no relatório e parecia defeito.
      const rotulo = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
      return {
        tag: el.tagName.toLowerCase(),
        nome: (el.getAttribute("aria-label") || rotulo?.textContent || el.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 52),
        // Anel de foco visível: `outline-style` diferente de none E largura > 0.
        // É o par que pega o caso clássico de `outline: none` sem substituto.
        anel: e.outlineStyle !== "none" && parseFloat(e.outlineWidth) > 0,
        naTela: r.width > 0 && r.height > 0,
      };
    });
    if (!info) break;
    ordem.push(info);
    if (!info.anel) falhar(`sem anel de foco visível: <${info.tag}> "${info.nome}"`);
    if (!info.naTela) falhar(`foco em elemento de tamanho zero: <${info.tag}> "${info.nome}"`);
  }
  ordem.forEach((o, i) => console.log(`  ${String(i + 1).padStart(2)}. <${o.tag}> ${o.nome}`));
  await pagina.close();
}

// ------------------------------- 3. três larguras × quatro rolagens
{
  console.log("\n3. capturas");
  for (const w of LARGURAS) {
    const pagina = await navegador.newPage({ viewport: { width: w, height: w < 500 ? 740 : 900 } });
    await pagina.goto(BASE + "/", { waitUntil: "networkidle" });
    const alturaDoc = await pagina.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    // Rolagem horizontal é falha, não observação: a página não pode sangrar.
    // E a falha NOMEIA o culpado — "sangrou a 360px" sem dizer o que sangrou
    // manda a pessoa abrir o DevTools e refazer o trabalho que o script já fez.
    const sangra = await pagina.evaluate(() => {
      if (document.documentElement.scrollWidth <= innerWidth + 1) return null;
      const culpados = [];
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        // Só o lado direito. Em LTR, elemento posicionado à esquerda do zero
        // (o honeypot em `left: -9999px`) NÃO cria área rolável — reportá-lo
        // enche a lista de falso positivo e esconde o culpado de verdade.
        if (b.right > innerWidth + 1) {
          // Só quem estoura por conta própria: se o pai já estoura, o filho é
          // sintoma. Reporta o ancestral mais alto de cada cadeia.
          if (culpados.some((c) => c.el.contains(el))) continue;
          culpados.push({
            el,
            nome:
              el.tagName.toLowerCase() +
              (typeof el.className === "string" && el.className.trim()
                ? "." + el.className.trim().split(/\s+/).join(".")
                : ""),
            left: Math.round(b.left),
            right: Math.round(b.right),
          });
        }
      }
      return { scrollWidth: document.documentElement.scrollWidth, culpados: culpados.slice(0, 6).map((c) => `${c.nome} [${c.left}→${c.right}]`) };
    });
    if (sangra) {
      falhar(`rolagem horizontal a ${w}px (scrollWidth ${sangra.scrollWidth})`);
      sangra.culpados.forEach((c) => console.log("           " + c));
    }
    for (const f of ROLAGENS) {
      await pagina.evaluate((y) => scrollTo(0, y), Math.round(alturaDoc * f));
      await pagina.waitForTimeout(320);
      await pagina.screenshot({ path: `${SAIDA}/${w}-${Math.round(f * 100)}.png` });
    }
    if (!sangra) console.log(`  ok     ${w}px — 4 posições, sem sangramento horizontal`);
    await pagina.close();
  }
}

// ------------------------------- 4. movimento reduzido: sobrevive parada
{
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await pagina.goto(BASE + "/", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(400);
  // O piso da direção: com movimento reduzido o rastro fica INTEIRO, não some.
  const rastro = await pagina.evaluate(() => {
    const el = document.querySelector(".rastro");
    if (!el) return null;
    const d = getComputedStyle(el, "::after");
    return { transform: d.transform, opacidade: d.opacity, altura: el.getBoundingClientRect().height };
  });
  const numeroAceso = await pagina.evaluate(() => {
    const n = document.querySelector(".estacao__n");
    return n ? getComputedStyle(n).color : null;
  });
  console.log("\n4. prefers-reduced-motion: reduce");
  if (!rastro || rastro.altura < 100) falhar("o rastro sumiu com movimento reduzido");
  // scaleY(1) sai como "none" ou "matrix(1, 0, 0, 1, 0, 0)" — os dois são cheio.
  else if (!["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(rastro.transform))
    falhar(`rastro não está inteiro: transform=${rastro.transform}`);
  else console.log(`  ok     rastro inteiro (${Math.round(rastro.altura)}px), transform=${rastro.transform}`);
  if (numeroAceso === "rgba(0, 0, 0, 0)") falhar("número da estação ficou invisível com movimento reduzido");
  else console.log(`  ok     número da estação aceso: ${numeroAceso}`);
  await pagina.screenshot({ path: `${SAIDA}/reduced-motion.png` });
  await pagina.close();
}

// ------------------------------------------------- 5. LCP e CLS
{
  console.log(`\n5. LCP e CLS (CPU 4x estrangulada, alvo ${LCP_ALVO_MS}ms)`);
  const amostras = [];
  let clsMax = 0;
  for (let i = 0; i < 5; i++) {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const pagina = await contexto.newPage();
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await pagina.goto(BASE + "/", { waitUntil: "load" });
    await pagina.waitForTimeout(1400);
    const m = await pagina.evaluate(
      () =>
        new Promise((resolve) => {
          let lcp = 0;
          let cls = 0;
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) lcp = Math.max(lcp, e.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => resolve({ lcp, cls }), 260);
        })
    );
    amostras.push(Math.round(m.lcp));
    clsMax = Math.max(clsMax, m.cls);
    await contexto.close();
  }
  amostras.sort((a, b) => a - b);
  const mediana = amostras[Math.floor(amostras.length / 2)];
  console.log(`  amostras: ${amostras.join(", ")} ms`);
  if (mediana > LCP_ALVO_MS) falhar(`LCP mediano ${mediana}ms acima do alvo de ${LCP_ALVO_MS}ms`);
  else console.log(`  ok     LCP mediano ${mediana}ms`);
  if (clsMax > 0.1) falhar(`CLS ${clsMax.toFixed(3)} acima de 0.1`);
  else console.log(`  ok     CLS ${clsMax.toFixed(3)}`);
}

// ------------------------------------------------- 6. corte no resultado de busca
// Existe porque a auditoria de 25/08/2026 achou uma <meta description> de 208
// caracteres na home: o Google cortava em ~155 e o trecho perdido era o serviço
// pós-venda, que é o argumento que separa corretora de comparador de preço.
// Ninguém tinha percebido porque nada media. Só a descrição FALHA; o título é
// reportado e não barrado — quando ele estoura, quem some é o sufixo da marca,
// que é a truncagem menos ruim das duas.
{
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  console.log("\n6. corte no resultado de busca");
  for (const rota of ["/", "/sobre", "/privacidade", "/termos"]) {
    await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded" });
    const m = await pagina.evaluate(() => ({
      titulo: document.title,
      descricao: document.querySelector('meta[name="description"]')?.content ?? "",
    }));
    if (!m.descricao) falhar(`${rota} sem <meta description>`);
    else if (m.descricao.length > DESCRICAO_MAX) falhar(`${rota} descrição ${m.descricao.length} chars (teto ${DESCRICAO_MAX})`);
    else console.log(`  ok     ${rota.padEnd(14)} descrição ${String(m.descricao.length).padStart(3)}  título ${String(m.titulo.length).padStart(3)}${m.titulo.length > TITULO_AVISO ? "  ← a marca vai truncar" : ""}`);
  }
  await pagina.close();
}

await navegador.close();
servidor.close();
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo passa.");
process.exit(falhas ? 1 : 0);
