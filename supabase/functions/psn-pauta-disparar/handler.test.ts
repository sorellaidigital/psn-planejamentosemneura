import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Db, handler, inicioDiaBRT, type StatusDisparo, TETO_DIA } from "./handler.ts";

const AGORA = new Date("2026-10-09T15:00:00Z");
const ID = "e831a498-391b-4e29-ac66-194d3aa987c1";
const TOKEN = "tok-super-secreto-123";

interface Reg { criado_em: string; ids: string[]; status: StatusDisparo; motivo?: string; sessao_url?: string }
class FakeDb implements Db {
  regs: Reg[] = [];
  filaIds: string[] = [ID];
  fila() {
    return Promise.resolve(this.filaIds);
  }
  ultimo(st: StatusDisparo[]) {
    const r = this.regs.filter((x) => st.includes(x.status)).map((x) => x.criado_em).sort().pop();
    return Promise.resolve(r ?? null);
  }
  idsUltimoDisparado() {
    const r = this.regs.filter((x) => x.status === "disparado").sort((a, b) => a.criado_em.localeCompare(b.criado_em)).pop();
    return Promise.resolve(r?.ids ?? []);
  }
  contarDisparados(desde: string) {
    return Promise.resolve(this.regs.filter((x) => x.status === "disparado" && x.criado_em >= desde).length);
  }
  registrar(r: { ids: string[]; status: StatusDisparo; motivo?: string; sessao_url?: string }) {
    this.regs.push({ criado_em: AGORA.toISOString(), ...r });
    return Promise.resolve();
  }
}
const ha = (ms: number) => new Date(AGORA.getTime() - ms).toISOString();

function montar(envExtra: Record<string, string> = {}, fetchFn?: typeof fetch) {
  const db = new FakeDb();
  const chamadas: { url: string; init: RequestInit }[] = [];
  const env: Record<string, string> = { PSN_PRODUCAO_MODO: "rotina", PSN_ROTINA_PRODUCAO_TOKEN: TOKEN, PSN_ROTINA_PRODUCAO_TRIG: "trig_abc123", ...envExtra };
  const f = fetchFn ?? ((url: string | URL | Request, init?: RequestInit) => {
    chamadas.push({ url: String(url), init: init! });
    return Promise.resolve(new Response(JSON.stringify({ claude_code_session_url: "https://claude.ai/code/session_X" }), { status: 200 }));
  }) as typeof fetch;
  return { db, chamadas, deps: { env: (k: string) => env[k] || undefined, db, fetchFn: f, agora: () => AGORA } };
}
const post = (origin?: string) =>
  new Request("https://x.test/functions/v1/psn-pauta-disparar", { method: "POST", headers: origin ? { origin } : {} });

Deno.test("fila vazia: ignorado, não dispara, sem chamar a API", async () => {
  const { db, deps, chamadas } = montar();
  db.filaIds = [];
  const r = await handler(post(), deps);
  assertEquals((await r.json()).disparou, false);
  assertEquals(db.regs.map((x) => [x.status, x.motivo]), [["ignorado", "fila vazia"]]);
  assertEquals(chamadas.length, 0);
});

Deno.test("throttle: 2ª chamada com fila vazia em < 60 s não grava", async () => {
  const { db, deps } = montar();
  db.filaIds = [];
  db.regs.push({ criado_em: ha(30_000), ids: [], status: "ignorado", motivo: "fila vazia" });
  await handler(post(), deps);
  assertEquals(db.regs.length, 1);
  db.regs[0].criado_em = ha(61_000);
  await handler(post(), deps);
  assertEquals(db.regs.length, 2);
});

Deno.test("debounce: disparado há < 2 min => ignorado", async () => {
  const { db, deps, chamadas } = montar();
  db.regs.push({ criado_em: ha(60_000), ids: [ID], status: "disparado" });
  const r = await handler(post(), deps);
  assertEquals(await r.json(), { disparou: false, motivo: "debounce" });
  assertEquals(db.regs[1].motivo, "debounce");
  assertEquals(chamadas.length, 0);
});

