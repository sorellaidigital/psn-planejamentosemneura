import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { handler } from "./handler.ts";
import { AGORA, erroGraph, FakeDb, IG, montarDeps, req, rotasPadrao, TOKEN } from "./_fakes.ts";

const lerJson = async (r: Response) => await r.json();

Deno.test("auth: sem header, header errado e método errado", async () => {
  const { deps } = montarDeps(rotasPadrao());
  assertEquals((await handler(req({}), deps)).status, 401);
  assertEquals((await handler(req({ "x-psn-cron": "errado" }), deps)).status, 401);
  assertEquals((await handler(req({ "x-psn-cron": "cron-secret-xyz" }, undefined, "GET"), deps)).status, 405);
  assertEquals((await handler(req(undefined, { tipo: "foo" }), deps)).status, 400);
  assertEquals(deps.db instanceof FakeDb && (deps.db as FakeDb).syncs.length, 0); // nada gravado
});

Deno.test("auth: sem PSN_CRON_SECRET configurado nunca abre", async () => {
  const { deps } = montarDeps(rotasPadrao(), { PSN_CRON_SECRET: "" });
  assertEquals((await handler(req({ "x-psn-cron": "" }), deps)).status, 500);
});

Deno.test("lock: run 'rodando' recente → 409; órfão antigo vira erro e a coleta segue", async () => {
  const { deps, db } = montarDeps(rotasPadrao());
  db.syncs.push({ id: 1, tipo: "cron", iniciado_em: new Date(AGORA.getTime() - 5 * 60000).toISOString(), status: "rodando" });
  const r = await handler(req(), deps);
  assertEquals(r.status, 409);

  db.syncs[0].iniciado_em = new Date(AGORA.getTime() - 30 * 60000).toISOString();
  const r2 = await handler(req(undefined, { tipo: "manual" }), deps);
  assertEquals(r2.status, 200);
  assertEquals(db.syncs[0].status, "erro");
  assertEquals(db.syncs[1].status, "ok");
  assertEquals(db.syncs[1].tipo, "manual");
});

Deno.test("coleta completa: grava tudo, estado em config e nenhum segredo vaza", async () => {
  const { deps, db } = montarDeps(rotasPadrao());
  const r = await handler(req(), deps);
  const corpo = await lerJson(r);
  assertEquals(r.status, 200);
  assertEquals(corpo.ok, true);
  assertEquals(corpo.parcial, false);
  assertEquals(corpo.sync_id, 1);
  assertEquals(corpo.contagens.midias_listadas, 2);

  assertEquals(db.snapshots, [{ data: "2026-10-08", seguidores: 1000, seguindo: 50, n_midias: 2 }].map((x) => ({ ...x, seguindo: 50, n_midias: 2 })));
  assertEquals(db.conta.get("2026-10-07|follower_count"), 3); // end_time 08/10 03:00Z → dia 07
  assertEquals(db.conta.get("2026-10-08|views"), 250);
  assertEquals(db.conta.get("2026-09-10|reach"), 100); // janela de 28 dias preenchida
  assertEquals(db.midias.get("m2")!.tipo_produto, "REELS");
  assertEquals(db.midias.get("m1")!.publicado_em, "2026-10-07T12:00:00.000Z");
  assertEquals(db.insights.filter((i) => i.metrica === "saved").length, 2);
  for (const k of ["follower_backfill_done", "last_full_media_walk", "last_old_media_pass", "ultima_coleta_ok"]) {
    // last_old_media_pass só existe se houver mídias antigas devidas: sempre devida na 1ª vez
    assert(db.config.has(k), k);
  }
  assertEquals(db.syncs[0].status, "ok");
  const tudo = JSON.stringify([db.syncs, [...db.config.entries()], corpo]);
  assert(!tudo.includes(TOKEN));
});

Deno.test("rerun não duplica: mesmas chaves, insights por run", async () => {
  const { deps, db } = montarDeps(rotasPadrao());
  await handler(req(), deps);
  const linhasConta = db.conta.size;
  const nMidias = db.midias.size;
  await handler(req(), deps);
  assertEquals(db.conta.size, linhasConta);
  assertEquals(db.midias.size, nMidias);
  assertEquals(db.snapshots.length, 1);
});

