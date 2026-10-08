// Conjuntos de métricas por superfície, com degradação persistida e re-tentativa de removidas.
import { ERR_PARAMETRO } from "./graph.ts";
import type { Db } from "./db.ts";

export const DESEJADAS = {
  account: [
    "views", "reach", "total_interactions", "likes", "comments", "saves",
    "shares", "accounts_engaged", "replies", "follows_and_unfollows", "profile_links_taps",
  ],
  FEED: [
    "reach", "views", "likes", "comments", "saved", "shares",
    "total_interactions", "follows", "profile_visits",
  ],
  REELS: [
    "views", "reach", "likes", "comments", "saved", "shares", "total_interactions",
    "ig_reels_avg_watch_time", "ig_reels_video_view_total_time", "reels_skip_rate",
  ],
} as const;
export type Superficie = keyof typeof DESEJADAS;

/** Métrica removida volta a ser tentada depois disso. */
export const REAPROVEITAR_DIAS = 7;

export interface EstadoMetricas {
  metricas: string[];
  removidas: Record<string, string>; // metrica -> data ISO da remoção
}

const chave = (s: Superficie) => `working_metrics_${s}`;

/** Extrai da mensagem de erro qual métrica foi rejeitada (a mais longa que casa por palavra). */
export function metricaRejeitada(mensagem: string, metricas: string[]): string | null {
  const m = (mensagem || "").toLowerCase();
  const candidatas = [...metricas].sort((a, b) => b.length - a.length);
  return candidatas.find((x) =>
    new RegExp(`(^|[^a-z_])${x.toLowerCase()}($|[^a-z_])`).test(m)
  ) ?? null;
}

export class GerenteMetricas {
  private cache = new Map<Superficie, EstadoMetricas>();
  removidasNaExecucao: string[] = [];
  reativadasNaExecucao: string[] = [];

  constructor(private db: Db, private agora: () => Date = () => new Date()) {}

  private async estado(s: Superficie): Promise<EstadoMetricas> {
    const em = this.cache.get(s);
    if (em) return em;
    const salvo = await this.db.getConfig<Partial<EstadoMetricas>>(chave(s));
    const removidas = { ...(salvo?.removidas ?? {}) };
    const limite = this.agora().getTime() - REAPROVEITAR_DIAS * 86400000;
    let mudou = !salvo;
    for (const [m, quando] of Object.entries(removidas)) {
      if (Date.parse(quando) <= limite) { // venceu: volta ao conjunto
        delete removidas[m];
        this.reativadasNaExecucao.push(`${s}:${m}`);
        mudou = true;
      }
    }
    const metricas = DESEJADAS[s].filter((m) => !(m in removidas));
    if (!mudou && JSON.stringify(metricas) !== JSON.stringify(salvo?.metricas)) mudou = true;
    const novo = { metricas, removidas };
    this.cache.set(s, novo);
    if (mudou) await this.db.setConfig(chave(s), novo);
    return novo;
  }

  async ativas(s: Superficie): Promise<string[]> {
    return [...(await this.estado(s)).metricas];
  }

  async remover(s: Superficie, metrica: string): Promise<string[]> {
    const e = await this.estado(s);
    e.metricas = e.metricas.filter((m) => m !== metrica);
    e.removidas[metrica] = this.agora().toISOString();
    this.removidasNaExecucao.push(`${s}:${metrica}`);
    await this.db.setConfig(chave(s), e);
    return [...e.metricas];
  }

  /**
   * Roda fn(metricas) removendo as rejeitadas (erro 100 que cita a métrica) até funcionar.
   * Erro 100 sem métrica identificável é propagado. Sem métricas restantes → null.
   */
  async comDegradacao<T>(s: Superficie, fn: (metricas: string[]) => Promise<T>): Promise<T | null> {
    let metricas = await this.ativas(s);
    while (metricas.length > 0) {
      try {
        return await fn(metricas);
      } catch (err) {
        const code = (err as { code?: number })?.code;
        if (code !== ERR_PARAMETRO) throw err;
        const ruim = metricaRejeitada((err as Error).message, metricas);
        if (!ruim) throw err;
        metricas = await this.remover(s, ruim);
      }
    }
    return null;
  }
}
