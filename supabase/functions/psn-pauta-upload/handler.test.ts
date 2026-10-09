import { assertEquals } from "jsr:@std/assert@1";
import { type Db, handler } from "./handler.ts";

const SEGREDO = "segredo-da-rotina-0123456789";
const PAUTA = "e831a498-391b-4e29-ac66-194d3aa987c1";
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

class FakeDb implements Db {
  gravados: { path: string; bytes: number; contentType: string }[] = [];
  pautas = new Map<string, string>([[PAUTA, "em_producao"]]);
  segredoOk(s: string) {
    return Promise.resolve(s === SEGREDO);
  }
  statusPauta(id: string) {
    return Promise.resolve(this.pautas.get(id) ?? null);
  }
  gravar(path: string, bytes: Uint8Array, contentType: string) {
    this.gravados.push({ path, bytes: bytes.length, contentType });
    return Promise.resolve();
  }
}

function req(query: string, o: { segredo?: string | null; ct?: string; body?: BodyInit; method?: string } = {}) {
  const h: Record<string, string> = {};
  if (o.segredo !== null) h["x-psn-segredo"] = o.segredo ?? SEGREDO;
  if (o.ct) h["content-type"] = o.ct;
  return new Request(`https://x.test/functions/v1/psn-pauta-upload?${query}`, {
    method: o.method ?? "POST",
    headers: h,
    body: o.method === "GET" ? undefined : (o.body ?? PNG),
  });
}
const q = `pauta=${PAUTA}&n=1`;

Deno.test("sem segredo ou segredo errado: 401 e nada gravado", async () => {
  const db = new FakeDb();
  assertEquals((await handler(req(q, { segredo: null, ct: "image/png" }), { db })).status, 401);
  assertEquals((await handler(req(q, { segredo: "errado-errado-errado-1", ct: "image/png" }), { db })).status, 401);
  assertEquals((await handler(req(q, { segredo: "curto", ct: "image/png" }), { db })).status, 401);
  assertEquals(db.gravados.length, 0);
});

Deno.test("corpo binário png grava no path certo", async () => {
  const db = new FakeDb();
  const r = await handler(req(`pauta=${PAUTA}&n=3`, { ct: "image/png" }), { db });
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { ok: true, path: `${PAUTA}/03.png` });
  assertEquals(db.gravados[0].contentType, "image/png");
});

Deno.test("multipart grava; jpeg vira .jpg", async () => {
  const db = new FakeDb();
  const fd = new FormData();
  fd.append("file", new File([PNG], "a.png", { type: "image/png" }));
  const r = await handler(new Request(`https://x.test/?${q}`, { method: "POST", headers: { "x-psn-segredo": SEGREDO }, body: fd }), { db });
  assertEquals(r.status, 200);
  assertEquals((await r.json()).path, `${PAUTA}/01.png`);
  const r2 = await handler(req(`pauta=${PAUTA}&n=12`, { ct: "image/jpeg" }), { db });
  assertEquals((await r2.json()).path, `${PAUTA}/12.jpg`);
});

Deno.test("mime inválido 400, vazio 400, grande 413", async () => {
  const db = new FakeDb();
  assertEquals((await handler(req(q, { ct: "text/plain" }), { db })).status, 400);
  assertEquals((await handler(req(q, { ct: "image/gif" }), { db })).status, 400);
  assertEquals((await handler(req(q, { ct: "image/png", body: new Uint8Array(0) }), { db })).status, 400);
  assertEquals((await handler(req(q, { ct: "image/png", body: new Uint8Array(10 * 1024 * 1024 + 1) }), { db })).status, 413);
  assertEquals(db.gravados.length, 0);
});

Deno.test("uuid e n inválidos: 400", async () => {
  const db = new FakeDb();
  assertEquals((await handler(req("pauta=abc&n=1", { ct: "image/png" }), { db })).status, 400);
  assertEquals((await handler(req(`pauta=${PAUTA}&n=0`, { ct: "image/png" }), { db })).status, 400);
  assertEquals((await handler(req(`pauta=${PAUTA}&n=21`, { ct: "image/png" }), { db })).status, 400);
  assertEquals((await handler(req(`pauta=${PAUTA}&n=x`, { ct: "image/png" }), { db })).status, 400);
  assertEquals((await handler(req(`pauta=${PAUTA}`, { ct: "image/png" }), { db })).status, 400);
});

Deno.test("pauta inexistente 404; status errado 409; aceita para_revisar e ajustar", async () => {
  const db = new FakeDb();
  const outra = "11111111-2222-4333-8444-555555555555";
  assertEquals((await handler(req(`pauta=${outra}&n=1`, { ct: "image/png" }), { db })).status, 404);
  db.pautas.set(outra, "postado");
  assertEquals((await handler(req(`pauta=${outra}&n=1`, { ct: "image/png" }), { db })).status, 409);
  for (const s of ["para_revisar", "ajustar"]) {
    db.pautas.set(outra, s);
    assertEquals((await handler(req(`pauta=${outra}&n=1`, { ct: "image/png" }), { db })).status, 200);
  }
});

Deno.test("método GET: 405", async () => {
  assertEquals((await handler(req(q, { method: "GET" }), { db: new FakeDb() })).status, 405);
});
