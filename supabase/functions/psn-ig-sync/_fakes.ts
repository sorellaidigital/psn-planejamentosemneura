// Apoio dos testes: Db em memória e fetch roteado (nenhuma chamada real à Graph).
import type { CursorMidia, Db, Midia, MidiaRef } from "./db.ts";
import type { Deps } from "./handler.ts";

export class FakeDb implements Db {
  config = new Map<string, unknown>();
  syncs: { id: number; tipo: string; iniciado_em: string; finalizado_em?: string; status: string; detalhe?: unknown }[] = [];
  snapshots: { data: string; seguidores: number | null }[] = [];
  conta = new Map<string, number>(); // "data|metrica"
  midias = new Map<string, Midia & { insights_indisponivel?: boolean; visto_em?: string }>();
  insights: { midia_id: string; capturado_em: string; metrica: string; valor: number }[] = [];
  segredoVault: string | null = null;
  constructor(public agora: () => Date = () => new Date()) {}

  // deno-lint-ignore require-await
  async cronOk(segredo: string) { return this.segredoVault !== null && segredo === this.segredoVault; }

  // deno-lint-ignore require-await
  async getConfig<T>(c: string) { return (this.config.get(c) ?? null) as T | null; }
  // deno-lint-ignore require-await
  async setConfig(c: string, v: unknown) { this.config.set(c, structuredClone(v)); }
  // deno-lint-ignore require-await
  async rodandoDesde(iso: string) {
    return this.syncs.filter((s) => s.status === "rodando" && s.iniciado_em >= iso);
  }
  // deno-lint-ignore require-await
  async marcarOrfaos(antes: string, detalhe: unknown) {
    const o = this.syncs.filter((s) => s.status === "rodando" && s.iniciado_em < antes);
    for (const s of o) Object.assign(s, { status: "erro", detalhe, finalizado_em: this.agora().toISOString() });
    return o.length;
  }
  // deno-lint-ignore require-await
  async iniciarSync(tipo: string) {
    const id = this.syncs.length + 1;
    this.syncs.push({ id, tipo, iniciado_em: this.agora().toISOString(), status: "rodando" });
    return id;
  }
  // deno-lint-ignore require-await
  async finalizarSync(id: number, status: "ok" | "erro", detalhe: unknown) {
    Object.assign(this.syncs.find((s) => s.id === id)!, { status, detalhe: structuredClone(detalhe), finalizado_em: this.agora().toISOString() });
  }
  // deno-lint-ignore require-await
  async upsertSnapshot(r: { data: string; seguidores: number | null; seguindo: number | null; n_midias: number | null }) {
    this.snapshots = this.snapshots.filter((s) => s.data !== r.data).concat(r);
  }
  // deno-lint-ignore require-await
  async upsertContaDiaria(rows: { data: string; metrica: string; valor: number }[]) {
    for (const r of rows) this.conta.set(`${r.data}|${r.metrica}`, r.valor);
  }
  // deno-lint-ignore require-await
  async diasComMetricas(desde: string) {
    const s = new Set<string>();
    for (const k of this.conta.keys()) {
      const [d, m] = k.split("|");
      if (d >= desde && m !== "follower_count") s.add(d);
    }
    return [...s];
  }
  // deno-lint-ignore require-await
  async idsMidia() { return new Set(this.midias.keys()); }
  // deno-lint-ignore require-await
  async upsertMidias(rows: Midia[], conhecidos: Set<string>, agoraIso: string) {
    for (const r of rows) {
      const antes = this.midias.get(r.id);
      this.midias.set(r.id, { ...antes, ...r, visto_em: conhecidos.has(r.id) ? antes?.visto_em : agoraIso });
    }
  }
  private ordenadas(): (Midia & { insights_indisponivel?: boolean })[] {
    return [...this.midias.values()].filter((m) => !m.insights_indisponivel && m.publicado_em)
      .sort((a, b) => (a.publicado_em! < b.publicado_em! ? 1 : a.publicado_em! > b.publicado_em! ? -1 : a.id < b.id ? 1 : -1));
  }
  // deno-lint-ignore require-await
  async midiasRecentes(desde: string): Promise<MidiaRef[]> {
    return this.ordenadas().filter((m) => m.publicado_em! >= desde);
  }
  // deno-lint-ignore require-await
  async midiasAntigas(antes: string, cursor: CursorMidia | null, limite: number): Promise<MidiaRef[]> {
    return this.ordenadas().filter((m) => m.publicado_em! < antes).filter((m) =>
      !cursor || m.publicado_em! < cursor.publicado_em || (m.publicado_em === cursor.publicado_em && m.id < cursor.id)
    ).slice(0, limite);
  }
  // deno-lint-ignore require-await
  async marcarInsightsIndisponivel(id: string) { this.midias.get(id)!.insights_indisponivel = true; }
  // deno-lint-ignore require-await
  async inserirInsights(rows: { midia_id: string; capturado_em: string; metrica: string; valor: number }[]) {
    this.insights.push(...rows);
  }
}

