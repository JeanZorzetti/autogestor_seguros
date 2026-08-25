// Gera a imagem de compartilhamento (Open Graph) do site.
//   node logos/gerar-og.mjs
//
// Renderiza no navegador em vez de montar o PNG no sharp por um motivo só: a
// fonte. A Chivo não está instalada no sistema, então um SVG rasterizado pelo
// sharp cairia numa grotesca qualquer — e o cartão de compartilhamento é
// justamente onde a marca aparece para quem ainda NÃO entrou no site. Aqui a
// página carrega a MESMA fonte e os MESMOS tokens do site.
//
// A alternativa (arquivo de design mantido à mão) foi recusada: é assim que um
// PNG de marca fica desatualizado sem ninguém perceber.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import sharp from "sharp";

const L = 1200;
const A = 630;
const SAIDA = "public/img/og.png";

// Tokens copiados de global.css. Poucos e estáveis; importar CSS de dentro de
// um script node custaria mais que as seis linhas que economizaria.
const FUNDO = "#050b14";
const SUPERFICIE = "#0a1523";
const LARANJA = "#fb7402";
const BRASA = "#ff8c33";
const TEXTO = "#f2f5f9";
const TEXTO_SUAVE = "#9aa7b8";

// Número de companhias e telefone lidos de src/consts.ts, não escritos aqui.
// A home conta `SEGURADORAS.length`; se este cartão trouxesse o número literal,
// bastaria alguém tirar uma companhia da lista para o site dizer "7" e a
// pré-visualização no WhatsApp continuar prometendo "8" — e ninguém olha o OG
// de novo depois que ele fica pronto. Regex e não import porque consts.ts é
// TypeScript e este script roda em node cru.
const consts = readFileSync("src/consts.ts", "utf8");
const bloco = consts.match(/export const SEGURADORAS = \[([\s\S]*?)\] as const;/);
if (!bloco) throw new Error("não achei SEGURADORAS em src/consts.ts");
const N = (bloco[1].match(/"/g) || []).length / 2;
const TELEFONE = consts.match(/telefoneExibicao: "([^"]+)"/)?.[1];
if (!N || !TELEFONE) throw new Error("não consegui ler N de seguradoras ou telefone de src/consts.ts");

// A marca inline, do mesmo arquivo que a página usa — não uma segunda cópia.
const simbolo = readFileSync("public/img/logo.svg", "utf8");
const simboloMono = readFileSync("public/img/logo-mono.svg", "utf8");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chivo:wght@800&display=block">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${L}px;height:${A}px;background:${FUNDO};color:${TEXTO};
       font-family:"Chivo",sans-serif;overflow:hidden;position:relative}

  /* O RASTRO, parado. É o gesto do site — a linha incandescente que na página
     acende com a rolagem — congelado no quadro. Um cartão de compartilhamento
     não rola, então o gesto entra como o que ele é depois de aceso: inteiro. */
  .rastro{position:absolute;left:0;top:0;bottom:0;width:8px;
          background:linear-gradient(180deg,#c04b05,${LARANJA} 45%,${BRASA});
          box-shadow:0 0 40px 6px rgba(251,116,2,.5)}

  /* Marca-d'água sangrando pela direita, sobre um halo quente que repete a luz
     das peças de captação. 0.14 de opacidade mantém o texto acima de 8:1. */
  .halo{position:absolute;right:-160px;top:50%;transform:translateY(-50%);
        width:820px;height:820px;border-radius:50%;
        background:radial-gradient(circle,rgba(251,116,2,.20),rgba(251,116,2,0) 62%)}
  .agua{position:absolute;right:-120px;top:50%;transform:translateY(-50%);width:560px;opacity:.14}
  .agua svg{width:100%;height:auto;display:block}

  .quadro{position:relative;height:100%;padding:60px 72px 56px 92px;
          display:flex;flex-direction:column;justify-content:space-between}
  .olho{font-size:21px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${LARANJA}}
  /* Espelha o H1 da home depois da troca de fonte: caixa mista, tracking
     negativo e menor — a Chivo é mais larga que a Anton, e 82px em caixa alta
     não cabia mais em três linhas. */
  h1{font-size:64px;font-weight:800;line-height:1.06;letter-spacing:-.015em;
     max-width:17ch;margin-top:20px}
  h1 em{font-style:normal;color:${BRASA}}
  .sub{font-family:ui-sans-serif,system-ui,"Segoe UI",Arial,sans-serif;
       font-size:25px;line-height:1.45;color:${TEXTO_SUAVE};max-width:34ch;margin-top:20px}
  .pe{display:flex;align-items:center;gap:16px;border-top:1px solid #27405f;padding-top:24px}
  .pe svg{width:54px;height:54px;display:block;color:${TEXTO}}
  .pe b{font-size:27px;font-weight:800;letter-spacing:.03em;text-transform:uppercase}
  .pe span{display:block;font-family:ui-sans-serif,system-ui,"Segoe UI",Arial,sans-serif;
           font-size:15px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;
           color:${TEXTO_SUAVE};margin-top:3px}
  .pe .zap{margin-left:auto;text-align:right;background:${SUPERFICIE};border:1px solid #27405f;
           border-radius:999px;padding:12px 22px;font-family:ui-sans-serif,system-ui,Arial,sans-serif;
           font-size:19px;font-weight:700;color:${BRASA}}
</style></head><body>
  <div class="halo"></div>
  <div class="agua">${simbolo}</div>
  <div class="rastro"></div>
  <div class="quadro">
    <div>
      <span class="olho">Corretora independente · desde 2004</span>
      <h1>Seu seguro cotado em <em>${N} seguradoras</em> de uma vez</h1>
      <p class="sub">Carro, moto, camionete e caminhão. Cotar é grátis, e a comparação mostra o que cada apólice deixa de fora.</p>
    </div>
    <div class="pe">
      ${simboloMono}
      <div><b>Autogestor Seguros</b><span>Corretora independente · Goiânia, GO</span></div>
      <div class="zap">${TELEFONE}</div>
    </div>
  </div>
</body></html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: L, height: A }, deviceScaleFactor: 1 });
await pagina.setContent(html);
await pagina.evaluate(() => document.fonts.ready);
const bruto = await pagina.screenshot();
await navegador.close();

// Paleta indexada: o cartão tem poucas cores chapadas mais dois gradientes, e
// 256 cores não perdem nada visível — o arquivo cai da casa das centenas de KB
// para as dezenas, e o WhatsApp descarta pré-visualização de imagem grande.
const { size } = await sharp(bruto).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(SAIDA);

console.log(`${L}×${A}  ${(size / 1024).toFixed(0)} KB  ${SAIDA}  (${N} seguradoras, ${TELEFONE})`);
