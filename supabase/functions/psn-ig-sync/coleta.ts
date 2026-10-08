// Etapas da coleta (porte de ig-analytics/server/collector/sync.js, passos 1-5).
import type { Db, Midia, MidiaRef, CursorMidia } from "./db.ts";
import {
  ERR_NAO_SUPORTADO,
  ERR_PARAMETRO,
  Graph,
  GraphError,
  type Json,
  Orcamento,
  OrcamentoEsgotado,
} from "./graph.ts";
import type { GerenteMetricas, Superficie } from "./metricas.ts";
import { dataLocal, diaDoBucket, intervaloDatas, meiaNoiteLocalEpoch, paraDate, somarDias } from "./datas.ts";
import { verificarToken } from "./token.ts";

export const JANELA_CONTA_DIAS = 28; // máximo que a Meta deixa consultar por dia
export const MIDIA_RECENTE_DIAS = 90; // mais nova: insights a cada run; mais antiga: semanal
export const REVARREDURA_DIAS = 7;
export const LOTE_ANTIGAS = 50;

const CAMPOS_MIDIA =
  "id,caption,media_type,media_product_type,permalink,media_url,thumbnail_url,timestamp,like_count,comments_count";
const DIA_MS = 86400000;

export interface Detalhe {
  tipo: string;
  forcar_completo: boolean;
  etapa?: string;
  contagens: Record<string, number>;
  metricas_removidas: string[];
  metricas_reativadas: string[];
  chamadas?: number;
  parcial?: { motivo: string; etapa: string; restante: Record<string, unknown> };
  token_saude?: unknown;
  token_saude_erro?: string;
  erro?: string;
}

export interface Ctx {
  graph: Graph;
  db: Db;
  metricas: GerenteMetricas;
  orcamento: Orcamento;
  igUserId: string;
  tokenPagina: string;
  appId?: string;
  appSecret?: string;
  agora: () => Date;
  forcar: boolean;
  detalhe: Detalhe;
}

interface EstadoPassagemAntiga {
  concluido_em?: string | null;
  cursor?: CursorMidia | null;
}

const somar = (c: Ctx, k: string, n = 1) => {
  c.detalhe.contagens[k] = (c.detalhe.contagens[k] ?? 0) + n;
};
const valorDe = (item: Json): number | null => {
  const v = item?.total_value?.value ?? item?.values?.[0]?.value;
  return v == null ? null : Number(v);
};
const idadeMs = (c: Ctx, iso: string | null | undefined) =>
  iso ? c.agora().getTime() - Date.parse(iso) : Infinity;

// Passo 1 — snapshot do nó IG User
async function snapshotConta(c: Ctx): Promise<void> {
  const p = await c.graph.get(c.igUserId, { fields: "id,username,followers_count,follows_count,media_count" });
  await c.db.upsertSnapshot({
    data: dataLocal(c.agora()),
    seguidores: p.followers_count ?? null,
    seguindo: p.follows_count ?? null,
    n_midias: p.media_count ?? null,
  });
  somar(c, "snapshot");
}

// Passo 2 — backfill best-effort de follower_count (só uma vez)
async function backfillSeguidores(c: Ctx): Promise<void> {
  if (await c.db.getConfig("follower_backfill_done")) return;
  const hoje = dataLocal(c.agora());
  try {
    const res = await c.graph.get(`${c.igUserId}/insights`, {
      metric: "follower_count",
      period: "day",
      since: meiaNoiteLocalEpoch(somarDias(hoje, -29)),
      until: meiaNoiteLocalEpoch(hoje),
    });
    const rows: { data: string; metrica: string; valor: number }[] = [];
    for (const item of res.data ?? []) {
      for (const v of item.values ?? []) {
        if (v.end_time && v.value != null) {
          rows.push({ data: diaDoBucket(v.end_time), metrica: "follower_count", valor: Number(v.value) });
        }
      }
    }
    await c.db.upsertContaDiaria(rows);
    await c.db.setConfig("follower_backfill_done", true);
    somar(c, "follower_dias_backfill", rows.length);
  } catch (err) {
    // erro da própria API = permanente (marca feito); rede/orçamento = tenta no próximo run
    if (err instanceof GraphError && err.code !== -2 && err.code !== 190) {
      await c.db.setConfig("follower_backfill_done", true);
      c.detalhe.contagens.follower_backfill_indisponivel = 1;
      return;
    }
    throw err;
  }
}

