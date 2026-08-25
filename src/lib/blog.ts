import type { CollectionEntry } from "astro:content";

export type Artigo = CollectionEntry<"blog">;

/** Mais recente primeiro. O índice e o bloco "leia também" ordenam igual — se
 *  cada um ordenasse por conta própria, um artigo novo apareceria no topo de
 *  um e no meio do outro. */
export const porData = (a: Artigo, b: Artigo) => b.data.publicado.valueOf() - a.data.publicado.valueOf();

/** Tempo de leitura estimado, calculado do corpo em vez de declarado no
 *  frontmatter: número escrito à mão envelhece no primeiro parágrafo que
 *  alguém acrescenta e ninguém volta para corrigir.
 *  200 palavras/minuto é a média usada para leitura em tela em português. */
export function minutos(artigo: Artigo): number {
  const palavras = (artigo.body ?? "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(palavras / 200));
}

/** `timeZone: "UTC"` não é detalhe: a data do frontmatter vira meia-noite UTC,
 *  e formatar em horário de Brasília (UTC-3) devolveria o dia ANTERIOR — um
 *  artigo publicado em 25/08 apareceria como 24/08 para todo mundo. */
const formato = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const dataLonga = (d: Date) => formato.format(d);

/** AAAA-MM-DD para o <time datetime> e para o JSON-LD. */
export const dataIso = (d: Date) => d.toISOString().slice(0, 10);
