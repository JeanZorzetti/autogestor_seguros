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
  // A placa da capa (direção `asfalto`). Sem estes dois o servidor devolvia
  // `application/octet-stream` e o Chromium recusava decodificar: a seção 7
  // reprovava por "a placa não pintou" com a placa perfeitamente gerada.
  ".avif": "image/avif",
  ".webp": "image/webp",
  // A capa passou a ser servida do próprio domínio (25/08/2026, ver o topo de
  // global.css). Sem este tipo o Chromium recusa o woff2 e a página cai no
  // fallback de métrica casada — que é justamente o que deveria estar sendo
  // testado, e a falha passaria como sucesso.
  ".woff2": "font/woff2",
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
  let amostras = [];
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
  // Amostra 0ms significa que o observador não pegou entrada nenhuma, não que
  // a página pintou instantaneamente. Deixá-la entrar EMPURRA A MEDIANA PARA
  // BAIXO — ou seja, o medidor mente a favor de quem está sendo medido, que é
  // o pior jeito de um gate falhar. Descartada, e o gate reprova se sobrarem
  // menos de três medidas de verdade.
  const descartadas = amostras.filter((a) => a <= 0).length;
  amostras = amostras.filter((a) => a > 0).sort((a, b) => a - b);
  if (descartadas) console.log(`  (${descartadas} amostra(s) sem entrada de LCP, descartada(s))`);
  if (amostras.length < 3) {
    falhar(`só ${amostras.length} amostra(s) de LCP válidas — medição inconclusiva, não é aprovação`);
  }
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

// ------------------------------------------------- 7. texto da capa sobre a placa
// Existe por causa da direção `asfalto` (25/08/2026): a capa deixou de ter
// fundo de cor chapada e passou a ter uma FOTOGRAFIA no pé. A partir daí,
// `logos/contraste.mjs` não basta — ele compara pares de tokens, e token
// nenhum descreve "o pixel do carro branco que ficou atrás daquela linha".
//
// A montagem que está no ar coloca a placa na linha 2 da grade, começando
// onde a coluna de texto termina, então HOJE nada se sobrepõe. Esta seção
// existe justamente para o dia em que alguém mexer no conteúdo da capa: se a
// coluna crescer, encolher, ou se a placa voltar a ser absoluta, o texto cai
// sobre a foto de novo e ninguém percebe olhando — a segunda montagem desta
// direção quebrou exatamente assim, e a 1440px o defeito quase não aparecia.
//
// COMO MEDE. Esconde o texto, fotografa o que ficou atrás e procura o PIOR
// pixel dentro da caixa de cada linha. Duas armadilhas, as duas já pagas:
//
//   · sobreposição fixa. A `.barra` de ação (celular) e o cabeçalho ficam
//     por CIMA do conteúdo, não atrás. Sem escondê-los, a barra branca
//     entrava na conta como se fosse fundo e reprovava 1.00:1 num texto que
//     está correto. É o mesmo tipo de falso positivo do honeypot em
//     `left:-9999px` que a seção 3 já teve.
//   · caixa fora do quadro. Linha abaixo da dobra não tem pixel para medir, e
//     "não medido" não pode virar "aprovado" nem "reprovado" — é relatado.
//
// A decodificação do PNG é feita pelo próprio navegador (canvas +
// getImageData) em vez de uma biblioteca: o Chromium já está aberto e já sabe
// ler PNG. Uma dependência a menos para uma coisa que ele faz de graça.
{
  console.log("\n7. texto da capa sobre a placa (contraste real, pixel a pixel)");
  const ALVOS = [".olho", ".capa h1", ".chamada", ".capa__destaques li:last-child", ".capa__atalho"];
  const MINIMO = 4.5;

  for (const largura of LARGURAS) {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: 900 } });
    const pagina = await contexto.newPage();
    await pagina.goto(BASE + "/", { waitUntil: "networkidle" });

    const placa = await pagina.evaluate(() => {
      const img = document.querySelector(".capa__placa img");
      if (!img) return { erro: "sem .capa__placa img" };
      return { ok: img.complete && img.naturalWidth > 0, arquivo: img.currentSrc.split("/").pop() };
    });
    if (placa.erro || !placa.ok) falhar(`${largura}px: a placa não pintou (${placa.erro ?? placa.arquivo})`);
    else console.log(`  ok     ${String(largura).padStart(4)}px  placa: ${placa.arquivo}`);

    const caixas = await pagina.evaluate(
      (sels) =>
        sels
          .map((s) => {
            const el = document.querySelector(s);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const [vr, vg, vb] = getComputedStyle(el).color.match(/\d+/g).map(Number);
            return { s, cor: [vr, vg, vb], x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })
          .filter(Boolean),
      ALVOS
    );

    // Some com o texto E com quem flutua por cima dele. `visibility` e não
    // `display`: precisa sumir sem reposicionar o resto, senão o que sobra na
    // foto não é mais o que estava atrás do texto.
    await pagina.addStyleTag({
      content: ".capa__texto,.capa__form,.barra,.cabecalho,header,.rastro{visibility:hidden!important}",
    });
    await pagina.waitForTimeout(250);
    const fundo = (await pagina.screenshot({ clip: { x: 0, y: 0, width: largura, height: 900 } })).toString("base64");

    const medidas = await pagina.evaluate(
      async ({ fundo, caixas, MINIMO }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + fundo;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = img.width;
        cv.height = img.height;
        cv.getContext("2d").drawImage(img, 0, 0);
        const { data } = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height);

        const lin = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const contraste = (a, b) => {
          const [x, y] = [a, b].sort((m, n) => n - m);
          return (x + 0.05) / (y + 0.05);
        };

        return caixas.map((c) => {
          const lt = lum(...c.cor);
          let pior = Infinity;
          let px = null;
          let amostras = 0;
          for (let y = Math.max(0, c.y); y < Math.min(cv.height, c.y + c.h); y += 2)
            for (let x = Math.max(0, c.x); x < Math.min(cv.width, c.x + c.w); x += 3) {
              const i = (cv.width * y + x) << 2;
              amostras++;
              const v = contraste(lt, lum(data[i], data[i + 1], data[i + 2]));
              if (v < pior) {
                pior = v;
                px = [data[i], data[i + 1], data[i + 2]];
              }
            }
          return { s: c.s, amostras, pior, px, passa: amostras > 0 && pior >= MINIMO };
        });
      },
      { fundo, caixas, MINIMO }
    );

    for (const m of medidas) {
      if (m.amostras === 0) console.log(`  --     ${String(largura).padStart(4)}px  ${m.s.padEnd(30)} fora do quadro, não medido`);
      else if (m.passa) console.log(`  ok     ${String(largura).padStart(4)}px  ${m.s.padEnd(30)} ${m.pior.toFixed(2)}:1`);
      else falhar(`${largura}px: ${m.s} a ${m.pior.toFixed(2)}:1 sobre rgb(${m.px}) — mínimo ${MINIMO}`);
    }
    await contexto.close();
  }
}

await navegador.close();
servidor.close();
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo passa.");
process.exit(falhas ? 1 : 0);
