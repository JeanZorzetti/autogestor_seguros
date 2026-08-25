import { Pool } from "pg";

// Postgres do EasyPanel. As tabelas são crm_leads/crm_eventos de propósito: é o
// mesmo formato do roihub, então o /admin em Next.js lê isto sem tradutor.

const g = globalThis as unknown as { agPool?: Pool; agSchema?: Promise<unknown> };

export function dbOn(): boolean {
  return !!process.env.DATABASE_URL;
}

function pool(): Pool {
  // max baixo: cada invocação serverless abre a sua, e Postgres de VPS tem
  // teto de conexões bem menor que a concorrência que o Vercel pode gerar.
  if (!g.agPool) g.agPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return g.agPool;
}

function ensure(): Promise<unknown> {
  if (!g.agSchema)
    g.agSchema = pool().query(`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id BIGSERIAL PRIMARY KEY,
        external_id TEXT UNIQUE,
        pipeline TEXT NOT NULL,
        etapa TEXT NOT NULL,
        nome TEXT NOT NULL,
        email TEXT,
        telefone TEXT,
        origem TEXT NOT NULL,
        valor NUMERIC(12,2),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        criado TIMESTAMPTZ NOT NULL DEFAULT now(),
        atualizado TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS crm_eventos (
        id BIGSERIAL PRIMARY KEY,
        lead_id BIGINT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
        de TEXT, para TEXT NOT NULL, nota TEXT,
        quando TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS crm_leads_pipeline_idx ON crm_leads (pipeline, criado DESC);
    `);
  return g.agSchema;
}

export type NovoLead = {
  solucao: string;
  nome: string;
  whatsapp: string;
  contexto: string | null;
  origem: string;
};

/**
 * Grava o lead. `created: false` = reenvio do mesmo WhatsApp para a mesma
 * solução no mesmo dia — a pessoa clicou duas vezes, não são dois leads.
 * Fora dessa janela é lead novo de verdade: quem volta uma semana depois
 * está mais quente, não menos.
 */
export async function gravarLead(l: NovoLead, extra: Record<string, unknown>): Promise<{ id: number | null; created: boolean }> {
  await ensure();
  const dia = new Date().toISOString().slice(0, 10);
  const externalId = `${l.solucao}:${l.whatsapp}:${dia}`;
  const r = await pool().query<{ id: string }>(
    `INSERT INTO crm_leads (external_id, pipeline, etapa, nome, telefone, origem, metadata)
     VALUES ($1, $2, 'novo', $3, $4, $5, $6::jsonb)
     ON CONFLICT (external_id) DO NOTHING
     RETURNING id`,
    [externalId, l.solucao, l.nome, l.whatsapp, l.origem, JSON.stringify({ contexto: l.contexto, ...extra })]
  );
  if (!r.rows[0]) return { id: null, created: false };
  const id = Number(r.rows[0].id);
  await pool().query(`INSERT INTO crm_eventos (lead_id, de, para, nota) VALUES ($1, NULL, 'novo', $2)`, [
    id,
    `entrada via ${l.origem}`,
  ]);
  return { id, created: true };
}
