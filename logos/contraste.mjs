// Mede todos os pares de contraste do sistema de design.
//   node logos/contraste.mjs
// Nenhum valor entra em src/styles/global.css sem ter passado por aqui —
// Princípio V da constituição: contraste é restrição de escolha, não checagem
// final. Sai da suíte de teste de propósito: `npm test` valida lógica, isto
// valida uma decisão de design, e é rodado quando a paleta muda.
//
// UM tema só: este site não tem seletor claro/escuro. O que ele tem são DUAS
// BANDAS do mesmo sistema — papel e tinta —, e a segunda é a primeira ao
// contrário (`.inverso` em global.css). Por isso os pares abaixo vêm em blocos
// espelhados: todo par que existe sobre papel tem de existir sobre tinta.
//
// AGORA EM OKLCH. A direção `corte seco` (25/08/2026) declara a paleta em
// OKLCH, e este arquivo passou a converter em vez de guardar uma cópia em hex.
// A duplicata em hex era a fonte de erro óbvia: alguém ajusta o token no CSS,
// esquece daqui, e o medidor continua aprovando a paleta velha. Aqui existe UMA
// tabela, e ela é a mesma que o CSS usa.

// --- OKLCH -> sRGB ---------------------------------------------------------
// Fórmulas do próprio Björn Ottosson (Oklab), não aproximação: é o que garante
// que o valor medido seja o valor que o navegador pinta.
const lin2srgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function oklchParaRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => clamp01(lin2srgb(v)));
}

