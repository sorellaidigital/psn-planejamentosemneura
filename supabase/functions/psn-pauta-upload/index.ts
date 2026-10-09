// Edge Function psn-pauta-upload — recebe o PNG de um slide e grava em psn-pautas/<pauta>/<NN>.png.
// Deploy com verify_jwt=false; a autenticação é o header x-psn-segredo (ver README.md).
import { criarDb } from "./db.ts";
import { handler } from "./handler.ts";

Deno.serve((req) =>
  handler(req, {
    db: criarDb(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
  })
);