// deno-lint-ignore no-explicit-any
export type Resp = { status?: number; body: any };
export type Rota = [RegExp, (url: URL, n: number) => Resp];

/** fetch falso: primeira rota cujo regex casa com o pathname; registra as URLs chamadas. */
export function fetchFalso(rotas: Rota[]) {
  const chamadas: URL[] = [];
  const contagem = new Map<RegExp, number>();
  const fn = ((input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    chamadas.push(url);
    for (const [re, h] of rotas) {
      if (re.test(url.pathname)) {
        const n = (contagem.get(re) ?? 0) + 1;
        contagem.set(re, n);
        const r = h(url, n);
        return Promise.resolve(new Response(JSON.stringify(r.body), { status: r.status ?? 200 }));
      }
    }
    return Promise.resolve(new Response(JSON.stringify({ error: { message: "rota não mockada " + url.pathname, code: 1 } }), { status: 400 }));
  }) as typeof fetch;
  return { fn, chamadas };
}

export const erroGraph = (code: number, message: string, status = 400): Resp => ({
  status,
  body: { error: { message, code, type: "OAuthException" } },
});

export const AGORA = new Date("2026-10-08T15:00:00Z"); // 12:00 em São Paulo
export const TOKEN = "TOKEN_SECRETO_ABC123";
export const IG = "17841400000000000";

export function montarDeps(
  rotas: Rota[],
  extraEnv: Record<string, string> = {},
  db = new FakeDb(() => AGORA),
) {
  const f = fetchFalso(rotas);
  const dormidas: number[] = [];
  const envs: Record<string, string> = {
    PSN_CRON_SECRET: "cron-secret-xyz",
    META_PAGE_TOKEN: TOKEN,
    META_IG_USER_ID: IG,
    ...extraEnv,
  };
  const deps: Deps = {
    env: (k) => envs[k],
    db,
    fetchFn: f.fn,
    dormir: (ms) => { dormidas.push(ms); return Promise.resolve(); },
    agora: () => AGORA,
  };
  return { deps, db, dormidas, chamadas: f.chamadas };
}

export const req = (headers: Record<string, string> = { "x-psn-cron": "cron-secret-xyz" }, body?: unknown, method = "POST") =>
  new Request("https://x.supabase.co/functions/v1/psn-ig-sync", {
    method,
    headers,
    body: method === "POST" && body !== undefined ? JSON.stringify(body) : undefined,
  });

/** Rotas de um mundo feliz: 2 mídias recentes (1 FEED, 1 REELS), insights de conta e de mídia. */
export function rotasPadrao(): Rota[] {
  return [
    [new RegExp(`/${IG}/insights$`), (u) =>
      u.searchParams.get("metric") === "follower_count"
        ? { body: { data: [{ name: "follower_count", values: [{ value: 3, end_time: "2026-10-08T03:00:00+0000" }] }] } }
        : { body: { data: [{ name: "reach", total_value: { value: 100 } }, { name: "views", total_value: { value: 250 } }] } }],
    [new RegExp(`/${IG}/media$`), () => ({
      body: { data: [
        { id: "m1", media_type: "IMAGE", media_product_type: "FEED", caption: "a", timestamp: "2026-10-07T12:00:00+0000", like_count: 5, comments_count: 1 },
        { id: "m2", media_type: "VIDEO", media_product_type: "REELS", caption: "b", timestamp: "2026-10-01T12:00:00+0000", like_count: 9, comments_count: 2 },
      ] },
    })],
    [new RegExp(`/${IG}$`), () => ({ body: { id: IG, followers_count: 1000, follows_count: 50, media_count: 2 } })],
    [/\/[mo]\d+\/insights$/, () => ({ body: { data: [{ name: "reach", values: [{ value: 77 }] }, { name: "saved", values: [{ value: 4 }] }] } })],
  ];
}
