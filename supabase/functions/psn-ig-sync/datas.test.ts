import { assertEquals } from "jsr:@std/assert@1";
import { dataLocal, diaDoBucket, intervaloDatas, meiaNoiteLocalEpoch, somarDias } from "./datas.ts";

Deno.test("data local em torno da meia-noite (UTC-3)", () => {
  assertEquals(dataLocal("2026-10-08T02:59:59Z"), "2026-10-07"); // 23:59:59 local
  assertEquals(dataLocal("2026-10-08T03:00:00Z"), "2026-10-08"); // 00:00:00 local
  assertEquals(dataLocal("2026-10-08T00:30:00Z"), "2026-10-07");
  assertEquals(dataLocal("2026-01-01T02:00:00Z"), "2025-12-31"); // virada de ano
});

Deno.test("meia-noite local em epoch", () => {
  assertEquals(meiaNoiteLocalEpoch("2026-10-08"), Date.parse("2026-10-08T03:00:00Z") / 1000);
});

Deno.test("end_time do bucket aponta o dia anterior (local)", () => {
  // bucket fecha à meia-noite local de 08/10 → refere-se a 07/10
  assertEquals(diaDoBucket("2026-10-08T03:00:00+0000"), "2026-10-07");
  // bucket às 02:00Z ainda é 07/10 local → dia 06/10
  assertEquals(diaDoBucket("2026-10-08T02:00:00+0000"), "2026-10-06");
});

Deno.test("somarDias e intervaloDatas", () => {
  assertEquals(somarDias("2026-03-01", -1), "2026-02-28");
  assertEquals(intervaloDatas("2026-12-30", "2027-01-02"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
});
