"""Gera a placa fotografica da capa a partir da peca de captacao da casa.

DIRECAO DE ARTE: `asfalto` (25/08/2026). A direcao anterior, `rastro`, tinha
uma noite CHAPADA (--fundo #050b14 solido) enquanto a peca que originou a
paleta e cheia de materia: rastro de farol em exposicao longa, ceu urbano,
asfalto molhado refletindo. O site ficou com a cor da peca e sem o material
dela. Esta placa fecha essa distancia.

DE ONDE VEM. Da propria peca da Autogestor Seguros (docs/seguros/ do hub,
agosto/2026) — ativo da casa, sem terceiro envolvido, mesma decisao que fez o
simbolo ser a sub-marca e nao um desenho novo. NAO e imagem de banco.

O RECORTE E UM SO E NAO FOI ESCOLHIDO POR GOSTO. A peca e 1120x1120 e tem
texto em quase toda ela: o lockup no topo, "ECONOMIZE NO SEGURO" a esquerda,
tres pilulas de argumento em y~455-495, a linha "CARRO - MOTO - CAMIONETE -
CAMINHAO" em y~750 e a pilula branca de logotipos abaixo. Sobra UM retangulo
limpo, (0, 495) a (1120, 745), e ele e justamente o assunto: os quatro
veiculos sobre asfalto molhado, com os rastros quentes e o skyline atras.

Os limites sao medidos, nao estimados — recortes de teste em C:/tmp/bordas.png
mostraram a pilula terminando em y~490 e o texto comecando em y~750. Encostar
neles reapareceria como uma tarja borrada na borda da faixa.

A PROPORCAO MANDA NO LAYOUT, NAO O CONTRARIO. 1120x250 e 4.48:1 — uma faixa
larga e baixa. Entao a placa entra na capa COMO FAIXA (o horizonte no pe da
primeira tela), e nao como fundo de tela cheia. Forcar 16:9 aqui significaria
esticar ou inventar ceu, e as duas saidas mentem sobre o material.

A GRADACAO. Tres operacoes, nesta ordem, e nenhuma "melhora" a foto:

  1. sombra puxada para o navy da paleta (--noite-950 #050b14), com peso
     (1-L)^2. E o que faz a mascara CSS do topo da faixa dissolver na pagina
     sem costura visivel: se o preto da foto for neutro e o fundo do site for
     azulado, a juncao aparece como uma faixa mais fria.
  2. luminancia geral em 0.92. A faixa e recompensa visual, nao superficie de
     leitura — mas ela encosta no formulario, e foto em brilho cheio ao lado
     de um campo de input rouba a atencao de quem ia preencher.
  3. grao fino (sigma 2.4/255) DEPOIS da ampliacao. A fonte tem 1120px de
     largura e a faixa e servida a 1600 — a ampliacao amacia. Grao sobre o
     amaciado le como fotografia noturna de exposicao longa; sem ele, le como
     imagem esticada. E o mesmo motivo de o cinema colocar grao de volta.

O amarelo/laranja dos farois e dos rastros NAO e tocado em nenhum passo: e a
cor da marca aparecendo como luz real, que e o argumento inteiro da direcao.

WEBP E NAO AVIF. O AVIF sai menor (53,8 KB contra 61,3 KB na versao de 1600px
que existia entao) e a escolha obvia seria ele. Medido, sob CPU 4x estrangulada
e com 7 amostras, o LCP mediano foi

    AVIF primeiro   2748 ms   (2444 .. 3412)
    WebP primeiro   1456 ms   (1160 .. 3144)

RESSALVA HONESTA sobre esses dois numeros: foram colhidos quando a placa ainda
era o elemento de LCP da pagina (havia um parallax nela, cortado depois — ver
o bloco "A CAMADA QUE FOI CORTADA" em index.astro). Hoje o LCP e o H1, entao a
diferenca de decodificacao ja nao aparece nessa metrica. O que continua valendo
e o mecanismo: decodificar AVIF custa CPU, o publico desta pagina e majorita-
riamente celular, e 39,9 KB de WebP nao doem em banda nenhuma.

Se um dia alguem quiser AVIF de volta, o caminho e remedir — nao deduzir do
tamanho do arquivo. Menor em bytes nao e mais rapido em pixel na tela.

Saida: public/img/placa-1600.webp e placa-800.webp. Rode com `npm run placa`.
"""