Deno.test("erro 190 em qualquer chamada: run 'erro' e token_saude.valido=false sem vazar token", async () => {
  const rotas = [[/./, () => erroGraph(190, `Error validating access token: access_token=${TOKEN} expirou`, 401)]] as ReturnType<typeof rotasPadrao>;
  const { deps, db } = montarDeps(rotas);
  const r = await handler(req(), deps);
  assertEquals(r.status, 500);
  const corpo = await lerJson(r);
  assertEquals(corpo.ok, false);
  const saude = await db.getConfig<{ valido: boolean; erro: string }>("token_saude");
  assertEquals(saude!.valido, false);
  assertStringIncludes(saude!.erro, "expirou");
  assertEquals(db.syncs[0].status, "erro");
  assertEquals(db.config.has("ultima_coleta_ok"), false);
  assert(!JSON.stringify([db.syncs, [...db.config.entries()], corpo]).includes(TOKEN));
});

Deno.test("token que volta a funcionar limpa valido=false", async () => {
  const { deps, db } = montarDeps(rotasPadrao());
  await db.setConfig("token_saude", { valido: false, erro: "velho", verificado_em: "2026-10-01T00:00:00Z" });
  await handler(req(), deps);
  const saude = await db.getConfig<{ valido: boolean; erro?: string }>("token_saude");
  assertEquals(saude!.valido, true);
  assertEquals(saude!.erro, undefined);
});

Deno.test("orçamento esgotado → status ok, parcial=true e o que falta", async () => {
  const { deps, db } = montarDeps(rotasPadrao(), { PSN_MAX_CALLS: "3" });
  const r = await handler(req(), deps);
  const corpo = await lerJson(r);
  assertEquals(r.status, 200);
  assertEquals(corpo.ok, true);
  assertEquals(corpo.parcial, true);
  assertEquals(db.syncs[0].status, "ok");
  const d = db.syncs[0].detalhe as { parcial: { motivo: string; etapa: string; restante: { etapas: string[] } }; chamadas: number };
  assertEquals(d.parcial.motivo, "chamadas");
  assertEquals(d.chamadas, 3);
  assert(d.parcial.restante.etapas.includes("insights_recentes"));
});

Deno.test("debug_token 1x por dia, com app token, sem guardar valores do token", async () => {
  const rotas = [
    [/debug_token$/, (u: URL) => {
      assertEquals(u.searchParams.get("access_token"), "APP1|SEGREDOAPP");
      assertEquals(u.searchParams.get("input_token"), TOKEN);
      return { body: { data: { is_valid: true, expires_at: 1798000000, data_access_expires_at: 1790000000, scopes: ["instagram_basic", "instagram_manage_insights"] } } };
    }],
    ...rotasPadrao(),
  ] as ReturnType<typeof rotasPadrao>;
  const { deps, db, chamadas } = montarDeps(rotas, { META_APP_ID: "APP1", META_APP_SECRET: "SEGREDOAPP" });
  await handler(req(), deps);
  const saude = await db.getConfig<Record<string, unknown>>("token_saude");
  assertEquals(saude!.valido, true);
  assertEquals(saude!.escopos, ["instagram_basic", "instagram_manage_insights"]);
  assertEquals(saude!.expira_em, new Date(1798000000 * 1000).toISOString());
  assert(!JSON.stringify(saude).includes(TOKEN));
  assert(!JSON.stringify(db.syncs).includes("SEGREDOAPP"));
  const n1 = chamadas.filter((u) => u.pathname.endsWith("debug_token")).length;
  await handler(req(), deps);
  assertEquals(chamadas.filter((u) => u.pathname.endsWith("debug_token")).length, n1); // gate diário
  assertEquals(n1, 1);
});

