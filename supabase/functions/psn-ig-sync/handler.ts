// Handler HTTP: auth, lock de concorrência, log em psn_ig_sync e resumo JSON.
import type { Db } from "./db.ts";
import { Graph, GraphError, ERR_TOKEN, Orcamento, redigir } from "./graph.ts";
import { coletar, type Ctx, type Detalhe } from "./coleta.ts";
import { GerenteMetricas } from "./metricas.ts";
import { marcarTokenInvalido, marcarTokenOk } from "./token.ts";

export const LOCK_MINUTOS = 20;
export const MAX_CHAMADAS = 400;
export const MAX_SEGUNDOS = 120;

export interface Deps {
  env: (chave: string) => string | undefined;
  db: Db;
  fetchFn: typeof fetch;
  dormir: (ms: number) => Promise<void>;
  agora: () => Date;
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

/** Comparação sem curto-circuito (evita vazar o segredo por tempo). */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== "POST") return json({ ok: false, erro: "método não permitido" }, 405);

  const segredoCron = deps.env("PSN_CRON_SECRET");
  if (!segredoCron) return json({ ok: false, erro: "configuração ausente: PSN_CRON_SECRET" }, 500);
  if (!iguais(req.headers.get("x-psn-cron") ?? "", segredoCron)) {
    return json({ ok: false, erro: "não autorizado" }, 401);
  }

  let corpo: { tipo?: unknown; forcar_completo?: unknown } = {};
  try {
    const txt = await req.text();
    if (txt.trim()) corpo = JSON.parse(txt);
  } catch {
    return json({ ok: false, erro: "corpo JSON inválido" }, 400);
  }
  const tipo = corpo.tipo ?? "cron";
  if (tipo !== "cron" && tipo !== "manual") return json({ ok: false, erro: "tipo deve ser cron ou manual" }, 400);
  const forcar = corpo.forcar_completo === true;

  const token = deps.env("META_PAGE_TOKEN");
  const igUserId = deps.env("META_IG_USER_ID");
  if (!token || !igUserId) {
    return json({ ok: false, erro: "configuração ausente: META_PAGE_TOKEN / META_IG_USER_ID" }, 500);
  }
  const appId = deps.env("META_APP_ID") || undefined;
  const appSecret = deps.env("META_APP_SECRET") || undefined;
  const segredos = [token, appSecret ?? "", segredoCron];

  const { db } = deps;
  const agora = deps.agora();

  // lock: run 'rodando' recente bloqueia; mais antigo é órfão (função morreu no meio)
  const limite = new Date(agora.getTime() - LOCK_MINUTOS * 60000).toISOString();
  const ativos = await db.rodandoDesde(limite);
  if (ativos.length > 0) {
    return json({ ok: false, erro: "coleta em andamento", sync_id: ativos[0].id }, 409);
  }
  const orfaos = await db.marcarOrfaos(limite, { erro: "órfão: run anterior não finalizou (marcado na inicialização)" });

  const syncId = await db.iniciarSync(tipo);
  const maxChamadas = Number(deps.env("PSN_MAX_CALLS")) || MAX_CHAMADAS;
  const maxMs = (Number(deps.env("PSN_MAX_SEGUNDOS")) || MAX_SEGUNDOS) * 1000;
  const orcamento = new Orcamento(maxChamadas, maxMs, () => deps.agora().getTime());
  const detalhe: Detalhe = {
    tipo,
    forcar_completo: forcar,
    contagens: {},
    metricas_removidas: [],
    metricas_reativadas: [],
  };
  if (orfaos > 0) detalhe.contagens.orfaos_marcados = orfaos;
  const metricas = new GerenteMetricas(db, deps.agora);
  const ctx: Ctx = {
    graph: new Graph({
      token,
      fetchFn: deps.fetchFn,
      dormir: deps.dormir,
      orcamento,
      segredos: [appSecret ?? ""],
    }),
    db,
    metricas,
    orcamento,
    igUserId,
    tokenPagina: token,
    appId,
    appSecret,
    agora: deps.agora,
    forcar,
    detalhe,
  };

  try {
    const { parcial } = await coletar(ctx);
    detalhe.chamadas = orcamento.chamadas;
    detalhe.metricas_removidas = metricas.removidasNaExecucao;
    detalhe.metricas_reativadas = metricas.reativadasNaExecucao;
    await marcarTokenOk(db);
    await db.setConfig("ultima_coleta_ok", deps.agora().toISOString());
    await db.finalizarSync(syncId, "ok", detalhe);
    return json({ ok: true, sync_id: syncId, parcial, contagens: detalhe.contagens });
  } catch (err) {
    const msg = redigir(err instanceof Error ? err.message : String(err), segredos);
    detalhe.erro = msg;
    detalhe.chamadas = orcamento.chamadas;
    detalhe.metricas_removidas = metricas.removidasNaExecucao;
    detalhe.metricas_reativadas = metricas.reativadasNaExecucao;
    if (err instanceof GraphError && err.code === ERR_TOKEN) {
      detalhe.erro = `token inválido ou expirado (190): ${msg}`;
      await marcarTokenInvalido(db, msg, deps.agora());
    }
    await db.finalizarSync(syncId, "erro", detalhe);
    return json({ ok: false, sync_id: syncId, parcial: false, erro: detalhe.erro, contagens: detalhe.contagens }, 500);
  }
}
