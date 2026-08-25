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

// Tokens de global.css, resolvidos de OKLCH para sRGB por `node
// logos/contraste.mjs` (que imprime a tabela no fim). Poucos e estáveis;
// importar CSS de dentro de um script node custaria mais que as seis linhas
// que economizaria — mas os VALORES não são digitados no olho, são os que o
// medidor de contraste imprime.
//
// O cartão acompanhou a troca de direção (`corte seco`, 25/08/2026): era navy
// com um rastro incandescente na borda esquerda e uma marca-d'água em halo
// quente. Agora é papel, com três superfícies chapadas e nenhum gradiente —
// gradiente é transição suave, e esta direção não tem nenhuma. O cartão de
// compartilhamento é onde a marca aparece para quem ainda NÃO entrou no site;
// deixá-lo na direção velha é exatamente como um PNG de marca fica
// desatualizado sem ninguém perceber.
const PAPEL = "#f4f6f8";
const TINTA = "#091320";
const TINTA_SUAVE = "#4f5c6d";
const TINTA_QUENTE = "#1a0b00";
const LARANJA = "#fb7402";

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
// Só a versão MONO: ela herda `currentColor`, e no cartão novo a marca aparece
// exclusivamente dentro da faixa de tinta. A `logo.svg` colorida traz os
// valores claros do hub embutidos (#006bb6…), que leem sobre papel e não sobre
// a tinta — usá-la ali seria azul escuro sobre navy.
const simboloMono = readFileSync("public/img/logo-mono.svg", "utf8");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chivo:wght@800&display=block">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${L}px;height:${A}px;background:${PAPEL};color:${TINTA};
       font-family:"Chivo",sans-serif;overflow:hidden;position:relative}

  /* TRÊS SUPERFÍCIES CHAPADAS e dois cortes retos, que é a direção inteira num
     quadro parado: papel, uma coluna de laranja sangrando na direita e uma
     faixa de tinta no pé. Zero gradiente, zero raio, zero sombra. */
  .laranja{position:absolute;right:0;top:0;bottom:0;width:132px;background:${LARANJA}}

  .quadro{position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between}
  .alto{padding:64px 200px 0 84px}

  /* A sobrancelha é o mesmo objeto da página: bloco chapado de laranja com a
     tinta quente por cima (6.96:1), não texto colorido. */
  .olho{display:inline-block;background:${LARANJA};color:${TINTA_QUENTE};
        font-size:20px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;padding:5px 10px}
  h1{font-size:64px;font-weight:800;line-height:1.06;letter-spacing:-.015em;
     max-width:16ch;margin-top:24px}
  /* O destaque era laranja em texto. Sobre papel o laranja da marca dá 2.55:1
     e reprova, então quem destaca aqui é a INVERSÃO: a palavra vira um bloco
     de tinta com o texto em papel. */
  h1 em{font-style:normal;background:${TINTA};color:${PAPEL};padding:0 10px;
        box-decoration-break:clone;-webkit-box-decoration-break:clone}
  .sub{font-family:ui-sans-serif,system-ui,"Segoe UI",Arial,sans-serif;
       font-size:24px;line-height:1.45;color:${TINTA_SUAVE};max-width:36ch;margin-top:22px}

  /* A faixa de tinta: a inversão, sangrando de ponta a ponta. */
  .pe{display:flex;align-items:center;gap:16px;background:${TINTA};color:${PAPEL};
      padding:26px 84px}
  .pe svg{width:54px;height:54px;display:block;color:${PAPEL}}
  .pe b{font-size:27px;font-weight:800;letter-spacing:.03em;text-transform:uppercase}
  .pe span{display:block;font-family:ui-sans-serif,system-ui,"Segoe UI",Arial,sans-serif;
           font-size:15px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;
           color:#afb8c4;margin-top:3px}
  /* Era pílula com borda de 1px. Agora é o mesmo bloco do resto: fio de 2px,
     canto reto, e o laranja da marca — que sobre tinta lê como texto (6.75:1). */
  .pe .zap{margin-left:auto;border:2px solid ${PAPEL};padding:11px 22px;
           font-family:ui-sans-serif,system-ui,Arial,sans-serif;
           font-size:19px;font-weight:700;color:${LARANJA}}
</style></head><body>
  <div class="laranja"></div>
  <div class="quadro">
    <div class="alto">
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

// Paleta indexada: o cartão agora tem SÓ cores chapadas (a direção não admite
// gradiente), então 256 cores não perdem absolutamente nada — o arquivo cai da
// casa das centenas de KB para as dezenas, e o WhatsApp descarta
// pré-visualização de imagem grande.
const { size } = await sharp(bruto).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(SAIDA);

console.log(`${L}×${A}  ${(size / 1024).toFixed(0)} KB  ${SAIDA}  (${N} seguradoras, ${TELEFONE})`);
