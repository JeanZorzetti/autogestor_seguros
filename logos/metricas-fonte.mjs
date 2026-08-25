// Mede o fallback de métrica casada da fonte de exibição.
//   node logos/metricas-fonte.mjs
//
// Existe porque chutar esses números é pior que não ter fallback nenhum: um
// `size-adjust` errado troca um reflow por outro e ninguém percebe. Os valores
// saem de medir a MESMA frase nas duas fontes, num navegador de verdade.
//
// Diferença para a versão do coopluz (de onde este arquivo veio): lá o
// `ascent-override`/`descent-override` eram constantes escritas à mão a partir
// da tabela da Outfit. Aqui as duas saem de `fontBoundingBoxAscent/Descent` do
// canvas, que é a métrica real da fonte carregada — funciona para qualquer
// família e não precisa de ninguém abrir o .ttf.
//
// Rode de novo se a fonte de exibição ou o H1 mudarem, e copie o bloco
// impresso para o @font-face "Capa fallback" em src/styles/global.css.
import { chromium } from "playwright";

// A frase é o H1 da home: é ele que reflui e empurra a página inteira.
const FRASE = "Seu seguro de carro, moto ou caminhão cotado em 8 seguradoras de uma vez";
const PESO = 800;
const FAMILIA = "Big Shoulders Display";
const PILHA_SISTEMA =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.setContent(`<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FAMILIA.replace(/ /g, "+")}:wght@100..900&display=block">
<style>
  span { position:absolute; white-space:nowrap; font-size:100px; font-weight:${PESO}; }
  #capa { font-family:"${FAMILIA}"; }
  #sistema { font-family:${PILHA_SISTEMA}; }
</style></head><body>
<span id="capa">${FRASE}</span><span id="sistema">${FRASE}</span>
</body></html>`);
await pagina.evaluate(() => document.fonts.ready);

const m = await pagina.evaluate(
  ({ frase, peso, familia, pilha }) => {
    const ctx = document.createElement("canvas").getContext("2d");
    const medir = (fonte) => {
      ctx.font = `${peso} 100px ${fonte}`;
      const t = ctx.measureText(frase);
      return { largura: t.width, sobe: t.fontBoundingBoxAscent, desce: t.fontBoundingBoxDescent };
    };
    return {
      capa: {
        // Largura pelo layout real (getBoundingClientRect) e não pelo canvas:
        // é o número que decide se o H1 quebra em 3 ou em 4 linhas.
        largura: document.getElementById("capa").getBoundingClientRect().width,
        ...medir(`"${familia}"`),
      },
      sistema: {
        largura: document.getElementById("sistema").getBoundingClientRect().width,
        ...medir(pilha),
      },
    };
  },
  { frase: FRASE, peso: PESO, familia: FAMILIA, pilha: PILHA_SISTEMA }
);
await navegador.close();

if (!m.capa.largura || !m.sistema.largura) throw new Error(`medição vazia — a ${FAMILIA} não carregou`);

// O fallback parte da pilha do sistema e precisa terminar com a largura da
// fonte de exibição, então o fator é capa/sistema.
const fator = m.capa.largura / m.sistema.largura;
// Com o glifo já reescalado por `size-adjust`, as sobras verticais precisam
// ser reexpressas na mesma escala — senão a caixa de linha muda de altura e o
// reflow que o size-adjust evitou na horizontal volta na vertical.
const pct = (v) => `${(v * 100).toFixed(1)}%`;

console.log(`frase: ${FRASE.length} caracteres, peso ${PESO}`);
console.log(`  ${FAMILIA.padEnd(22)} ${m.capa.largura.toFixed(2)}px  (sobe ${m.capa.sobe}, desce ${m.capa.desce})`);
console.log(`  sistema${" ".repeat(16)} ${m.sistema.largura.toFixed(2)}px  (sobe ${m.sistema.sobe}, desce ${m.sistema.desce})`);
console.log(`\n  size-adjust = ${m.capa.largura.toFixed(2)} / ${m.sistema.largura.toFixed(2)} = ${pct(fator)}`);
console.log("\n@font-face {");
console.log('  font-family: "Capa fallback";');
console.log('  src: local("Arial Narrow"), local("Roboto Condensed"), local("Segoe UI"), local("Roboto"), local("Arial");');
console.log(`  size-adjust: ${pct(fator)};`);
console.log(`  ascent-override: ${pct(m.capa.sobe / 100 / fator)};`);
console.log(`  descent-override: ${pct(m.capa.desce / 100 / fator)};`);
console.log("  line-gap-override: 0%;");
console.log("}");