// Passo 3 — métricas diárias da conta (preenche lacunas na janela; sempre ontem e hoje)
async function contaDiaria(c: Ctx): Promise<void> {
  const hoje = dataLocal(c.agora());
  const ontem = somarDias(hoje, -1);
  const inicio = somarDias(hoje, -JANELA_CONTA_DIAS);
  const tem = new Set(await c.db.diasComMetricas(inicio));
  const alvos = intervaloDatas(inicio, hoje).filter((d) => c.forcar || !tem.has(d) || d >= ontem);
  // ontem/hoje primeiro: se o orçamento acabar, o mais valioso já foi coletado
  alvos.sort((a, b) => Number(b >= ontem) - Number(a >= ontem) || (a < b ? -1 : 1));
  for (const dia of alvos) {
    const res = await c.metricas.comDegradacao("account", (m) =>
      c.graph.get(`${c.igUserId}/insights`, {
        metric: m,
        period: "day",
        metric_type: "total_value",
        since: meiaNoiteLocalEpoch(dia),
        until: meiaNoiteLocalEpoch(somarDias(dia, 1)),
      }));
    const rows: { data: string; metrica: string; valor: number }[] = [];
    for (const item of res?.data ?? []) {
      const v = valorDe(item);
      if (v != null) rows.push({ data: dia, metrica: item.name, valor: v });
    }
    await c.db.upsertContaDiaria(rows);
    somar(c, "dias_conta_coletados");
    somar(c, "linhas_conta_diaria", rows.length);
  }
}

// Passo 4 — lista de mídias (incremental; re-varredura completa a cada 7 dias)
async function listarMidias(c: Ctx): Promise<void> {
  const ultima = await c.db.getConfig<string>("last_full_media_walk");
  const completa = c.forcar || idadeMs(c, ultima) > REVARREDURA_DIAS * DIA_MS;
  const conhecidos = await c.db.idsMidia();
  const agoraIso = c.agora().toISOString();

  await c.graph.paginar(`${c.igUserId}/media`, { fields: CAMPOS_MIDIA, limit: 50 }, async (pagina) => {
    const rows: Midia[] = pagina.map((m: Json) => ({
      id: m.id,
      tipo: m.media_type ?? null,
      tipo_produto: m.media_product_type ?? null,
      legenda: m.caption ?? null,
      permalink: m.permalink ?? null,
      media_url: m.media_url ?? null,
      thumbnail_url: m.thumbnail_url ?? null,
      publicado_em: m.timestamp ? paraDate(m.timestamp).toISOString() : null,
      curtidas: m.like_count ?? null,
      comentarios: m.comments_count ?? null,
    }));
    const todasConhecidas = rows.length > 0 && rows.every((r) => conhecidos.has(r.id));
    await c.db.upsertMidias(rows, conhecidos, agoraIso);
    for (const r of rows) conhecidos.add(r.id);
    somar(c, "midias_listadas", rows.length);
    // sem re-varredura: para quando uma página inteira já é conhecida
    return !completa && todasConhecidas;
  });
  if (completa) await c.db.setConfig("last_full_media_walk", agoraIso);
}

// Passo 5 — insights por mídia (snapshot por run)
async function insightsDaMidia(c: Ctx, m: MidiaRef, capturadoEm: string): Promise<number> {
  const sup: Superficie = m.tipo_produto === "REELS" ? "REELS" : "FEED";
  try {
    const res = await c.metricas.comDegradacao(sup, (met) => c.graph.get(`${m.id}/insights`, { metric: met }));
    const rows = [];
    for (const item of res?.data ?? []) {
      const v = valorDe(item);
      if (v != null) rows.push({ midia_id: m.id, capturado_em: capturadoEm, metrica: item.name as string, valor: v });
    }
    await c.db.inserirInsights(rows);
    somar(c, "linhas_insight", rows.length);
    return rows.length;
  } catch (err) {
    if (err instanceof GraphError && err.code === ERR_NAO_SUPORTADO) {
      await c.db.marcarInsightsIndisponivel(m.id);
      somar(c, "midias_insights_indisponiveis");
      return 0;
    }
    if (err instanceof GraphError && err.code === ERR_PARAMETRO) {
      somar(c, "midias_erro_100_ignoradas"); // erro específico desta mídia: pula
      return 0;
    }
    throw err;
  }
}

