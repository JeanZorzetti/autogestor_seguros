// Gera os PNGs de ícone a partir do vetor. Rode depois de logos/gerar-marca.py.
//   node logos/rasterizar.mjs
// Usa o sharp que o Astro já traz — nenhuma dependência nova.
import sharp from "sharp";

// A versão clara é a base de todos: ícone de app e favicon PNG são vistos
// sobre fundo de sistema, quase sempre claro. Quem tem tema escuro pega o
// /favicon.svg, que troca sozinho no prefers-color-scheme.
const VETOR = "public/img/logo.svg";

// [saída, lado, fundo] — null = transparente
const ALVOS = [
  ["public/img/icon-512.png", 512, null],
  ["public/favicon.png", 64, null],
  ["public/apple-touch-icon.png", 180, "#ffffff"], // iOS não respeita alpha
];

for (const [saida, lado, fundo] of ALVOS) {
  // density alto: o rasterizador desenha o SVG nessa resolução antes do resize,
  // então a borda sai limpa em vez de escadinha.
  let img = sharp(VETOR, { density: 1400 }).resize(lado, lado);
  if (fundo) img = img.flatten({ background: fundo });
  const { size } = await img.png({ compressionLevel: 9 }).toFile(saida);
  console.log(`${String(size).padStart(7)} B  ${saida}`);
}
