<!--
SYNC IMPACT REPORT
==================
Versao: 1.0.0 -> 1.1.0
Tipo de bump: MINOR - principio novo (VI) e escopo corrigido.

Principios adicionados (1):
  VI.  Identidade de terceiro se declara, nao se assume

Principios modificados: nenhum. Os cinco originais valem palavra por palavra.

Escopo corrigido: o arquivo era copia literal da constituicao do hub
`autogestor` - inclusive o titulo ("Autogestor Constitution") e a frase de
escopo, que falava do painel Next.js em `admin/`. Este repositorio NAO tem
`admin/` e nunca teve: o painel continua sendo o do hub, e e decisao registrada
que nao deve existir um segundo. A correcao nao remove nem afrouxa regra
nenhuma - remove uma referencia a codigo que nao esta aqui.

Origem do principio VI: spec 003-identidade-coopluz, FR-012 a FR-015. O site
adota a identidade visual de uma cooperativa que nao o publica; a divulgacao de
quem opera passa a ser requisito verificavel, nao boa pratica.

Artefatos dependentes a revisar:
  - specs/003-identidade-coopluz/plan.md - a tabela "Constitution Check" avalia
    contra a v1.0.0 e trata o risco de identidade dentro do Principio IV. Com o
    VI existindo, a proxima execucao de /speckit-analyze deve avalia-lo
    separadamente. O veredito nao muda: os requisitos que ele exige ja estao
    implementados e verificados.
  - README.md - atualizado na mesma leva.
-->

# Coopluz Goiás Constitution

Aplica-se a este repositório: o site Astro em `coopluz.roilabs.com.br`. O
painel administrativo que lê os leads deste site é o do hub `autogestor` e mora
naquele repositório — aqui não há, e não deve haver, um segundo.

## Core Principles

### I. HTML estático primeiro, JavaScript por exceção

O site público MUST ser gerado como HTML estático (`output: "static"`). Cada
página MUST funcionar por completo sem JavaScript no cliente; script existente
MUST ser realce, nunca requisito. Toda rota dinâmica nova MUST ser justificada
por escrito no PR, e a justificativa MUST ser uma capacidade que HTML estático
não tem — hoje há exatamente duas (`/api/lead` e `/obrigado`, esta última porque
precisa ler `?erro=1` do redirect).

Todo JavaScript novo enviado ao cliente MUST vir com seu custo em bytes medido
e declarado. O orçamento atual do site é ~1 KB; ultrapassá-lo é uma decisão,
não um acidente.

**Rationale**: HTML pronto no source é o que o crawler indexa, é o que dá o
melhor LCP, e é a razão de o Astro ter sido escolhido. O contrapeso
deliberado — onde o custo de JavaScript compra interatividade real — é o painel
do hub: autenticado, sem indexação, e fora deste repositório.

### II. Fonte única por domínio

Cada domínio de dado MUST ter exatamente um arquivo dono: NAP da operadora,
NAP da cooperativa, nome do site e links externos em `src/consts.ts`; verticais
em `src/data/solucoes.ts`; cor em `src/styles/global.css`; o símbolo da marca em
`logos/gerar-marca.py` — e nenhum arquivo derivado dele MUST ser editado à mão.
Rodapé, JSON-LD, formulários e páginas MUST ler do dono, nunca repetir o valor.

As DUAS organizações do `consts.ts` — `EMPRESA` (quem opera o site) e
`COOPERATIVA` (sobre quem o site fala) — MUST permanecer separadas. Fundi-las
num objeto só é exatamente o erro que este princípio existe para evitar, e
desta vez seria erro de veracidade, não só de manutenção.

Duplicação com o repositório do hub é permitida SOMENTE quando os dois builds
não devem se acoplar, e nesse caso o arquivo duplicado MUST carregar, no topo,
o comentário que diz de onde veio, por que não importa o original, e o que
dispara a atualização. `src/consts.ts` e `src/data/solucoes.ts` são os exemplos
canônicos.

