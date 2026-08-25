"""Gera a marca da Autogestor Seguros por formula e escreve os derivados.

O simbolo e o hexagono biselado com vortice das pecas de captacao da propria
Autogestor Seguros (docs/seguros/ do hub, agosto/2026) — nao e marca de
terceiro, e a sub-marca da casa. O que muda aqui: ele deixa de ser um desenho
e passa a ser CALCULADO, para poder existir em qualquer tamanho, virar
mascara CSS e nunca depender de alguem reabrir um .ai.

Geometria, em viewBox 0 0 100 100:

  hexagono  6 vertices em raio constante, ponta em cima e embaixo (aresta
            vertical na esquerda e na direita) — a silhueta da peca. Anel, nao
            solido: e a moldura que sobra quando o vortice some a 16px.
  vortice   DUAS espirais logaritmicas r = R_OUT * e^(-K*t), defasadas em 180
            graus, cada uma afinando ate a ponta. E a mesma familia de curva do
            rastro de farol em exposicao longa que da nome a direcao de arte
            deste site: o simbolo e o gesto da pagina em miniatura, nao um
            enfeite que por acaso mora no cabecalho.

Nada e desenhado a mao. O contorno de cada braco sai de amostrar a espiral e
deslocar por uma meia-largura que decai — borda externa na ida, interna na
volta, fechando num ponto. Mudar SWEEP, K ou W0 muda a marca inteira de forma
previsivel; mexer em coordenada solta, nao.

Uso:  python logos/gerar-marca.py
Depois:  node logos/rasterizar.mjs   (icones PNG, usa o sharp do projeto)
         node logos/gerar-og.mjs     (imagem de compartilhamento)
"""

import math
import os

# ---------------------------------------------------------------- paleta
# Amostrada em pixel das duas pecas de captacao com Pillow (mediancut por
# regiao do lockup). Nao sao valores "proximos do laranja da marca": sao os
# valores que as pecas usam.
LARANJA = "#fb7402"       # o laranja de "SEGUROS" no lockup e da faixa PROTEJA
LARANJA_ALTO = "#ffa040"  # ponta clara do braco quente
AZUL = "#1266b8"          # azul do hexagono no lockup
AZUL_ALTO = "#5786c0"     # realce do bisel, medido no mesmo hexagono
AZUL_FUNDO = "#004485"    # sombra do bisel

# ---------------------------------------------------------------- geometria
CX, CY = 50.0, 50.0

R_HEX = 47.0       # circunraio do hexagono (ate o vertice)
ESP_HEX = 7.0      # espessura do anel
# Inraio interno do anel: e o teto do que o vortice pode ocupar sem encostar.
IN_HEX = R_HEX * math.cos(math.radians(30)) - ESP_HEX

R_OUT = 25.0       # raio onde cada braco comeca (a parte grossa)
K = 2.05           # decaimento: r(1)/r(0) = e^-K  ->  ~1/7.8
SWEEP = 330.0      # varredura de cada braco, em graus
W0 = 7.0           # meia-largura na base do braco
TAPER = 0.85       # expoente do afinamento; <1 segura a grossura mais tempo
FASE = 118.0       # angulo inicial do braco quente
AMOSTRAS = 64      # pontos por borda


def f(v):
    """Numero curto: 3 casas viram ruido de bytes num arquivo de icone."""
    return f"{v:.2f}".rstrip("0").rstrip(".")


def pt(r, th, cx=CX, cy=CY):
    """Polar -> cartesiano no sistema do SVG (y para baixo)."""
    return (cx + r * math.cos(math.radians(th)), cy - r * math.sin(math.radians(th)))


def hexagono(r):
    """Path fechado de hexagono com ponta em cima e embaixo."""
    pts = [pt(r, 90 + 60 * i) for i in range(6)]
    d = "M" + f(pts[0][0]) + " " + f(pts[0][1])
    for x, y in pts[1:]:
        d += "L" + f(x) + " " + f(y)
    return d + "Z"


