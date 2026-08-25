// Mede todos os pares de contraste do sistema de design.
//   node logos/contraste.mjs
// Nenhum valor entra em src/styles/global.css sem ter passado por aqui —
// Princípio V da constituição: contraste é restrição de escolha, não checagem
// final. Sai da suíte de teste de propósito: `npm test` valida lógica, isto
// valida uma decisão de design, e é rodado quando a paleta muda.
//
// UM tema só, e não dois como no coopluz: este site é escuro por decisão de
// direção de arte (ver o carimbo no topo de global.css). Não existe seletor
// claro/escuro para medir.
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const razao = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [rótulo, frente, fundo, mínimo] — 4.5 texto normal, 3 texto grande e contorno
// de componente (WCAG 1.4.11), 1 para separador puramente decorativo.
const PARES = {
  "texto sobre as três superfícies": [
    ["texto / fundo", "#f2f5f9", "#050b14", 4.5],
    ["texto / superficie", "#f2f5f9", "#0a1523", 4.5],
    ["texto / superficie-alta (cartão, formulário)", "#f2f5f9", "#101e31", 4.5],
    ["texto-suave / fundo", "#9aa7b8", "#050b14", 4.5],
    ["texto-suave / superficie", "#9aa7b8", "#0a1523", 4.5],
    ["texto-suave / superficie-alta", "#9aa7b8", "#101e31", 4.5],
  ],
  "marca — o laranja medido das peças": [
    // #fb7402 é o laranja exato do lockup (amostrado, não aproximado). Sobre o
    // navy da página ele passa como texto normal, e é por isso que a marca não
    // precisou ser clareada para caber no sistema: o fundo escuro é que a
    // acomoda. Sobre BRANCO o mesmo laranja daria 2.9:1 — mais uma razão de a
    // banda escura não ser gosto.
    ["laranja-500 (olho, ênfase) / fundo", "#fb7402", "#050b14", 4.5],
    ["laranja-500 / superficie", "#fb7402", "#0a1523", 4.5],
    ["laranja-500 / superficie-alta", "#fb7402", "#101e31", 4.5],
    ["laranja-400 (link em texto corrido) / fundo", "#ff8c33", "#050b14", 4.5],
    ["laranja-400 / superficie-alta", "#ff8c33", "#101e31", 4.5],
    ["dourado-400 (número da prova) / fundo", "#f5be5b", "#050b14", 4.5],
    ["dourado-400 / superficie-alta", "#f5be5b", "#101e31", 4.5],
  ],
  "CTA — o botão laranja": [
    // Mesma manobra do hub com o laranja dele e do coopluz com o verde: a cor
    // da marca NÃO é escurecida para passar; quem muda é o texto em cima dela.
    ["acento-texto / acento", "#1a0b00", "#fb7402", 4.5],
    ["branco / acento (REPROVA de propósito)", "#ffffff", "#fb7402", 4.5],
    ["acento-texto / acento-hover", "#1a0b00", "#e26800", 4.5],
  ],
  "contorno e foco (WCAG 1.4.11 pede 3, não 4.5)": [
    // O contorno do campo é o par que mais reprova em tema escuro: a borda
    // discreta que fica bonita sobre o cartão não chega a 3:1. Aqui ele é
    // deliberadamente mais claro que a borda decorativa — são tokens
    // diferentes justamente porque o mínimo é diferente.
    ["contorno de campo / superficie-alta", "#8b9bb0", "#101e31", 3],
    ["contorno de campo / fundo do input", "#8b9bb0", "#0a1523", 3],
    ["borda decorativa / superficie-alta", "#27405f", "#101e31", 1],
    ["borda decorativa / fundo", "#27405f", "#050b14", 1],
    ["foco / fundo", "#fcc330", "#050b14", 3],
    ["foco / superficie-alta", "#fcc330", "#101e31", 3],
    // O dourado do anel de foco sobre o LARANJA do botão primário dá 1.71:1 e
    // some — dois quentes vizinhos na roda. Medido antes de existir, não
    // descoberto na tela. A correção não afina a cor da marca: sobre superfície
    // laranja o anel troca para a mesma tinta escura do rótulo do botão
    // (`--acento-texto`), que já é o par legível daquele fundo.
    ["foco dourado / acento (REPROVA de propósito — por isso a troca abaixo)", "#fcc330", "#fb7402", 3],
    ["foco sobre acento (tinta) / acento", "#1a0b00", "#fb7402", 3],
    ["foco sobre acento (tinta) / acento-hover", "#1a0b00", "#e26800", 3],
  ],
  "estados do formulário": [
    // Cor nunca é o único sinal: o aviso sempre carrega texto e o campo
    // recusado leva aria-invalid. Estes números são para o texto ser legível,
    // não para a cor comunicar sozinha.
    ["erro-texto / erro-fundo", "#ffd5cf", "#4a1410", 4.5],
    ["erro (contorno do campo) / superficie-alta", "#ff6b57", "#101e31", 3],
    ["ok-texto / ok-fundo", "#c9f2d8", "#0c3a22", 4.5],
    ["ok (contorno) / superficie-alta", "#3fbf74", "#101e31", 3],
  ],
  "o rastro (gesto da direção) e a faixa de prova": [
    // O rastro é decorativo e aria-hidden: não carrega informação, então o
    // mínimo é 1. Medido mesmo assim para garantir que ele APAREÇA — um gesto
    // que some no fundo é um gesto que não existe.
    ["rastro aceso / fundo", "#fb7402", "#050b14", 1],
    // O trilho: o percurso ainda não percorrido. Mínimo 1 porque é decorativo,
    // mas medido para garantir que APAREÇA — a --noite-700 (1.40:1) sumia no
    // fundo e o rastro parecia nascer do nada. Baixo de propósito: o trilho não
    // pode competir com a parte acesa.
    ["rastro apagado (trilho) / fundo", "#27405f", "#050b14", 1],
    ["halo do rastro / fundo", "#ff8c33", "#050b14", 1],
    // Nomes das seguradoras: tipografia, não logotipo. É texto que se lê.
    ["nome de seguradora / superficie", "#c7d0dc", "#0a1523", 4.5],
    ["azul-400 (bisel da marca) / fundo", "#5786c0", "#050b14", 4.5],
    // O número grande da estação: nasce só contorno e ACENDE quando o rastro
    // chega. Apagado ele é decorativo (o texto do h2 ao lado carrega a
    // informação), aceso ele é o rótulo da seção e vale 3:1 de texto grande.
    ["numero da estacao apagado / fundo", "#27405f", "#050b14", 1],
    ["numero da estacao aceso / fundo", "#fb7402", "#050b14", 3],
    ["numero da estacao aceso / superficie", "#fb7402", "#0a1523", 3],
  ],
  "rodapé e estados de botão": [
    ["texto-sobre-marca / superficie-marca", "#c7d0dc", "#0a1523", 4.5],
    ["texto-sobre-marca-suave / superficie-marca", "#9aa7b8", "#0a1523", 4.5],
    ["link-sobre-marca / superficie-marca", "#ff8c33", "#0a1523", 4.5],
    ["btn--contorno: texto / fundo", "#f2f5f9", "#050b14", 4.5],
    ["btn--contorno: texto / hover", "#f2f5f9", "#18293f", 4.5],
    // A borda do botão de contorno NÃO pode usar a --noite-600 das divisórias:
    // 1.86:1 sobre o fundo, abaixo do 3:1 que WCAG 1.4.11 exige para o limite
    // de um componente interativo (divisória decorativa pode ficar em 1.86, o
    // contorno de um botão não). Foi medido antes de a página existir. O
    // degrau --noite-500 é o mais ESCURO da rampa que ainda passa nas três
    // superfícies onde o botão aparece — subir mais transformaria contorno em
    // moldura e roubaria peso do botão primário.
    ["btn--contorno: borda / fundo", "#4f6b90", "#050b14", 3],
    ["btn--contorno: borda / superficie", "#4f6b90", "#0a1523", 3],
    ["btn--contorno: borda / superficie-alta", "#4f6b90", "#101e31", 3],
    ["noite-600 como borda de botao (REPROVA de propósito)", "#27405f", "#050b14", 3],
    // Botão travado durante o envio. `aria-disabled`, não `disabled`: continua
    // na árvore de acessibilidade, então o rótulo continua tendo de ser lido.
    ["btn travado: rotulo / fundo do travado", "#9aa7b8", "#1a2c45", 4.5],
    ["trilha: separador / superficie", "#27405f", "#0a1523", 1],
    ["chip: marca-forte / azul-100", "#ff8c33", "#12243c", 4.5],
    ["hover de nav: texto / cinza-100", "#f2f5f9", "#18293f", 4.5],
  ],
};

let reprovas = 0;
for (const [grupo, pares] of Object.entries(PARES)) {
  console.log(`\n── ${grupo} ${"─".repeat(Math.max(0, 46 - grupo.length))}`);
  for (const [rotulo, a, b, min] of pares) {
    const r = razao(a, b);
    const proposital = rotulo.includes("REPROVA de propósito");
    const ok = r >= min || proposital;
    if (!ok) reprovas++;
    console.log(`${ok ? "  ok " : "FALHA"} ${r.toFixed(2).padStart(6)}:1  (min ${min})  ${rotulo}`);
  }
}
console.log(reprovas ? `\n${reprovas} par(es) reprovando.` : "\nTodos os pares passam.");
process.exit(reprovas ? 1 : 0);