**Rationale**: NAP divergente entre rodapé, JSON-LD e página de contato é o erro
clássico que derruba SEO local. Uma etapa de funil que existe no formulário e
não no validador é um lead gravado num estado que ninguém consegue ler.

### III. Simplicidade deliberada e marcada

Antes de somar uma dependência para algo pequeno — parsing, travessia de árvore,
rate limit, formatação — o autor MUST verificar se o padrão do repo já resolve
aquilo em poucas linhas. Dependência nova MUST vir com a alternativa mais
simples nomeada e o motivo da recusa escrito.

Toda simplificação deliberada MUST ser marcada com um comentário `ponytail:` que
nomeia **o teto conhecido** e **o caminho de saída**. Comentário `ponytail:` sem
teto e sem saída não é documentação, é desculpa.

Abstração especulativa é proibida: nada de interface com uma implementação,
fábrica para um produto, configuração para um valor que não muda, ou camada
para "quando crescer". Quando crescer, quem crescer escreve.

**Rationale**: o repo inteiro é pequeno de propósito. Rate limit em `Map`,
`escopoDeCabecalho` em `tabela.mjs` e `LIMIT 500` sem paginação são baratos e
suficientes; o que os mantém honestos é o teto escrito ao lado.

### IV. Falhar fechado, nunca mentir para o usuário

Sem a configuração de que depende, o código MUST recusar em vez de fingir:
`/api/lead` responde 503 sem `DATABASE_URL` e o formulário mostra o WhatsApp;
`admin/proxy.ts` responde 503 em produção sem `ADMIN_SESSION_SECRET`; o painel
exibe o banner de "sem persistência" em vez de renderizar um vazio ambíguo.

Toda entrada vinda do cliente — formulário, query string, payload de server
action — MUST ser validada no servidor contra a lista fixa que vive no dono do
domínio, NUNCA contra o que o cliente enviou. `etapaValida()` e
`pipelineValido()` são a forma dessa regra.

Nenhuma tela MUST afirmar sucesso que não ocorreu. Quando a gravação falha, a
interface MUST desfazer visivelmente o efeito otimista e dizer o que aconteceu.

Segredos MUST ser lidos de `process.env` e NUNCA commitados. Escrita que exige
autoria (histórico de lead) MUST exigir sessão válida e gravar o autor.

**Rationale**: `/obrigado` é renderizada no servidor exatamente por isto — se
fosse estática, quem enviou sem JavaScript e errou o telefone leria "pedido
recebido", e a página mentiria justamente para quem não foi atendido.

### V. Acessibilidade e contraste são requisito

Contraste de texto MUST passar em WCAG AA (4.5:1 para texto normal, 3:1 para
texto grande e para bordas de controle). Quando a cor da marca reprova, MUST-se
trocar o texto, não abandonar o contraste — o CTA laranja usa texto tinta
(5.94:1), não branco (2.93:1).

Estado e status NUNCA MUST ser comunicados só por cor: MUST haver rótulo, ícone
ou forma junto.

Todo controle interativo MUST ser operável por teclado, com foco visível
(`:focus-visible`, jamais `outline: none` sem substituto). Elemento nativo
(`<details>`, `<input type="date">`, `<select>`) MUST ser preferido a réplica em
JavaScript — ganha teclado, estado e semântica de graça.

Componente interativo novo MUST passar pela skill `accessibility` antes do
merge; tela nova ou alterada MUST passar pela `ui-verification` com evidência
(screenshot, passagem de teclado, console) antes de ser declarada pronta.
Animação MUST respeitar `prefers-reduced-motion`.

**Rationale**: é a categoria de defeito que não aparece em teste automatizado,
não é reportada por quem é afetado, e custa dez vezes mais para consertar depois
que a tela existe.

