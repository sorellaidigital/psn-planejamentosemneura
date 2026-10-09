// Lógica do psn-pauta-disparar (injeção de dependências para teste).
export const DEBOUNCE_MS = 2 * 60_000;
export const TETO_DIA = 20;
export const THROTTLE_MS = 60_000;
export const ORIGENS = ["https://planejamento-sem-neura.netlify.app"];
const FIRE = "https://api.anthropic.com/v1/claude_code/routines";
const GH_DISPATCH = "https://api.github.com/repos/sorellaidigital/mecanismo-car/actions/workflows/producao-pauta.yml/dispatches";
const GH_PAGINA = "https://github.com/sorellaidigital/mecanismo-car/actions/workflows/producao-pauta.yml";

export type StatusDisparo = "disparado" | "ignorado" | "erro" | "nao_configurado";

export interface Db {
  /** ids da fila: psn_pauta com status aprovada_producao ou ajustar */
  fila(): Promise<string[]>;
  /** criado_em (ISO) do último registro com esse status, ou null */
  ultimo(status: StatusDisparo[]): Promise<string | null>;
  /** quantos 'disparado' desde o instante (ISO) */
  contarDisparados(desdeIso: string): Promise<number>;
  registrar(r: { ids: string[]; status: StatusDisparo; motivo?: string; sessao_url?: string }): Promise<void>;
}
export interface Deps {
  env: (k: string) => string | undefined;
  db: Db;
  fetchFn: typeof fetch;
  agora: () => Date;
}

/** Início do dia em America/Sao_Paulo (UTC-3 fixo; o Brasil não tem horário de verão desde 2019), em ISO UTC. */
export function inicioDiaBRT(agora: Date): string {
  const brt = new Date(agora.getTime() - 3 * 3600_000);
  const d = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate()) + 3 * 3600_000);
  return d.toISOString();
}

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") ?? "";
  const permitida = ORIGENS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
  const h: Record<string, string> = {
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
  if (permitida) h["access-control-allow-origin"] = o;
  return h;
}

export async function handler(req: Request, deps: Deps): Promise<Response> {
  const h = cors(req);
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...h, "content-type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return json({ disparou: false, erro: "método não permitido" }, 405);

  const agora = deps.agora();
  const { db } = deps;
  const ms = (iso: string | null) => (iso ? agora.getTime() - new Date(iso).getTime() : Infinity);

  try {
    const ids = await db.fila();

    /** Registro sem produção (ignorado/nao_configurado): no máx. 1 por minuto, para a tabela não crescer com spam. */
    const semProducao = async (status: "ignorado" | "nao_configurado", motivo: string) => {
      const ult = await db.ultimo(["ignorado", "nao_configurado"]);
      if (ms(ult) >= THROTTLE_MS) await db.registrar({ ids, status, motivo });
      return json({ disparou: false, motivo: motivo === "fila vazia" ? "fila_vazia" : motivo === "teto diário" ? "teto_diario" : motivo });
    };

    if (ids.length === 0) return await semProducao("ignorado", "fila vazia");

    if (ms(await db.ultimo(["disparado"])) < DEBOUNCE_MS) return await semProducao("ignorado", "debounce");
    if (await db.contarDisparados(inicioDiaBRT(agora)) >= TETO_DIA) return await semProducao("ignorado", "teto diário");

    const modo = (deps.env("PSN_PRODUCAO_MODO") || "github").toLowerCase();
    if (modo !== "github" && modo !== "rotina") return await semProducao("nao_configurado", "nao_configurado");

    let url: string;
    let init: RequestInit;
    if (modo === "github") {
      const gh = deps.env("PSN_GITHUB_TOKEN");
      if (!gh) return await semProducao("nao_configurado", "nao_configurado");
      url = GH_DISPATCH;
      init = {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${gh}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "psn-pauta-disparar",
        },
        body: JSON.stringify({ ref: "main", inputs: { ids: ids.join(",") } }),
      };
    } else {
      const token = deps.env("PSN_ROTINA_PRODUCAO_TOKEN");
      const trig = deps.env("PSN_ROTINA_PRODUCAO_TRIG");
      if (!token || !trig || !/^trig_[A-Za-z0-9]+$/.test(trig)) {
        return await semProducao("nao_configurado", "nao_configurado");
      }
      url = `${FIRE}/${trig}/fire`;
      init = {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: `Fila de produção (ids): ${ids.join(",")}` }),
      };
    }

    let resp: Response;
    try {
      resp = await deps.fetchFn(url, { ...init, signal: AbortSignal.timeout(15_000) });
    } catch {
      await db.registrar({ ids, status: "erro", motivo: "falha de rede" });
      return json({ disparou: false, motivo: "erro" });
    }
    if (!resp.ok) {
      await db.registrar({ ids, status: "erro", motivo: `HTTP ${resp.status}` });
      return json({ disparou: false, motivo: "erro" });
    }
    let sessao: string | undefined;
    if (modo === "github") {
      sessao = GH_PAGINA; // 204 sem corpo
    } else {
      try {
        const corpo = await resp.json();
        if (typeof corpo?.claude_code_session_url === "string") sessao = corpo.claude_code_session_url;
      } catch { /* resposta sem JSON: segue sem url */ }
    }
    await db.registrar({ ids, status: "disparado", sessao_url: sessao });
    return json(sessao ? { disparou: true, sessao_url: sessao } : { disparou: true });
  } catch {
    return json({ disparou: false, motivo: "erro_interno" }, 500);
  }
}