async function insightsRecentes(c: Ctx, capturadoEm: string): Promise<void> {
  const desde = new Date(c.agora().getTime() - MIDIA_RECENTE_DIAS * DIA_MS).toISOString();
  const alvos = await c.db.midiasRecentes(desde);
  let feitas = 0;
  try {
    for (const m of alvos) {
      await insightsDaMidia(c, m, capturadoEm);
      feitas++;
      somar(c, "insights_recentes");
    }
  } finally {
    if (feitas < alvos.length) c.detalhe.contagens.insights_recentes_pendentes = alvos.length - feitas;
  }
}

/** Mídias antigas: passada semanal retomável (cursor em last_old_media_pass). */
async function insightsAntigas(c: Ctx, capturadoEm: string): Promise<void> {
  const est = (await c.db.getConfig<EstadoPassagemAntiga>("last_old_media_pass")) ?? {};
  const devida = c.forcar || !!est.cursor || idadeMs(c, est.concluido_em) > REVARREDURA_DIAS * DIA_MS;
  if (!devida) return;

  const antes = new Date(c.agora().getTime() - MIDIA_RECENTE_DIAS * DIA_MS).toISOString();
  let cursor: CursorMidia | null = c.forcar ? null : est.cursor ?? null;
  let concluida = false;
  const persistir = () =>
    c.db.setConfig("last_old_media_pass", {
      concluido_em: concluida ? c.agora().toISOString() : est.concluido_em ?? null,
      cursor: concluida ? null : cursor,
    });
  try {
    for (;;) {
      const lote = await c.db.midiasAntigas(antes, cursor, LOTE_ANTIGAS);
      if (lote.length === 0) {
        concluida = true;
        return;
      }
      for (const m of lote) {
        await insightsDaMidia(c, m, capturadoEm);
        somar(c, "insights_antigas");
        cursor = { publicado_em: m.publicado_em ?? antes, id: m.id };
      }
    }
  } finally {
    // salva o progresso mesmo se o orçamento/erro interromper no meio
    if (cursor || concluida) await persistir();
    if (!concluida) c.detalhe.contagens.passada_antigas_incompleta = 1;
  }
}

/**
 * Executa as etapas em ordem. Orçamento esgotado → encerra com parcial (progresso já gravado);
 * qualquer outro erro sobe para o chamador (inclui 190).
 */
export async function coletar(c: Ctx): Promise<{ parcial: boolean }> {
  const etapas: [string, (c: Ctx) => Promise<void>][] = [
    ["token", verificarToken],
    ["snapshot", snapshotConta],
    ["backfill_seguidores", backfillSeguidores],
    ["conta_diaria", contaDiaria],
    ["lista_midias", listarMidias],
    ["insights_recentes", (x) => insightsRecentes(x, capturadoEm)],
    ["insights_antigas", (x) => insightsAntigas(x, capturadoEm)],
  ];
  const capturadoEm = c.agora().toISOString();
  try {
    for (const [nome, fn] of etapas) {
      c.detalhe.etapa = nome;
      await fn(c);
    }
    delete c.detalhe.etapa;
    return { parcial: false };
  } catch (err) {
    if (!(err instanceof OrcamentoEsgotado)) throw err;
    const etapa = c.detalhe.etapa ?? "?";
    const nomes = etapas.map((e) => e[0]);
    c.detalhe.parcial = {
      motivo: err.motivo,
      etapa,
      restante: {
        etapas: nomes.slice(nomes.indexOf(etapa)),
        insights_recentes_pendentes: c.detalhe.contagens.insights_recentes_pendentes ?? 0,
        passada_antigas_incompleta: !!c.detalhe.contagens.passada_antigas_incompleta,
      },
    };
    return { parcial: true };
  }
}