Todo par de cor novo MUST passar por `npm run contraste` antes de entrar no CSS,
e o valor medido MUST ficar escrito ao lado da declaração. Estimativa não conta:
o número que vale é o que a ferramenta devolveu.

### VI. Identidade de terceiro se declara, não se assume

Este site usa a identidade visual da cooperativa Coopluz e não é publicado por
ela. Enquanto isso for verdade, quem opera o site MUST estar declarado em três
lugares, e os três MUST continuar existindo:

1. **No cabeçalho**, junto da marca, legível SEM rolagem em qualquer largura a
   partir de 360px.
2. **No rodapé**, com a razão social de quem opera e o link para o canal oficial
   da cooperativa.
3. **No JSON-LD**, com a operadora como `publisher` e a cooperativa como
   `about` — nunca a cooperativa como autora ou publicadora.

Nenhum texto do site MUST afirmar ou sugerir que ele é o canal oficial da
cooperativa. O lockup registrado da cooperativa MUST aparecer apenas onde é
atribuição de terceiro; a marca do cabeçalho MUST ser o símbolo próprio deste
site.

**Rationale**: adotar a identidade de outra organização é uma afirmação sobre
quem publica, e o Princípio IV já proíbe a tela afirmar o que não ocorreu. A
diferença é que aqui a afirmação é implícita — ninguém escreve "somos a
Coopluz", a página inteira insinua. Por isso a contramedida também precisa ser
estrutural e verificável, e não uma linha de letra miúda que a próxima
refatoração de layout apaga sem ninguém notar.

## Restrições de Stack e Dados

**Dois repositórios, um banco.** Este site e o hub `autogestor` (com o painel
`admin/` dele) são builds independentes, com `package.json`, `npm test` e
projeto Vercel próprios. Eles compartilham SOMENTE o Postgres. Nenhum pacote
compartilhado, nenhum monorepo, nenhum import atravessando a fronteira.

**Uma URL, um domínio.** Nenhum conteúdo deste site MUST ser publicado também
no hub, e vice-versa. Quando uma página migra, ela SAI da origem e a origem
responde 301 — `canonical` cruzada não basta, porque mantém as duas servindo
200. Foi a violação dessa regra que motivou a spec 003.

**Banco.** Acesso via `pg` cru, sem ORM. O schema MUST ser criado e evoluído
idempotentemente no próprio código (`CREATE TABLE IF NOT EXISTS`,
`ALTER TABLE … ADD COLUMN IF NOT EXISTS`), de modo que as duas apps subam em
qualquer ordem, quantas vezes for. As tabelas `crm_*` MUST manter o formato
compatível com o roihub. Mudança de schema MUST ser retrocompatível com a app
que não foi alterada — coluna nova MUST ter `DEFAULT` ou aceitar nulo.

**Ambiente.** O código lê `process.env`, não `import.meta.env` — é o que a
Vercel entrega em runtime. Localmente a variável precisa ser **exportada**.
Antes de investigar qualquer erro de API, falha de deploy ou problema de
conexão com banco, as variáveis de ambiente MUST ser lidas e conferidas
primeiro (caracteres especiais, comentário inline em URL, banco errado).

**Estilo.** CSS puro com custom properties. Tema claro/escuro via `light-dark()`
com **um valor por token**, sob guarda `@supports` — NUNCA duplicando a lista
entre `@media (prefers-color-scheme)` e `:root[data-tema]`.

**Idioma.** Texto de interface, nomes de variável, nomes de prop e comentários
de código MUST estar em português. Mensagens de commit MUST estar em inglês.
Ao editar um arquivo, seguir o padrão dele.

## Fluxo de Desenvolvimento e Portões de Qualidade

**Feature não-trivial segue Spec Kit.** `speckit-specify` → `speckit-clarify` →
`speckit-plan` → `speckit-tasks` → `speckit-implement`, validando com
`speckit-analyze` / `speckit-checklist`. Correção pontual e ajuste de conteúdo
não precisam do fluxo.

