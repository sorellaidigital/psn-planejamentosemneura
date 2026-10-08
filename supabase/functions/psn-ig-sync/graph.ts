// Cliente da Graph API: um único laço de retry, orçamento de chamadas/tempo e redação de segredos.
export const API_VERSION = "v25.0";
export const GRAPH_BASE = `https://graph.facebook.com/${API_VERSION}`;

// Rate limit / throttling da Graph → retry com backoff.
const CODIGOS_RETRY = new Set([4, 17, 32, 613]);
export const ERR_NAO_SUPORTADO = 10; // permissão / mídia pré-conversão business
export const ERR_PARAMETRO = 100; // métrica inválida etc.
export const ERR_TOKEN = 190; // token inválido/expirado
export const ERR_REDE = -2;

/** Remove tokens/segredos de qualquer texto que possa ir para log, detalhe ou resposta. */
export function redigir(texto: string, segredos: string[] = []): string {
  let out = String(texto)
    .replace(
      /(access_token|input_token|client_secret|appsecret_proof)=[^&\s"')]+/gi,
      "$1=REDACTED",
    )
    .replace(/("(?:access_token|input_token)"\s*:\s*")[^"]+/gi, "$1REDACTED");
  for (const s of segredos) {
    if (s && s.length >= 6) out = out.split(s).join("***");
  }
  return out;
}

export class GraphError extends Error {
  code?: number;
  subcode?: number;
  status?: number;
  constructor(
    message: string,
    o: { code?: number; subcode?: number; status?: number } = {},
  ) {
    super(message);
    this.name = "GraphError";
    this.code = o.code;
    this.subcode = o.subcode;
    this.status = o.status;
  }
}

export class OrcamentoEsgotado extends Error {
  constructor(public motivo: "chamadas" | "tempo") {
    super(`orçamento da execução esgotado (${motivo})`);
    this.name = "OrcamentoEsgotado";
  }
}

/** Limite de chamadas e de tempo (relógio) por execução. */
export class Orcamento {
  chamadas = 0;
  private inicio: number;
  constructor(
    readonly maxChamadas: number,
    readonly maxMs: number,
    private agora: () => number = Date.now,
  ) {
    this.inicio = agora();
  }
  consumir(): void {
    if (this.chamadas >= this.maxChamadas) throw new OrcamentoEsgotado("chamadas");
    if (this.agora() - this.inicio >= this.maxMs) throw new OrcamentoEsgotado("tempo");
    this.chamadas++;
  }
  /** Não dorme além do prazo: aborta antes em vez de estourar o tempo da função. */
  verificarEspera(ms: number): void {
    if (this.agora() - this.inicio + ms >= this.maxMs) throw new OrcamentoEsgotado("tempo");
  }
}

export interface GraphCfg {
  token: string;
  fetchFn: typeof fetch;
  dormir: (ms: number) => Promise<void>;
  orcamento: Orcamento;
  /** valores a mascarar em mensagens (token, app secret) */
  segredos?: string[];
  maxRetries?: number;
}

// deno-lint-ignore no-explicit-any
export type Json = any;

export class Graph {
  constructor(private cfg: GraphCfg) {}

  private segredos(): string[] {
    return [this.cfg.token, ...(this.cfg.segredos ?? [])];
  }

  /** GET com token; `token` sobrescreve (ex.: app token do debug_token). */
  get(caminho: string, params: Record<string, unknown> = {}, token?: string): Promise<Json> {
    const url = new URL(`${GRAPH_BASE}/${caminho.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(params)) {
      if (v == null || k === "access_token") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    url.searchParams.set("access_token", token ?? this.cfg.token);
    return this.requisitar(url.toString());
  }

  /** Percorre as páginas; `aoReceber` devolve true para parar (ex.: página toda já conhecida). */
  async paginar(
    caminho: string,
    params: Record<string, unknown>,
    aoReceber: (dados: Json[]) => Promise<boolean | void>,
    maxPaginas = 200,
  ): Promise<void> {
    let corpo = await this.get(caminho, params);
    for (let i = 0; i < maxPaginas; i++) {
      if (await aoReceber(corpo.data ?? [])) return;
      const proxima = corpo.paging?.next;
      if (!proxima) return;
      corpo = await this.requisitar(proxima);
    }
  }

  /** Único laço de retry: rede (1s·2^n) e rate limit (2s·2^n); cada tentativa gasta orçamento. */
  private async requisitar(url: string): Promise<Json> {
    const max = this.cfg.maxRetries ?? 4;
    for (let tentativa = 0;; tentativa++) {
      this.cfg.orcamento.consumir();
      try {
        return await this.uma(url);
      } catch (e) {
        if (!(e instanceof GraphError)) throw e;
        const espera = e.code === ERR_REDE
          ? 1000 * 2 ** tentativa
          : e.code !== undefined && CODIGOS_RETRY.has(e.code)
          ? 2000 * 2 ** tentativa
          : null;
        if (espera == null || tentativa >= max) throw e;
        this.cfg.orcamento.verificarEspera(espera);
        await this.cfg.dormir(espera);
      }
    }
  }

  private async uma(url: string): Promise<Json> {
    let res: Response;
    let corpo: Json;
    try {
      res = await this.cfg.fetchFn(url);
      corpo = await res.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new GraphError(redigir(`Falha de rede: ${msg}`, this.segredos()), { code: ERR_REDE });
    }
    if (res.ok && !corpo?.error) return corpo;
    const e = corpo?.error ?? {};
    throw new GraphError(redigir(e.message || `HTTP ${res.status}`, this.segredos()), {
      code: e.code,
      subcode: e.error_subcode,
      status: res.status,
    });
  }
}
