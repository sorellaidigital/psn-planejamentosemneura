import { createClient } from "npm:@supabase/supabase-js@2";
import type { Db, StatusDisparo } from "./handler.ts";

export function criarDb(url: string, chave: string): Db {
  const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async fila() {
      const r = await sb.from("psn_pauta").select("id").in("status", ["aprovada_producao", "ajustar"])
        .order("aprovado_producao_em", { ascending: true, nullsFirst: false }).limit(50);
      if (r.error) throw new Error("fila");
      return (r.data ?? []).map((x: { id: string }) => x.id);
    },
    async ultimo(status: StatusDisparo[]) {
      const r = await sb.from("psn_pauta_disparo").select("criado_em").in("status", status)
        .order("criado_em", { ascending: false }).limit(1);
      if (r.error) throw new Error("ultimo");
      return r.data?.[0]?.criado_em ?? null;
    },
    async contarDisparados(desdeIso) {
      const r = await sb.from("psn_pauta_disparo").select("id", { count: "exact", head: true })
        .eq("status", "disparado").gte("criado_em", desdeIso);
      if (r.error) throw new Error("contar");
      return r.count ?? 0;
    },
    async registrar(x) {
      const r = await sb.from("psn_pauta_disparo").insert({
        ids: x.ids, status: x.status, motivo: x.motivo ?? null, sessao_url: x.sessao_url ?? null,
      });
      if (r.error) throw new Error("registrar");
    },
  };
}