Deno.test("e2e degradação: métrica de conta rejeitada é removida, persistida, e a coleta termina", async () => {
  const base = rotasPadrao();
  const rotas = [
    [new RegExp(`/${IG}/insights$`), (u: URL) => {
      const m = u.searchParams.get("metric") ?? "";
      if (m.includes("profile_links_taps")) return erroGraph(100, "(#100) metric[10] must be one of the following values: ... profile_links_taps");
      if (m === "follower_count") return { body: { data: [] } };
      return { body: { data: [{ name: "reach", total_value: { value: 1 } }] } };
    }],
    ...base,
  ] as ReturnType<typeof rotasPadrao>;
  const { deps, db } = montarDeps(rotas);
  const r = await handler(req(), deps);
  assertEquals(r.status, 200);
  const salvo = await db.getConfig<{ metricas: string[]; removidas: Record<string, string> }>("working_metrics_account");
  assertEquals(Object.keys(salvo!.removidas), ["profile_links_taps"]);
  assert(!salvo!.metricas.includes("profile_links_taps"));
  assertEquals((db.syncs[0].detalhe as { metricas_removidas: string[] }).metricas_removidas, ["account:profile_links_taps"]);
});

Deno.test("passada semanal das mídias antigas é retomável (cursor)", async () => {
  const db = new FakeDb(() => AGORA);
  // 5 mídias antigas já conhecidas; conta/backfill/lista em dia → só sobram os insights
  const antigas = [1, 2, 3, 4, 5].map((i) => ({ id: `o${i}`, tipo: "IMAGE", tipo_produto: "FEED", legenda: null, permalink: null, media_url: null, thumbnail_url: null, publicado_em: `2025-0${i}-10T12:00:00.000Z`, curtidas: 0, comentarios: 0 }));
  for (const m of antigas) db.midias.set(m.id, m);
  await db.setConfig("follower_backfill_done", true);
  await db.setConfig("last_full_media_walk", AGORA.toISOString());
  for (let d = 10; d <= 30; d++) await db.upsertContaDiaria([{ data: `2026-09-${d}`, metrica: "views", valor: 1 }]);
  for (let d = 1; d <= 6; d++) await db.upsertContaDiaria([{ data: `2026-10-0${d}`, metrica: "views", valor: 1 }]);
  const rotas = [
    ...rotasPadrao().filter(([re]) => !re.source.includes("media$")),
    [new RegExp(`/${IG}/media$`), () => ({ body: { data: antigas.map((m) => ({ id: m.id, timestamp: m.publicado_em })) } })],
  ] as ReturnType<typeof rotasPadrao>;
  // snapshot 1 + conta (ontem, hoje) 2 + lista 1 = 4 chamadas; budget 7 → 3 antigas
  const a = montarDeps(rotas, { PSN_MAX_CALLS: "7" }, db);
  const r1 = await lerJson(await handler(req(), a.deps));
  assertEquals(r1.parcial, true);
  assertEquals(r1.contagens.insights_antigas, 3);
  const est = await db.getConfig<{ cursor: { id: string } | null; concluido_em?: string | null }>("last_old_media_pass");
  assertEquals(est!.cursor!.id, "o3"); // desc por data: o5, o4, o3 feitas
  assertEquals(est!.concluido_em ?? null, null);

  // próximo run retoma do cursor e conclui
  const b = montarDeps(rotas, {}, db);
  const r2 = await lerJson(await handler(req(), b.deps));
  assertEquals(r2.parcial, false);
  assertEquals(r2.contagens.insights_antigas, 2);
  const est2 = await db.getConfig<{ cursor: unknown; concluido_em: string }>("last_old_media_pass");
  assertEquals(est2!.cursor, null);
  assertEquals(est2!.concluido_em, AGORA.toISOString());

  // run seguinte (mesma semana): nada de antigas
  const c = montarDeps(rotas, {}, db);
  const r3 = await lerJson(await handler(req(), c.deps));
  assertEquals(r3.contagens.insights_antigas ?? 0, 0);
});

Deno.test("erro 10 marca mídia com insights indisponíveis e segue", async () => {
  const rotas = [
    [/\/m1\/insights$/, () => erroGraph(10, "(#10) Application does not have permission")],
    ...rotasPadrao(),
  ] as ReturnType<typeof rotasPadrao>;
  const { deps, db } = montarDeps(rotas);
  const r = await handler(req(), deps);
  assertEquals(r.status, 200);
  assertEquals(db.midias.get("m1")!.insights_indisponivel, true);
  assert(db.insights.some((i) => i.midia_id === "m2"));
});
