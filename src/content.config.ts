import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// O blog é a única parte deste site cujo conteúdo NÃO é código: os textos das
// outras seis páginas vivem em .astro porque são estruturais e mudam junto do
// layout. Artigo muda sozinho, é escrito por quem não mexe em componente, e
// precisa de data — por isso markdown com collection, que é nativo do Astro
// (nenhuma dependência nova; MDX exigiria @astrojs/mdx e nada aqui pede
// componente dentro do texto).
//
// O schema abaixo é o contrato que impede um artigo de subir sem o que a
// página precisa para existir em busca: sem `resposta` não há BLUF, sem
// `fontes` uma afirmação sobre lei vira alegação sem caminho de verificação —
// e este site inteiro é construído sobre a regra oposta (ver o `identifier`
// com link de consulta pública no JSON-LD do Base).
const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
  schema: z.object({
    /** H1. Frase, não rótulo — é o que a pessoa leu no resultado de busca. */
    titulo: z.string(),
    /** <title>. Separado do H1 porque o teto do Google é ~60 caracteres e o H1
     *  não deve ser mutilado para caber nele. */
    tituloSeo: z.string().max(70),
    /** meta description. 155 é o teto — o mesmo limite documentado em
     *  data/solucoes.ts, e pelo mesmo motivo: acima disso o Google corta. */
    descricao: z.string().max(155),
    /** BLUF: a resposta direta, antes de qualquer contexto. É o parágrafo que
     *  um motor de resposta extrai — e o que faz a pessoa que só queria o
     *  número não precisar rolar. */
    resposta: z.string(),
    publicado: z.coerce.date(),
    atualizado: z.coerce.date().optional(),
    /** Sobrancelha (.olho) e agrupamento no índice. */
    categoria: z.string(),
    /** Vira FAQPage no JSON-LD e <details> no fim do artigo. `r` aceita HTML. */
    perguntas: z.array(z.object({ p: z.string(), r: z.string() })).default([]),
    /** Toda afirmação de lei, prazo ou número tem origem citada e clicável.
     *  `oficial` marca fonte primária (Planalto, SUSEP) — é a distinção que
     *  separa "a SUSEP diz" de "um blog de corretora diz". */
    fontes: z
      .array(z.object({ titulo: z.string(), veiculo: z.string(), url: z.string().url(), oficial: z.boolean().default(false) }))
      .default([]),
  }),
});

export const collections = { blog };