def braco(fase):
    """Contorno de um braco do vortice: espiral logaritmica com largura que decai.

    Ida pela borda externa (r + w), volta pela interna (r - w). Como w(1) = 0,
    as duas bordas se encontram e a PONTA fecha sozinha — sem `linecap` e sem
    numero magico para "arredondar a pontinha".

    A CAUDA (t = 0) e o caso oposto: ali as duas bordas estao afastadas de
    2*W0, e ligar uma a outra em linha reta corta o braco num talho chato — foi
    o que a primeira geracao fez, e se ve na renderizacao. Fecha com um
    semicirculo de raio W0 centrado no eixo, que e exatamente o `linecap`
    redondo que a peca original tem, so que calculado em vez de herdado de um
    atributo que `fill` nao respeita.
    """
    fora, dentro = [], []
    for i in range(AMOSTRAS + 1):
        t = i / AMOSTRAS
        r = R_OUT * math.exp(-K * t)
        th = fase + SWEEP * t
        w = W0 * (1.0 - t) ** TAPER
        fora.append(pt(r + w, th))
        dentro.append(pt(max(r - w, 0.0), th))

    d = "M" + f(fora[0][0]) + " " + f(fora[0][1])
    for x, y in fora[1:]:
        d += "L" + f(x) + " " + f(y)
    for x, y in reversed(dentro[1:]):
        d += "L" + f(x) + " " + f(y)
    # Sweep-flag 0, medido e nao deduzido: com 1 o semicirculo abaula PARA
    # DENTRO do braco e a cauda vira uma garra com entalhe concavo (visto na
    # renderizacao da geracao anterior). O caminho fecha de `dentro` para
    # `fora`, e desse sentido a volta por fora e a de flag 0.
    d += "A" + f(W0) + " " + f(W0) + " 0 0 0 " + f(fora[0][0]) + " " + f(fora[0][1])
    return d + "Z"


# O braco quente nao pode encostar no anel: se encostar, a 24px o vortice e o
# hexagono viram uma mancha so e a marca perde a leitura. Verificado por
# calculo, nao no olho — o maior raio ocupado e r(0) + w(0).
_ocupado = R_OUT + W0
assert _ocupado < IN_HEX - 1.0, (
    "vortice (" + f(_ocupado) + ") encosta no anel (inraio interno "
    + f(IN_HEX) + "). Reduza R_OUT ou W0, ou aumente R_HEX."
)


# ---------------------------------------------------------------- saida
def gradiente(id_, c0, c1, x1, y1, x2, y2):
    return (
        '<linearGradient id="' + id_ + '" gradientUnits="userSpaceOnUse" '
        + 'x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '">'
        + '<stop offset="0" stop-color="' + c0 + '"/>'
        + '<stop offset="1" stop-color="' + c1 + '"/>'
        + "</linearGradient>"
    )


def marca(cor_anel, cor_quente, cor_frio):
    """O simbolo inteiro. Uma cor por parte — quem chama decide se sao
    gradientes (logo.svg) ou uma so (mascara)."""
    vazio = hexagono(R_HEX - ESP_HEX / math.cos(math.radians(30)))
    anel = (
        '<path fill="' + cor_anel + '" fill-rule="evenodd" d="'
        + hexagono(R_HEX) + vazio + '"/>'
    )
    frio = '<path fill="' + cor_frio + '" d="' + braco(FASE + 180) + '"/>'
    quente = '<path fill="' + cor_quente + '" d="' + braco(FASE) + '"/>'
    # Frio primeiro: nas pecas o braco azul passa POR TRAS do laranja.
    return anel + frio + quente


DEFS = (
    "<defs>"
    + gradiente("ga", AZUL_ALTO, AZUL_FUNDO, 20, 6, 80, 94)
    + gradiente("gq", LARANJA_ALTO, LARANJA, 30, 26, 74, 78)
    + gradiente("gf", AZUL, AZUL_FUNDO, 26, 74, 70, 22)
    + "</defs>"
)