Deno.test("debounce não segura item novo: fila com id fora do último disparo => dispara", async () => {
  const { db, deps, chamadas } = montar();
  const NOVO = "0b5a3a52-8f3e-4f0e-9a3c-2d6f1c1e7a10";
  db.filaIds = [ID, NOVO];
  db.regs.push({ criado_em: ha(60_000), ids: [ID], status: "disparado" });
  const r = await handler(post(), deps);
  assertEquals((await r.json()).disparou, true);
  assertEquals(chamadas.length, 1);
});

Deno.test("teto: TETO_DIA disparados hoje => ignorado 'teto diário'; ontem (BRT) não conta", async () => {
  const { db, deps, chamadas } = montar();
  assertEquals(TETO_DIA, 10);
  for (let i = 0; i < TETO_DIA; i++) db.regs.push({ criado_em: ha(3 * 3600_000 + i * 1000), ids: [ID], status: "disparado" });
  const r = await handler(post(), deps);
  assertEquals((await r.json()).motivo, "teto_diario");
  assertEquals(db.regs.at(-1)?.motivo, "teto diário");
  assertEquals(chamadas.length, 0);
  // 02:59Z do dia 9 ainda é dia 8 em BRT
  assertEquals(inicioDiaBRT(new Date("2026-10-09T02:59:00Z")), "2026-10-08T03:00:00.000Z");
  assertEquals(inicioDiaBRT(new Date("2026-10-09T03:00:00Z")), "2026-10-09T03:00:00.000Z");
});

Deno.test("não configurado: sem token ou sem trig => 200 disparou:false e registra", async () => {
  const casos: Record<string, string>[] = [{ PSN_ROTINA_PRODUCAO_TOKEN: "" }, { PSN_ROTINA_PRODUCAO_TRIG: "" }, { PSN_ROTINA_PRODUCAO_TRIG: "../x" }, { PSN_PRODUCAO_MODO: "github", PSN_GITHUB_TOKEN: "" }, { PSN_PRODUCAO_MODO: "invalido" }];
  for (const env of casos) {
    const { db, deps, chamadas } = montar(env);
    const r = await handler(post(), deps);
    assertEquals(r.status, 200);
    assertEquals(await r.json(), { disparou: false, motivo: "nao_configurado" });
    assertEquals(db.regs[0].status, "nao_configurado");
    assertEquals(chamadas.length, 0);
  }
});

Deno.test("sucesso: POST na rota certa, headers, corpo só com ids, registra sessao_url", async () => {
  const { db, deps, chamadas } = montar();
  db.filaIds = [ID, "11111111-2222-4333-8444-555555555555"];
  const r = await handler(post(), deps);
  assertEquals(await r.json(), { disparou: true, sessao_url: "https://claude.ai/code/session_X" });
  assertEquals(chamadas.length, 1);
  assertEquals(chamadas[0].url, "https://api.anthropic.com/v1/claude_code/routines/trig_abc123/fire");
  const hd = chamadas[0].init.headers as Record<string, string>;
  assertEquals(hd["Authorization"], `Bearer ${TOKEN}`);
  assertEquals(hd["anthropic-version"], "2023-06-01");
  assertEquals(JSON.parse(chamadas[0].init.body as string), { text: `Fila de produção (ids): ${ID},11111111-2222-4333-8444-555555555555` });
  assertEquals(db.regs[0].status, "disparado");
  assertEquals(db.regs[0].sessao_url, "https://claude.ai/code/session_X");
});