**Lógica testável mora em `.mjs`.** Toda lógica pura não-trivial — validação,
cálculo, parsing, agrupamento — MUST ficar em um `.mjs` sem JSX, sem React e
sem `pg`, para que `node --test` importe direto sem transpilar. `lead.mjs` e
`tabela.mjs` são o padrão.

**Ativo de marca é gerado, nunca desenhado.** Símbolo, ícones, favicon e imagem
de compartilhamento MUST sair de script (`npm run marca`), de uma fonte só.
Arquivo de marca mantido à mão desatualiza em silêncio — foi assim que o PNG da
cooperativa ficou uma geração inteira atrasado sem ninguém ver.

**Todo caminho não-trivial deixa um teste.** Ramo, laço, parser, cálculo de
dinheiro ou de segurança MUST deixar ao menos uma checagem executável — a menor
coisa que falha se a lógica quebrar. Sem framework, sem fixture, sem suíte por
função. One-liner trivial não precisa de teste.

**Portão de conclusão.** Antes de declarar qualquer trabalho pronto, o autor
MUST rodar o comando de verificação e MUST ter visto a saída: `npm test`,
`npm run build` e, quando a paleta mudar, `npm run contraste`. Afirmação de
sucesso sem evidência é violação desta constituição. Se um teste falha, o relato
MUST dizer isso, com a saída.

**Verificação de tela é sobre o BUILD.** O `astro dev` injeta a barra de
ferramentas do Astro — DOM extra e ~1,8 MB de JavaScript que não existem em
produção. Medir ali é medir outra página.

**Decisão não óbvia vira documentação.** Escolha de UI, contraste, formulário,
tema ou arquitetura cuja razão não é legível no código MUST ser registrada em
`README.md` (site) ou no `CLAUDE.md` do projeto correspondente, com o número que
sustenta a decisão quando houver.

**Harness de UX/UI.** As skills especialistas em `~/.claude/skills/` MUST ser
invocadas assim que a tarefa tocar a disciplina, antes de escrever código ou
texto de interface. Pedido que atravessa mais de uma disciplina MUST passar por
`design-review`, que ordena e consolida.

## Governance

Esta constituição prevalece sobre qualquer outra prática do repositório. Em
conflito entre ela e um hábito, uma sugestão de ferramenta ou um padrão herdado,
ela vence — exceto diante de instrução explícita do dono do projeto, que
prevalece sobre tudo e MUST ser registrada como emenda se for para valer daí em
diante.

**Emendas.** Toda emenda MUST ser feita por `/speckit-constitution`, MUST
declarar o que muda e por quê no Sync Impact Report no topo do arquivo, e MUST
listar os artefatos dependentes a revisar. Emenda que remove ou redefine um
princípio MUST nomear o que passa a ser permitido em consequência.

**Versionamento.** Semântico, sobre o conteúdo desta constituição:

- **MAJOR** — remoção ou redefinição incompatível de princípio ou de regra de
  governança.
- **MINOR** — princípio ou seção nova, ou orientação materialmente expandida.
- **PATCH** — esclarecimento, redação, correção sem mudança de sentido.

**Conformidade.** A seção "Constitution Check" de todo `plan.md` MUST avaliar a
feature contra os seis princípios, antes da Phase 0 e de novo depois da
Phase 1. Violação MUST ser registrada na tabela "Complexity Tracking" com o
motivo e a alternativa mais simples recusada — complexidade não justificada por
escrito é reprovação, não observação. `/speckit-analyze` MUST ser executado
antes de `/speckit-implement` em features que tocam banco, autenticação ou
interface pública.

**Orientação de runtime.** Para o dia a dia, o `README.md` carrega os comandos, as pegadinhas de ambiente e as decisões já
tomadas. Esta constituição diz o que não se negocia; aqueles arquivos dizem como
o trabalho é feito.

**Version**: 1.1.0 | **Ratified**: 2026-08-20 | **Last Amended**: 2026-08-22
