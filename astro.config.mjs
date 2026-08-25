// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// URL base vem do ambiente pelo mesmo motivo do hub autogestor e do coopluz
// (origem deste arquivo): canonical e sitemap saem daqui, e errar isso publica
// canonical apontando para o domínio de preview. SITE_URL vazia ou sem esquema
// derrubava o build inteiro ("site: Invalid url"); cair no domínio de produção
// é o pior caso aceitável, build quebrado não é.
const site = URL.canParse(process.env.SITE_URL ?? "")
  ? process.env.SITE_URL
  : "https://seguros.roilabs.com.br";

// Envolve cada <table> vinda do markdown num container rolável, FOCÁVEL e
// anunciado. Os três atributos existem por motivos diferentes e nenhum é
// decoração:
//   · overflow-x no container (e não na própria <table> com `display:block`):
//     a tabela volta a ser tabela, o que preserva a semântica de linha/coluna
//     que o leitor de tela usa para navegar.
//   · tabindex="0": região que só rola na horizontal é conteúdo inalcançável
//     por teclado sem isto — WCAG 2.1.1. É a parte que não dá para pular.
//   · role="region" + aria-label: sem nome, uma região focável é anunciada
//     como "grupo" e a pessoa não sabe por que o foco parou ali.
// Escrito à mão em vez de puxar `unist-util-visit`: é uma travessia de árvore
// de 10 linhas, e a alternativa era uma dependência nova.
function tabelaRolavel() {
  return (arvore) => {
    const visitar = (no) => {
      if (!Array.isArray(no.children)) return;
      no.children.forEach(visitar);
      no.children = no.children.map((filho) =>
        filho.type === "element" && filho.tagName === "table"
          ? {
              type: "element",
              tagName: "div",
              properties: {
                className: ["tabela-rolavel"],
                tabIndex: 0,
                role: "region",
                "aria-label": "Tabela — role para os lados para ver todas as colunas",
              },
              children: [filho],
            }
          : filho
      );
    };
    visitar(arvore);
  };
}

export default defineConfig({
  site,
  markdown: { rehypePlugins: [tabelaRolavel] },
  // Estático: só /api/lead é dinâmico — mesma filosofia do hub e do coopluz.
  output: "static",
  adapter: vercel(),
  integrations: [sitemap({ filter: (page) => !page.includes("/obrigado") })],
  trailingSlash: "never",
  build: { inlineStylesheets: "always" },
  image: { responsiveStyles: true },
});