// A LUMINÂNCIA RELATIVA DO WCAG É MEDIDA NO sRGB PINTADO, não no L do OKLCH.
// São coisas diferentes: o L do OKLCH é luminosidade perceptual e o WCAG usa a
// soma ponderada dos canais linearizados. Usar o L daria número mais "justo"
// para o olho e errado para o critério — e o critério é o que a auditoria mede.
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (cor) => {
  const [r, g, b] = cor.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hex = (rgb) => "#" + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// --- os tokens, na mesma ordem e com os mesmos números de global.css --------
const T = {
  papel: oklchParaRgb(0.972, 0.004, 250),
  "papel-2": oklchParaRgb(0.938, 0.006, 250),
  "papel-suave": oklchParaRgb(0.78, 0.02, 255),
  tinta: oklchParaRgb(0.185, 0.03, 255),
  "tinta-2": oklchParaRgb(0.28, 0.03, 255),
  "tinta-suave": oklchParaRgb(0.47, 0.032, 255),
  "tinta-quente": oklchParaRgb(0.1686, 0.0378, 65.14),
  "fio-fraco": oklchParaRgb(0.8, 0.01, 255),
  laranja: oklchParaRgb(0.7087, 0.19, 48.88),
  "laranja-tinta": oklchParaRgb(0.5, 0.165, 45),
  erro: oklchParaRgb(0.47, 0.18, 25),
  "erro-fundo": oklchParaRgb(0.945, 0.03, 25),
  "erro-fio": oklchParaRgb(0.58, 0.19, 25),
  ok: oklchParaRgb(0.45, 0.12, 155),
  "ok-fundo": oklchParaRgb(0.945, 0.03, 155),
};

// [rótulo, frente, fundo, mínimo] — 4.5 texto normal, 3 texto grande e contorno
// de componente (WCAG 1.4.11), 1 para separador puramente decorativo.
const PARES = {
  "banda PAPEL — texto": [
    ["texto / papel", "tinta", "papel", 4.5],
    ["texto / papel-2 (faixa de prova)", "tinta", "papel-2", 4.5],
    ["texto-suave / papel", "tinta-suave", "papel", 4.5],
    ["texto-suave / papel-2", "tinta-suave", "papel-2", 4.5],
    ["link (laranja queimado) / papel", "laranja-tinta", "papel", 4.5],
    ["link / papel-2", "laranja-tinta", "papel-2", 4.5],
  ],
  "banda TINTA — a mesma lista ao contrário": [
    // Se um destes reprovar, `.inverso` deixou de ser a inversão do sistema e
    // virou um segundo tema com metade dos cuidados.
    ["texto / tinta", "papel", "tinta", 4.5],
    ["texto-suave / tinta", "papel-suave", "tinta", 4.5],
    // Sobre tinta o laranja da marca é legível como texto, e é por isso que
    // `.inverso` troca o link do queimado para o laranja cheio.
    ["link (laranja cheio) / tinta", "laranja", "tinta", 4.5],
    ["papel-2 / tinta", "papel-2", "tinta", 4.5],
  ],
  "a marca — o laranja medido das peças": [
    // #fb7402 é o laranja exato do lockup (amostrado, não aproximado). Ele NÃO
    // foi clareado para caber na banda clara: sobre papel dá 2.55:1 e reprova
    // como texto, então nesta direção ele deixa de ser cor de texto e vira
    // SUPERFÍCIE — com tinta quente por cima, 6.96:1. Quem carrega laranja em
    // texto sobre papel é o queimado `--laranja-tinta`.
    ["laranja PURO como texto / papel (REPROVA de propósito)", "laranja", "papel", 4.5],
    ["acento-texto / acento (o par que o botão usa)", "tinta-quente", "laranja", 4.5],
    ["papel sobre acento (REPROVA de propósito)", "papel", "laranja", 4.5],
    // O `.olho` é um bloco chapado de laranja com a tinta quente por cima, em
    // t-sm: texto normal, então 4.5 e não 3.
    ["olho: tinta-quente / laranja", "tinta-quente", "laranja", 4.5],
  ],
  "fios: WCAG 1.4.11 pede 3 para componente, 1 para decoração": [
    // O fio ESTRUTURAL é tinta cheia, e é ele que desenha contorno de campo,
    // borda de botão e régua do índice. Na direção anterior este era o par que
    // mais apertava (borda discreta sobre cartão escuro, 1.86:1 e reprovando);
    // aqui o contorno do componente é o mesmo objeto que o resto da página.
    ["fio-forte (contorno de campo, borda de botão) / papel", "tinta", "papel", 3],
    ["fio-forte / papel-2", "tinta", "papel-2", 3],
    ["fio-forte invertido / tinta", "papel", "tinta", 3],
    // O fio FRACO é divisória decorativa e só isso. Está medido contra 3 logo
    // abaixo, reprovando de propósito, para deixar registrado por que os dois
    // são tokens diferentes em vez de um só reaproveitado.
    ["fio-fraco (divisória) / papel", "fio-fraco", "papel", 1],
    ["fio-fraco como contorno de componente (REPROVA de propósito)", "fio-fraco", "papel", 3],
    ["fio-fraco invertido (tinta-2) / tinta", "tinta-2", "tinta", 1],
  ],
  "foco — inverte junto com a banda": [
    // `--foco` é a própria tinta e vira papel dentro de `.inverso`, então o
    // anel nunca cai na superfície em que ele sumiria. Na direção anterior o
    // anel era dourado e sumia sobre o laranja do botão (1.71:1); aqui a
    // exceção continua existindo pelo mesmo motivo e com o mesmo remédio.
    ["foco / papel", "tinta", "papel", 3],
    ["foco / tinta", "papel", "tinta", 3],
    ["foco sobre o botão laranja (tinta quente) / acento", "tinta-quente", "laranja", 3],
    ["foco tinta sobre acento — o que aconteceria sem a troca", "tinta", "laranja", 3],
  ],
  "estados do formulário — par fechado, independente da banda": [
    // Fundo claro do estado com o texto escuro do MESMO estado: o aviso não
    // herda `--texto`, senão dentro de uma seção invertida ele seria texto
    // claro sobre fundo claro. Cor nunca é o único sinal — o aviso carrega
    // texto e o campo recusado leva aria-invalid.
    ["erro: texto / fundo do aviso", "erro", "erro-fundo", 4.5],
    // O contorno do campo recusado tem token PRÓPRIO (`--erro-fio`), medido
    // contra as duas bandas: o mesmo formulário aparece na capa (papel) e no
    // fechamento (tinta). As duas linhas seguintes são o gate desse token; a
    // terceira registra o que aconteceria sem ele, e foi assim que o defeito
    // apareceu — 2.48:1, borda vermelha que ninguém veria.
    ["erro: contorno do campo / papel", "erro-fio", "papel", 3],
    ["erro: contorno do campo / tinta", "erro-fio", "tinta", 3],
    ["erro: contorno com o vermelho do texto / tinta — sem a troca", "erro", "tinta", 3],
    ["erro: contorno / fundo do próprio aviso", "erro-fio", "erro-fundo", 3],
    ["ok: texto / fundo", "ok", "ok-fundo", 4.5],
    ["ok: contorno / papel", "ok", "papel", 3],
  ],
  "botões": [
    ["primário: rótulo / superfície", "tinta-quente", "laranja", 4.5],
    // Hover do primário: INVERTE (fundo de tinta, rótulo em laranja) em vez de
    // escurecer o laranja. É a mesma manobra do resto da direção, e o par
    // continua sendo medido.
    ["primário hover: laranja / tinta", "laranja", "tinta", 4.5],
    ["contorno: rótulo / papel", "tinta", "papel", 4.5],
    ["contorno: borda / papel", "tinta", "papel", 3],
    ["contorno hover: papel / tinta", "papel", "tinta", 4.5],
    // Botão travado durante o envio. `aria-disabled`, não `disabled`: continua
    // na árvore de acessibilidade, então o rótulo continua tendo de ser lido.
    ["travado: rótulo / fundo do travado", "tinta", "fio-fraco", 4.5],
  ],
  "rodapé e trilha": [
    // O rodapé é `.inverso` inteiro, então ele reusa a banda tinta. O que é
    // próprio dele é o número da linha do índice em laranja.
    ["número do índice: laranja / tinta", "laranja", "tinta", 4.5],
    // Na linha sob o ponteiro a linha inteira vira papel: o número precisa
    // trocar para o queimado junto, senão fica laranja cheio sobre papel.
    ["número sob o ponteiro: laranja-tinta / papel", "laranja-tinta", "papel", 4.5],
    ["nota da linha sob o ponteiro: tinta-suave / papel", "tinta-suave", "papel", 4.5],
    ["trilha: separador / papel", "fio-fraco", "papel", 1],
  ],
};

let reprovas = 0;
const cor = (n) => T[n] ?? (() => { throw new Error(`token inexistente: ${n}`); })();

for (const [grupo, pares] of Object.entries(PARES)) {
  console.log(`\n── ${grupo} ${"─".repeat(Math.max(0, 46 - grupo.length))}`);
  for (const [rotulo, a, b, min] of pares) {
    const r = razao(cor(a), cor(b));
    const proposital = rotulo.includes("REPROVA de propósito") || rotulo.includes("sem a troca");
    const ok = r >= min || proposital;
    if (!ok) reprovas++;
    console.log(`${ok ? "  ok " : "FALHA"} ${r.toFixed(2).padStart(6)}:1  (min ${min})  ${rotulo}`);
  }
}

console.log("\n── tokens resolvidos (sRGB) ───────────────────────");
for (const [n, v] of Object.entries(T)) console.log(`  ${n.padEnd(14)} ${hex(v)}`);

console.log(reprovas ? `\n${reprovas} par(es) reprovando.` : "\nTodos os pares passam.");
process.exit(reprovas ? 1 : 0);
