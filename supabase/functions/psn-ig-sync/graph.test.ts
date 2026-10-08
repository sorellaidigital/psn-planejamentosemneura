import { assert, assertEquals, assertRejects, assertStringIncludes } from "jsr:@std/assert@1";
import { Graph, GraphError, Orcamento, OrcamentoEsgotado, redigir } from "./graph.ts";
import { erroGraph, fetchFalso } from "./_fakes.ts";

function graphCom(fn: typeof fetch, maxChamadas = 100, maxMs = 1e9) {
  const dormidas: number[] = [];
  const orcamento = new Orcamento(maxChamadas, maxMs);
  const g = new Graph({ token: "TOK_SECRETO_1", fetchFn: fn, dormir: (ms) => { dormidas.push(ms); return Promise.resolve(); }, orcamento });
  return { g, dormidas, orcamento };
}

Deno.test("retry com backoff exponencial no código 4 (rate limit)", async () => {
  const f = fetchFalso([[/\/x$/, (_u, n) => n < 3 ? erroGraph(4, "(#4) Application request limit reached") : { body: { ok: 1 } }]]);
  const { g, dormidas, orcamento } = graphCom(f.fn);
  const r = await g.get("x");
  assertEquals(r, { ok: 1 });
  assertEquals(dormidas, [2000, 4000]);
  assertEquals(f.chamadas.length, 3);
  assertEquals(orcamento.chamadas, 3); // cada tentativa gasta orçamento
});

Deno.test("backoff de rede: 1s, 2s... e desiste após maxRetries", async () => {
  const fn = (() => Promise.reject(new Error("falha ao conectar em https://graph.facebook.com/v25.0/x?access_token=TOK_SECRETO_1&a=1"))) as typeof fetch;
  const { g, dormidas } = graphCom(fn);
  const e = await assertRejects(() => g.get("x"), GraphError);
  assertEquals(dormidas, [1000, 2000, 4000, 8000]);
  assertEquals(e.code, -2);
  assert(!e.message.includes("TOK_SECRETO_1"));
  assertStringIncludes(e.message, "access_token=REDACTED");
});

Deno.test("erro 190 não sofre retry e a mensagem sai sem token", async () => {
  const f = fetchFalso([[/\/x$/, () => erroGraph(190, "Invalid OAuth access token. access_token=TOK_SECRETO_1 expirou", 401)]]);
  const { g, dormidas } = graphCom(f.fn);
  const e = await assertRejects(() => g.get("x"), GraphError);
  assertEquals(e.code, 190);
  assertEquals(dormidas, []);
  assertEquals(f.chamadas.length, 1);
  assert(!e.message.includes("TOK_SECRETO_1"));
});

Deno.test("orçamento de chamadas esgota (inclui retries)", async () => {
  const f = fetchFalso([[/\/x$/, () => erroGraph(4, "limit")]]);
  const { g } = graphCom(f.fn, 2);
  const e = await assertRejects(() => g.get("x"), OrcamentoEsgotado);
  assertEquals(e.motivo, "chamadas");
  assertEquals(f.chamadas.length, 2);
});

Deno.test("orçamento de tempo: não dorme além do prazo", async () => {
  let t = 0;
  const orc = new Orcamento(100, 10_000, () => t);
  const f = fetchFalso([[/\/x$/, () => { t += 9_000; return erroGraph(4, "limit"); }]]);
  const g = new Graph({ token: "TOK_SECRETO_1", fetchFn: f.fn, dormir: () => Promise.resolve(), orcamento: orc });
  const e = await assertRejects(() => g.get("x"), OrcamentoEsgotado);
  assertEquals(e.motivo, "tempo");
});

Deno.test("paginar segue paging.next e para quando o callback manda", async () => {
  const f = fetchFalso([[/\/lista$/, (_u, n) => ({
    body: { data: [{ id: `p${n}` }], paging: n < 5 ? { next: `https://graph.facebook.com/v25.0/lista?after=${n}&access_token=TOK` } : {} },
  })]]);
  const { g } = graphCom(f.fn);
  const vistos: string[] = [];
  await g.paginar("lista", {}, (d) => { vistos.push(d[0].id); return Promise.resolve(vistos.length === 3); });
  assertEquals(vistos, ["p1", "p2", "p3"]);
});

Deno.test("redigir mascara access_token, input_token e segredos literais", () => {
  const t = "GET /x?access_token=abc123&fields=id e input_token=zzz999 {\"access_token\":\"qwe456\"} segredo=SEGREDO_LONGO";
  const r = redigir(t, ["SEGREDO_LONGO"]);
  for (const s of ["abc123", "zzz999", "qwe456", "SEGREDO_LONGO"]) assert(!r.includes(s), s);
  assertStringIncludes(r, "fields=id");
});
