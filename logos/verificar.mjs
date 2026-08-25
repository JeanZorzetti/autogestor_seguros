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
// O piso da direção `corte seco`: com movimento reduzido NADA fica pela
// metade. Todo bloco cortado (`.corta`) e toda régua (`.regua`) nascem
// inteiros, e as duas linhas que invertem no cruzamento ficam no estado
// invertido — que é um dos dois estados legíveis do sistema, não um meio-termo.
//
// Esta seção media o rastro até 25/08/2026 (`.rastro` inteiro, transform em
// scaleY(1)). O gesto não existe mais: a direção anterior era luz/scroll, esta
// é geometria/estado. O que se mede agora é o recorte e a inversão.
{
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await pagina.goto(BASE + "/", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(400);

  const estado = await pagina.evaluate(() => {
    const recortado = (el) => {
      const c = getComputedStyle(el).clipPath;
      // `none` (a animação não rodou) e `inset(0px)` (rodou até o fim) são os
      // dois jeitos de estar inteiro. Qualquer porcentagem é bloco cortado
      // pela metade, e aí a tela NÃO sobrevive parada.
      return c !== "none" && !/inset\(0px( 0px)*\)/.test(c);
    };
    const blocos = [...document.querySelectorAll(".corta")];
    const reguas = [...document.querySelectorAll(".regua")];
    const invertidas = [...document.querySelectorAll(".inverte-no-scroll")];
    return {
      blocos: blocos.length,
      blocosCortados: blocos.filter(recortado).length,
      reguas: reguas.length,
      reguasCortadas: reguas.filter(recortado).length,
      reguasSemLargura: reguas.filter((r) => r.getBoundingClientRect().width < 100).length,
      invertidas: invertidas.length,
      // A cor RESOLVIDA diz se a inversão chegou à pintura — ler o custom
      // property não provaria nada. Passa pelo canvas porque `getComputedStyle`
      // devolve a cor na sintaxe em que ela foi escrita, e a paleta desta
      // direção está em OKLCH: comparar a string "oklch(0.185 0.03 255)" com um
      // "rgb(9, 19, 32)" esperado reprovava uma inversão que tinha funcionado.
      // O `fillStyle` do canvas normaliza qualquer sintaxe de cor para o hex
      // sRGB que o navegador realmente pinta.
      ...(() => {
        const ctx = document.createElement("canvas").getContext("2d");
        // PINTA e lê o pixel de volta. Ler `ctx.fillStyle` não bastava: o
        // canvas aceita `oklch()` e devolve a mesma string, então a
        // comparação continuava sendo entre sintaxes. `fillRect` +
        // `getImageData` obriga o navegador a rasterizar, e o que sai são os
        // bytes sRGB que ele de fato pinta na tela.
        const sRGB = (c) => {
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
        };
        return {
          fundos: invertidas.map((el) => sRGB(getComputedStyle(el).backgroundColor)),
          // O texto tem de ter virado claro junto. Inverter só o fundo é o
          // defeito clássico desta técnica: fundo escuro com texto escuro.
          textos: invertidas.map((el) => sRGB(getComputedStyle(el).color)),
        };
      })(),
    };
  });

  console.log("\n4. prefers-reduced-motion: reduce");
  if (!estado.blocos) falhar("nenhum bloco `.corta` na home — a camada de entrada sumiu");
  else if (estado.blocosCortados) falhar(`${estado.blocosCortados} de ${estado.blocos} blocos ficaram cortados pela metade`);
  else console.log(`  ok     ${estado.blocos} blocos de entrada inteiros`);

  if (!estado.reguas) falhar("nenhuma régua `.regua` — a camada de scroll sumiu");
  else if (estado.reguasCortadas || estado.reguasSemLargura)
    falhar(`régua incompleta: ${estado.reguasCortadas} recortada(s), ${estado.reguasSemLargura} sem largura`);
  else console.log(`  ok     ${estado.reguas} réguas inteiras`);

  // Os dois hexes que `node logos/contraste.mjs` imprime para --tinta e
  // --papel. Se a inversão não valeu, o fundo volta a papel.
  const tinta = "#091320";
  const papel = "#f4f6f8";
  if (estado.invertidas !== 2) falhar(`esperava 2 linhas invertendo no cruzamento, achei ${estado.invertidas}`);
  else if (!estado.fundos.every((c) => c === tinta)) falhar(`inversão não chegou à pintura: ${estado.fundos.join(", ")}`);
  else if (!estado.textos.every((c) => c === papel)) falhar(`fundo inverteu e o texto não: ${estado.textos.join(", ")}`);
  else console.log(`  ok     as 2 linhas invertidas: fundo ${tinta}, texto ${papel}`);

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

// ------------------------------- 7. as camadas que a captura estática não pega
// Screenshot do topo não prova coreografia nenhuma. Duas das quatro camadas da
// direção só existem em estado: a de PONTEIRO (o link inverte) e a de SCROLL
// (a linha inverte ao cruzar a janela). As duas saem em imagem aqui.
{
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  await pagina.goto(BASE + "/", { waitUntil: "networkidle" });
  console.log("\n7. camadas de ponteiro e de scroll, em imagem");

  // PONTEIRO — a linha do índice do rodapé é o alvo maior da página e o que
  // carrega a resposta ao ponteiro: a linha INTEIRA vira papel com texto de
  // tinta, em 0ms. Se um dia isso virar uma transição, o quadro mostra.
  const linha = pagina.locator(".rodape__linha").first();
  await linha.scrollIntoViewIfNeeded();
  await linha.hover();
  await pagina.waitForTimeout(120);
  const sobPonteiro = await linha.evaluate((el) => {
    const ctx = document.createElement("canvas").getContext("2d");
    const sRGB = (c) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    };
    const d = getComputedStyle(el);
    return { fundo: sRGB(d.backgroundColor), texto: sRGB(d.color), transicao: d.transitionDuration };
  });
  await pagina.screenshot({ path: `${SAIDA}/ponteiro-rodape.png` });
  if (sobPonteiro.fundo !== "#f4f6f8") falhar(`a linha do rodapé não inverteu sob o ponteiro: ${sobPonteiro.fundo}`);
  else if (!/^0s(, 0s)*$/.test(sobPonteiro.transicao))
    falhar(`a camada de ponteiro tem transição (${sobPonteiro.transicao}) — nesta direção ela corta em 0ms`);
  else console.log(`  ok     ponteiro: linha inverte para ${sobPonteiro.fundo} em ${sobPonteiro.transicao}`);

  // SCROLL — rola até o ponto em que a linha 02 cruza a janela e comprova que a
  // inversão chegou à pintura. `cover 45%` significa: 45% do caminho entre a
  // linha começar a cobrir a janela e terminar de cobri-la.
  const invertida = await pagina.evaluate(async () => {
    const el = document.querySelectorAll(".inverte-no-scroll")[0];
    const r = el.getBoundingClientRect();
    const topoDoc = r.top + scrollY;
    // Início da faixa `cover`: a linha encosta na borda de baixo da janela.
    // Fim: ela termina de passar pela borda de cima. 45% entre os dois.
    const inicio = topoDoc - innerHeight;
    const fim = topoDoc + r.height;
    scrollTo({ top: inicio + (fim - inicio) * 0.5, behavior: "instant" });
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = getComputedStyle(el).backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r2, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return "#" + [r2, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  });
  await pagina.screenshot({ path: `${SAIDA}/scroll-inversao.png` });
  if (invertida !== "#091320") falhar(`a linha 02 não inverteu no cruzamento: ${invertida}`);
  else console.log(`  ok     scroll: a linha 02 inverteu para ${invertida} ao cruzar`);

  await pagina.close();
}

// --------------------------------- 8. o theme-color não descolou da paleta
// <meta name="theme-color"> não aceita `var()`, então ele é o único hex escrito
// à mão no projeto inteiro. Duplicata de token é o defeito que ninguém vê: a
// paleta muda, a barra do navegador continua na cor da direção anterior, e
// isso só aparece no celular de outra pessoa. Aqui ele é comparado com o pixel
// que o cabeçalho realmente pinta.
{
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  await pagina.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const m = await pagina.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const sRGB = (c) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    };
    return {
      meta: (document.querySelector('meta[name="theme-color"]')?.content ?? "").toLowerCase(),
      cabecalho: sRGB(getComputedStyle(document.querySelector(".cabecalho")).backgroundColor),
    };
  });
  console.log("\n8. theme-color contra o topo da página");
  if (m.meta !== m.cabecalho) falhar(`theme-color ${m.meta} != cabeçalho ${m.cabecalho}`);
  else console.log(`  ok     ${m.meta} é a cor que o cabeçalho pinta`);
  await pagina.close();
}

await navegador.close();
servidor.close();
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo passa.");
process.exit(falhas ? 1 : 0);
