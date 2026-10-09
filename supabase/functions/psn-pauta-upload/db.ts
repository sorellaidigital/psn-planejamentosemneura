import { createClient } from "npm:@supabase/supabase-js@2";
import type { Db } from "./handler.ts";

export function criarDb(url: string, chave: string): Db {
  const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async segredoOk(segredo) {
      const r = await sb.rpc("psn_pauta_segredo_ok", { segredo });
      if (r.error) throw new Error("segredo_ok");
      return r.data === true;
    },
    async statusPauta(id) {
      const r = await sb.from("psn_pauta").select("status").eq("id", id).maybeSingle();
      if (r.error) throw new Error("pauta");
      return r.data?.status ?? null;
    },
    async gravar(path, bytes, contentType) {
      const r = await sb.storage.from("psn-pautas").upload(path, bytes, { contentType, upsert: true });
      if (r.error) throw new Error("storage");
    },
  };
}