def svg(interno, defs=""):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
        + 'role="img" aria-label="Autogestor Seguros">'
        + defs + interno + "</svg>"
    )


def escrever(caminho, conteudo):
    os.makedirs(os.path.dirname(caminho) or ".", exist_ok=True)
    with open(caminho, "w", encoding="utf-8", newline="\n") as fp:
        fp.write(conteudo)
    print(str(len(conteudo)).rjust(7) + " B  " + caminho)


raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def p(*xs):
    return os.path.join(raiz, *xs)


CHEIA = marca("url(#ga)", "url(#gq)", "url(#gf)")

# 1. logo.svg — cores fixas. E o que a rasterizacao le e o vetor de reserva.
escrever(p("public", "img", "logo.svg"), svg(CHEIA, DEFS))

# 2. logo-mono.svg — uma cor so, em currentColor. E a MASCARA do gesto de marca
#    (.selo no global.css): mascara le alfa, entao gradiente seria desperdicio.
escrever(
    p("public", "img", "logo-mono.svg"),
    svg(marca("currentColor", "currentColor", "currentColor")),
)

# 3. favicon.svg — sem variante clara/escura: este site e escuro por decisao de
#    direcao, e o simbolo ja tem contraste proprio sobre qualquer fundo.
escrever(p("public", "favicon.svg"), svg(CHEIA, DEFS))

# 4. Logo.astro — inline na pagina, e nao <img>, para o simbolo herdar tokens
#    quando precisar e para nao custar uma requisicao no caminho critico.
GRAD_ASTRO = (
    '<linearGradient id="ag-anel" gradientUnits="userSpaceOnUse" x1="20" y1="6" x2="80" y2="94">'
    '<stop offset="0" stop-color="var(--lg-anel-0)"/><stop offset="1" stop-color="var(--lg-anel-1)"/>'
    "</linearGradient>"
    '<linearGradient id="ag-quente" gradientUnits="userSpaceOnUse" x1="30" y1="26" x2="74" y2="78">'
    '<stop offset="0" stop-color="var(--lg-quente-0)"/><stop offset="1" stop-color="var(--lg-quente-1)"/>'
    "</linearGradient>"
    '<linearGradient id="ag-frio" gradientUnits="userSpaceOnUse" x1="26" y1="74" x2="70" y2="22">'
    '<stop offset="0" stop-color="var(--lg-frio-0)"/><stop offset="1" stop-color="var(--lg-frio-1)"/>'
    "</linearGradient>"
)

astro = """---
/* Gerado por logos/gerar-marca.py — nao editar a mao, rode `npm run marca`. */
interface Props { size?: number; class?: string; titulo?: string }
const { size = 40, class: klass, titulo } = Astro.props;
---

<svg
  class:list={["logo", klass]}
  width={size}
  height={size}
  viewBox="0 0 100 100"
  role={titulo ? "img" : "presentation"}
  aria-label={titulo}
  aria-hidden={titulo ? undefined : "true"}
  focusable="false"
>
  <defs>__GRAD__</defs>
  __MARCA__
</svg>

<style>
  .logo {
    --lg-anel-0: __AZUL_ALTO__;
    --lg-anel-1: __AZUL_FUNDO__;
    --lg-quente-0: __LARANJA_ALTO__;
    --lg-quente-1: __LARANJA__;
    --lg-frio-0: __AZUL__;
    --lg-frio-1: __AZUL_FUNDO__;

    display: block;
  }
</style>
"""

astro = (
    astro.replace("__GRAD__", GRAD_ASTRO)
    .replace("__MARCA__", marca("url(#ag-anel)", "url(#ag-quente)", "url(#ag-frio)"))
    .replace("__LARANJA_ALTO__", LARANJA_ALTO)
    .replace("__LARANJA__", LARANJA)
    .replace("__AZUL_ALTO__", AZUL_ALTO)
    .replace("__AZUL_FUNDO__", AZUL_FUNDO)
    .replace("__AZUL__", AZUL)
)
escrever(p("src", "components", "Logo.astro"), astro)