Deno.test("erro HTTP: registra 'erro' com status e não vaza o token", async () => {
  const f = (() => Promise.resolve(new Response(`unauthorized ${TOKEN}`, { status: 401 }))) as typeof fetch;
  const { db, deps } = montar({}, f);
  const r = await handler(post(), deps);
  const corpo = await r.text();
  assertEquals(r.status, 200);
  assertEquals(JSON.parse(corpo).disparou, false);
  assertEquals(db.regs[0].status, "erro");
  assertEquals(db.regs[0].motivo, "HTTP 401");
  assert(!corpo.includes(TOKEN) && !JSON.stringify(db.regs).includes(TOKEN));
});

Deno.test("erro de rede: registra sem ecoar a mensagem (que poderia conter o token)", async () => {
  const f = (() => Promise.reject(new Error(`boom ${TOKEN}`))) as typeof fetch;
  const { db, deps } = montar({}, f);
  await handler(post(), deps);
  assertEquals(db.regs[0].status, "erro");
  assert(!JSON.stringify(db.regs).includes(TOKEN));
});

Deno.test("CORS: OPTIONS e origens permitidas", async () => {
  const { deps } = montar();
  const r = await handler(new Request("https://x.test/", { method: "OPTIONS", headers: { origin: "https://planejamento-sem-neura.netlify.app" } }), deps);
  assertEquals(r.status, 204);
  assertEquals(r.headers.get("access-control-allow-origin"), "https://planejamento-sem-neura.netlify.app");
  const l = await handler(post("http://localhost:5173"), deps);
  assertEquals(l.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const x = await handler(post("https://evil.example"), deps);
  assertEquals(x.headers.get("access-control-allow-origin"), null);
  assertEquals((await handler(new Request("https://x.test/", { method: "GET" }), deps)).status, 405);
});

const GH = "https://api.github.com/repos/sorellaidigital/mecanismo-car/actions/workflows/producao-pauta.yml/dispatches";
const PAGINA = "https://github.com/sorellaidigital/mecanismo-car/actions/workflows/producao-pauta.yml";

Deno.test("modo github (padrão): dispatch com ref/inputs.ids, 204 => sessao_url da página do workflow", async () => {
  const chamadas: { url: string; init: RequestInit }[] = [];
  const f = ((url: string, init: RequestInit) => {
    chamadas.push({ url: String(url), init });
    return Promise.resolve(new Response(null, { status: 204 }));
  }) as unknown as typeof fetch;
  const { db, deps } = montar({ PSN_PRODUCAO_MODO: "", PSN_GITHUB_TOKEN: "ghp_segredo" }, f);
  db.filaIds = [ID, "11111111-2222-4333-8444-555555555555"];
  const r = await handler(post(), deps);
  assertEquals(await r.json(), { disparou: true, sessao_url: PAGINA });
  assertEquals(chamadas[0].url, GH);
  const hd = chamadas[0].init.headers as Record<string, string>;
  assertEquals(hd["Authorization"], "Bearer ghp_segredo");
  assertEquals(hd["Accept"], "application/vnd.github+json");
  assertEquals(hd["X-GitHub-Api-Version"], "2022-11-28");
  assertEquals(JSON.parse(chamadas[0].init.body as string), { ref: "main", inputs: { ids: `${ID},11111111-2222-4333-8444-555555555555` } });
  assertEquals(db.regs[0].status, "disparado");
  assertEquals(db.regs[0].sessao_url, PAGINA);
});

Deno.test("modo github: erro HTTP não vaza token; debounce vale também", async () => {
  const f = (() => Promise.resolve(new Response("Bad credentials ghp_segredo", { status: 403 }))) as typeof fetch;
  const { db, deps } = montar({ PSN_PRODUCAO_MODO: "github", PSN_GITHUB_TOKEN: "ghp_segredo" }, f);
  const r = await handler(post(), deps);
  assert(!(await r.text()).includes("ghp_segredo"));
  assertEquals(db.regs[0].motivo, "HTTP 403");
  assert(!JSON.stringify(db.regs).includes("ghp_segredo"));
  db.regs.push({ criado_em: ha(10_000), ids: [ID], status: "disparado" });
  assertEquals((await (await handler(post(), deps)).json()).motivo, "debounce");
});
