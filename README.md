# Autogestor Seguros — site da vertical de seguro veicular

Site em `seguros.roilabs.com.br`, operado pelo **Grupo Autogestor** (corretora
de seguros, SUSEP 202070004, desde 2004). Extraído do hub `autogestor`
(`C:\dev\autogestor`) como projeto irmão independente, no mesmo padrão que o
`coopluz` (`C:\dev\coopluz`) inaugurou.

## Rodando localmente

```powershell
npm install
$env:DATABASE_URL = "<mesma connection string do hub>"
npm run dev
```

O Astro carrega `.env` só para `import.meta.env`; o código lê `process.env`,
que é o que a Vercel entrega em runtime — por isso a variável precisa ser
**exportada** no shell antes de `npm run dev`. Copiar `.env.example` para
`.env` não basta.

```bash
npm test         # node --test test/*.test.mjs
npm run build
npm run check    # astro check (tipos) — 0 erros
npm run marca    # regera símbolo, ícones e imagem de compartilhamento
npm run contraste  # mede os 47 pares de cor; falha com código 1 se algum reprovar
node logos/verificar.mjs   # prova no navegador: console, teclado, 3 larguras, LCP
node logos/metricas-fonte.mjs  # remede o size-adjust do fallback da fonte
```

**Verificar tela é sobre o build, não sobre o dev server.** O `astro dev`
injeta a barra de ferramentas do Astro: DOM extra e ~1,8 MB de JavaScript que
não existem em produção. `logos/verificar.mjs` sobe um servidor estático em
cima de `.vercel/output/static` justamente por isso.

## Decisões que não são óbvias no código

**A marca é da casa, e é por isso que a paleta não foi inventada.** Diferente
do Coopluz — onde a identidade é de um terceiro (a cooperativa) e o site
precisa declarar quem o opera em três lugares obrigatórios — aqui a Autogestor
Seguros é dona da própria sub-marca. As cores saíram **amostradas em pixel**
das duas peças de captação de agosto/2026 (`docs/seguros/` do hub): laranja
`#fb7402`, azul do hexágono `#004485`, navy `#010d1e`, dourado `#f5be5b`. Não
são valores "próximos do laranja da marca", são os valores. O que é original
aqui é a **direção, a estrutura e a tipografia** — não uma paleta alheia à
marca que o cliente já roda.

**Banda escura, sem alternador de tema.** Este site não tem seletor
claro/escuro, e a ausência é decisão. O interruptor era o *gesto* do Coopluz (o
cordão da lâmpada); herdá-lo aqui seria pegar emprestado o que faz aquele site
ser ele. Some junto: metade dos tokens (não há `light-dark()`), o script de
pré-pintura do `<head>` e ~120 linhas de JS do cabeçalho.

**A direção é "rastro" (luz · scroll · escura, 0kb de JS).** As duas peças são
noite com rastro de farol em exposição longa. A direção pega esse único
elemento e o transforma na espinha da página: uma linha incandescente na borda
esquerda que acende de cima para baixo com a rolagem, via
`animation-timeline: scroll(root)` — sem listener, sem biblioteca. Cada
"estação" do percurso acende quando a luz chega nela (`view()`). Três
primitivas de movimento e não uma quarta: escala, opacidade e translado. Giro
não existe nesta página de propósito — o Coopluz gastou `rotate` no ímã dele.

**O rastro nunca some.** Sem suporte a scroll-timeline, ou com
`prefers-reduced-motion: reduce`, ele nasce inteiro e parado. E começa em
`scaleY(0.06)`, não em zero: em zero o gesto que dá nome à direção não existe
na primeira tela, que é justamente onde a primeira impressão acontece.

**Nenhum ativo de marca é editado à mão.** `npm run marca` regenera `logo.svg`,
`logo-mono.svg`, `favicon.svg`, os três PNGs de ícone e a imagem de Open Graph.
O símbolo é **calculado**: hexágono de 6 vértices em raio constante e duas
espirais logarítmicas `r = R_OUT·e^(-K·t)` defasadas em 180°, cada uma afinando
até a ponta e fechada na cauda por um semicírculo de raio `W0`. É a mesma
família de curva do rastro — o símbolo é o gesto da página em miniatura. Mudar
`SWEEP`, `K` ou `W0` muda a marca inteira de forma previsível.

Uma asserção no gerador impede o vórtice de encostar no anel: se encostasse, a
24px o símbolo viraria mancha. É verificada por cálculo, não no olho.

**Contraste é medido, não estimado.** `npm run contraste` roda 47 pares e falha
com código 1 se algum reprovar. Ele pegou dois defeitos *antes* de a página
existir:

- O anel de foco dourado sobre o botão laranja dava **1.71:1** e sumiria. A
  correção não afina a cor da marca: sobre superfície laranja o anel troca para
  a mesma tinta escura do rótulo (`--foco` é custom property por isso).
- A borda do botão de contorno usando o token de divisória dava **1.86:1**,
  abaixo do 3:1 que a WCAG 1.4.11 exige para limite de componente interativo.
  Daí existir `--noite-500` separado de `--noite-600` — é contraste, não gosto.

O laranja `#fb7402` dá 7.14:1 sobre o navy e passa como texto normal; sobre
branco daria 2.9:1. A banda escura não é gosto, é o que acomoda a cor da marca
sem clareá-la.

**Fonte de exibição é Big Shoulders Display, e ser condensada é funcional.**
Archivo é do hub, Outfit é do Coopluz. Medida em `logos/metricas-fonte.mjs`,
ela ocupa **75,3%** da largura da pilha do sistema — é o que permite o H1 chegar
a 5.25rem (salto de **5,25×** sobre o corpo) sem empurrar o formulário para
fora da primeira tela. O hub e o Coopluz ficaram travados em 4× pelo motivo
oposto: a fonte deles é larga demais. O `size-adjust` do fallback e os dois
overrides verticais saem da mesma medição, não de chute.

