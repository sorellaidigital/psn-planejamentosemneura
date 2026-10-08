import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { DESEJADAS, GerenteMetricas, metricaRejeitada } from "./metricas.ts";
import { GraphError } from "./graph.ts";
import { AGORA, FakeDb } from "./_fakes.ts";

const err100 = (m: string) => new GraphError(m, { code: 100 });

Deno.test("erro 100 nomeando métrica: remove, persiste e repete sem ela", async () => {
  const db = new FakeDb(() => AGORA);
  const g = new GerenteMetricas(db, () => AGORA);
  const usadas: string[][] = [];
  const r = await g.comDegradacao("REELS", (m) => {
    usadas.push(m);
    if (m.includes("reels_skip_rate")) return Promise.reject(err100("(#100) The following metrics are not supported: reels_skip_rate"));
    return Promise.resolve("ok");
  });
  assertEquals(r, "ok");
  assertEquals(usadas.length, 2);
  assert(!usadas[1].includes("reels_skip_rate"));
  const salvo = await db.getConfig<{ metricas: string[]; removidas: Record<string, string> }>("working_metrics_REELS");
  assertEquals(salvo!.removidas, { reels_skip_rate: AGORA.toISOString() });
  assert(!salvo!.metricas.includes("reels_skip_rate"));
  assertEquals(g.removidasNaExecucao, ["REELS:reels_skip_rate"]);
});

Deno.test("removida há mais de 7 dias volta ao conjunto; falhando de novo, sai com data nova", async () => {
  const db = new FakeDb(() => AGORA);
  const velha = new Date(AGORA.getTime() - 8 * 86400000).toISOString();
  const recente = new Date(AGORA.getTime() - 2 * 86400000).toISOString();
  await db.setConfig("working_metrics_FEED", {
    metricas: DESEJADAS.FEED.filter((m) => m !== "follows" && m !== "profile_visits"),
    removidas: { follows: velha, profile_visits: recente },
  });
  const g = new GerenteMetricas(db, () => AGORA);
  const ativas = await g.ativas("FEED");
  assert(ativas.includes("follows"), "follows deveria voltar após 7 dias");
  assert(!ativas.includes("profile_visits"), "profile_visits ainda está de molho");
  assertEquals(g.reativadasNaExecucao, ["FEED:follows"]);

  // falha de novo → removida outra vez, com a data de agora
  await g.comDegradacao("FEED", (m) =>
    m.includes("follows") ? Promise.reject(err100("Invalid metric: follows")) : Promise.resolve(1));
  const salvo = await db.getConfig<{ removidas: Record<string, string> }>("working_metrics_FEED");
  assertEquals(salvo!.removidas.follows, AGORA.toISOString());
  assertEquals(salvo!.removidas.profile_visits, recente);
});

Deno.test("erro 100 sem métrica identificável é propagado; outros códigos também", async () => {
  const g = new GerenteMetricas(new FakeDb(), () => AGORA);
  await assertRejects(() => g.comDegradacao("account", () => Promise.reject(err100("Invalid parameter"))), GraphError);
  await assertRejects(() => g.comDegradacao("account", () => Promise.reject(new GraphError("x", { code: 190 }))), GraphError);
});

Deno.test("todas removidas → resultado null", async () => {
  const g = new GerenteMetricas(new FakeDb(), () => AGORA);
  const r = await g.comDegradacao("FEED", (m) => Promise.reject(err100(`bad metric ${m[0]}`)));
  assertEquals(r, null);
});

Deno.test("metricaRejeitada casa por palavra inteira", () => {
  assertEquals(metricaRejeitada("metric shares not valid", ["saved", "shares"]), "shares");
  assertEquals(metricaRejeitada("bad ig_reels_avg_watch_time", ["views", "ig_reels_avg_watch_time"]), "ig_reels_avg_watch_time");
  assertEquals(metricaRejeitada("profile_views invalid", ["views"]), null);
});

Deno.test("conta pede visitas ao perfil (profile_views, total_value por dia na v25)", () => {
  assert((DESEJADAS.account as readonly string[]).includes("profile_views"));
});
