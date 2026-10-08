// Edge Function psn-ig-sync — coleta métricas do Instagram (Graph API) para o Postgres do PSN.
// Deploy com verify_jwt=false; a autenticação é o header x-psn-cron (ver README.md).
import { criarDb } from "./db.ts";
import { handler } from "./handler.ts";

Deno.serve((req) => {
  const env = (k: string) => Deno.env.get(k);
  return handler(req, {
    env,
    db: criarDb(env("SUPABASE_URL") ?? "", env("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
    fetchFn: fetch,
    dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
    agora: () => new Date(),
  });
});