from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FONTE = Path(r"C:/dev/autogestor/docs/seguros/98eb56e398284dd197993a5f80c61829.png")
SAIDA = RAIZ / "public" / "img"

# O unico retangulo da peca sem texto. Medido, ver docstring. 1120x250 = 4.48:1.
RECORTE = (0, 495, 1120, 745)

# A faixa na tela e mais larga que o recorte: 1440x270 num notebook = 5.33:1.
# Cortar essa diferenca AQUI e nao no `object-fit: cover` do navegador nao muda
# um pixel do que se ve — e o mesmo corte — e poupa decodificar 16% da imagem.
# Ver ALVOS abaixo para o resto da conta.
PROPORCAO = 1440 / 270

# --noite-950, o mesmo valor de global.css. Se um dia a paleta mudar, este
# numero muda junto ou a costura do topo da faixa reaparece.
NAVY = np.array([0x05, 0x0B, 0x14], dtype=np.float64) / 255.0

PESO_SOMBRA = 0.55
LUMINANCIA = 0.92
GRAO_SIGMA = 2.4 / 255.0

# TETO DE 1200px, E ELE E O CONSERTO DE UMA REPROVACAO REAL.
#
# A primeira versao servia 1600x357 e o verificador reprovou: LCP mediano de
# 2432 ms contra o teto de 2000 ms do orcamento assinado. O custo nao estava na
# banda (61 KB chegam em nada) e sim em DECODIFICAR — 571.200 pixels com a CPU
# a 1/4 da velocidade. Cortado para a proporcao de tela e limitado a 1200px:
#
#     antes   1600 x 357  = 571.200 px
#     agora   1200 x 225  = 270.000 px   (47% do anterior)
#
# Numa janela de 1440 o navegador amplia 1,2x. Numa fotografia noturna com grao
# e com os primeiros 30% dissolvidos na mascara, essa ampliacao nao se ve — e o
# tipo de nitidez que so existe no arquivo, nunca no olho. Trocar isso por 1,2 s
# de LCP numa pagina de captacao nao e economia, e o negocio.
LARGURAS = (1200, 600)


def graduar(rgb: np.ndarray) -> np.ndarray:
    """Sombra para o navy da paleta, luminancia geral abaixo. Sem tocar no quente."""
    # Rec. 709: o verde domina a percepcao de brilho, e usar a media achataria
    # os farois (que sao quase puro vermelho+verde) contra o ceu azul.
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722])
    peso = ((1.0 - lum) ** 2 * PESO_SOMBRA)[..., None]
    return np.clip(rgb * (1.0 - peso) + NAVY * peso, 0.0, 1.0) * LUMINANCIA


def granular(rgb: np.ndarray, semente: int = 7) -> np.ndarray:
    """Grao monocromatico. Colorido viraria ruido de sensor, nao filme."""
    ruido = np.random.default_rng(semente).normal(0.0, GRAO_SIGMA, rgb.shape[:2])
    return np.clip(rgb + ruido[..., None], 0.0, 1.0)


def main() -> None:
    if not FONTE.exists():
        raise SystemExit(f"peca de origem nao encontrada: {FONTE}")

    base = Image.open(FONTE).convert("RGB").crop(RECORTE)
    l, t, r, b = RECORTE
    assert base.size == (r - l, b - t), base.size

    # O mesmo corte que o `object-fit: cover` faria, feito antes de codificar.
    # 62% e nao o centro, igual ao `object-position` do CSS: puxa para o asfalto
    # molhado e joga para fora os tetos cortados na borda de cima do recorte.
    alvo_h = round(base.width / PROPORCAO)
    assert alvo_h <= base.height, f"o recorte ja e mais baixo que a proporcao alvo: {alvo_h} > {base.height}"
    topo = round((base.height - alvo_h) * 0.62)
    base = base.crop((0, topo, base.width, topo + alvo_h))

    SAIDA.mkdir(parents=True, exist_ok=True)
    for largura in LARGURAS:
        altura = round(base.height * largura / base.width)
        img = base.resize((largura, altura), Image.LANCZOS)

        rgb = np.asarray(img, dtype=np.float64) / 255.0
        rgb = granular(graduar(rgb))
        tratada = Image.fromarray((rgb * 255.0 + 0.5).astype(np.uint8), "RGB")

        destino = SAIDA / f"placa-{largura}.webp"
        tratada.save(destino, "WEBP", quality=76, method=6)
        print(f"{destino.relative_to(RAIZ)}  {largura}x{altura}  {destino.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
