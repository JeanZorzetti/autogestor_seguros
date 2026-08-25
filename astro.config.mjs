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

export default defineConfig({
  site,
  // Estático: só /api/lead é dinâmico — mesma filosofia do hub e do coopluz.
  output: "static",
  adapter: vercel(),
  integrations: [sitemap({ filter: (page) => !page.includes("/obrigado") })],
  trailingSlash: "never",
  build: { inlineStylesheets: "always" },
  image: { responsiveStyles: true },
});