**A macroestrutura é o percurso, não a pilha de seções.** O hub e o Coopluz
compartilham o mesmo ritmo (`.secao > .container > olho + h2 + chamada`). Aqui
a home é uma sequência de **estações** numeradas, em grade assimétrica 5/7 com
a cabeça presa enquanto o corpo rola. Fechar isso era o gate que ficou aberto
no Coopluz. As páginas internas (`/sobre`, legais, recibo) usam `.secao`
simples de propósito: são documentos, não jornadas — encenar um percurso que o
conteúdo não tem seria pior que não ter.

**Exceção declarada: a estação 02 não usa a grade 5/7.** A tabela comparativa
pede 640px e a coluna larga dá ~616, então ela rolava dentro de um container
que não parecia rolável — o leitor via "Ninguém. É associação civil, for"
cortado no meio. Numa comparação, texto cortado é defeito pior que seção sem
assimetria. Visto na captura de 1440px, não deduzido.

**Nomes de seguradora em tipografia, nunca logotipo.** Porto, Allianz, Bradesco
Seguros, HDI, Azul Seguros, Zurich, Mapfre e Itaú são marcas registradas de
terceiros e não há ativo licenciado neste repositório. É a mesma decisão que o
Coopluz tomou com os logos de emissora na seção "Na mídia". O número "8" na
home e no cartão de compartilhamento é **contado da lista** em `consts.ts`,
inclusive dentro de `logos/gerar-og.mjs` — se alguém tirar uma companhia, o
site não passa a mentir por um número que ninguém revisa.

**A distinção seguro × proteção veicular é obrigação de veracidade, não
disclaimer.** As duas coisas cobrem o veículo e têm naturezas jurídicas
diferentes: proteção veicular é rateio entre associados, **não é fiscalizada
pela SUSEP** e não tem a mesma garantia de indenização. Isso aparece no rodapé
de toda página, na estação 02 com as linhas alinhadas por dimensão, no FAQ, nos
Termos e no `llms.txt`. A peça original lista as vantagens de cada lado em
paralelo, sem correspondência — bom para o feed, ruim para decidir. Aqui a
mesma pergunta é feita aos dois lados.

**O slug é `seguro`, não `seguros`.** `seguros` é o subdomínio; `seguro` é o
pipeline. O `/api/lead` do hub já aceita esse valor, os leads gravados usam ele
e o Kanban de `admin.autogestor.roilabs.com.br` lê essa coluna. Renomear
"arrumando" a nomenclatura quebraria o funil sem quebrar nenhum build — por
isso há um teste em `test/lead.test.mjs` que lê `solucoes.ts` como texto e
falha se o slug mudar.

**Mesmo banco do hub, de propósito.** `src/lib/db.ts` e `src/pages/api/lead.ts`
são cópias sem alteração de lógica. Os leads deste site caem nas mesmas tabelas
`crm_leads`/`crm_eventos`, no pipeline `seguro` que o painel do hub **já lê**.
Não existe painel próprio deste site e não deve existir.

**`consts.ts` é duplicado, não importado.** Este repositório não tem dependência
de build no hub (decisão do hub: "nenhum import atravessando a fronteira"). Ao
mudar NAP, telefone, fundação ou horário no hub, replicar aqui manualmente.
Diferente do Coopluz, aqui o telefone é o **mesmo do hub** — é o número já
impresso nas peças de captação da Autogestor Seguros.

**Uma organização no JSON-LD, não duas.** O Coopluz precisa de dois nós
(`publisher` = Autogestor, `about` = a cooperativa). Aqui a Autogestor é as duas
coisas, então um segundo nó seria a mesma entidade declarada duas vezes. O tipo
é `InsuranceAgency`, não `Organization` genérica, e o registro SUSEP entra como
`identifier` com a URL da consulta pública — alegação com caminho de
verificação é o que motor de resposta cita; número solto, não.

**Correção herdada:** o JSDoc de `parseLead` declarava `lead: object`, o que
fazia `npm run check` acusar dois erros de tipo no endpoint. Corrigido aqui com
um `@typedef` e uma asserção única na fronteira de confiança. **O mesmo defeito
existe no repositório do Coopluz** e vale portar.

**Sem blog.** O hub tem a coleção vazia e não há cluster de conteúdo escrito
para seguro. Entra quando houver pesquisa de cluster feita — o esqueleto do
Coopluz mostra o caminho.

## Deploy

Projeto Vercel próprio (não o mesmo do hub), variáveis de ambiente
`DATABASE_URL` (idêntica à do hub) e `SITE_URL=https://seguros.roilabs.com.br`,
domínio `seguros.roilabs.com.br` apontado no projeto — passo manual, fora do
código.

`SITE_URL` inválida (vazia ou sem esquema) não derruba o build: o
`astro.config.mjs` valida com `URL.canParse` e cai no domínio de produção. O
build para de quebrar, mas o canonical fica errado — conferir a variável
continua sendo obrigação.

### O lado do hub

Migrar uma vertical tem duas metades, e publicar só uma recria a canibalização
que a spec 003 do Coopluz existiu para matar. No hub:

- `externo` em `src/data/solucoes.ts` aponta a vertical para cá;
- `/seguro` deixa de ser publicado e responde **301**, declarado em
  `astro.config.mjs`.

Regra: **uma URL, um domínio.** `canonical` cruzada não serve — mantém as duas
páginas servindo 200 e depende de o buscador acatar uma dica.
