// Edge Function psn-pauta-disparar — o app chama depois de "Produzir/Ajustar"; dispara a rotina "Produção da Pauta".
// Deploy com verify_jwt=true (o app manda a chave anon). Ver README.md.
import { criarDb } from "./db.ts";
import { handler } from "./handler.ts";

Deno.serve((req) => {
  const env = (k: string) => Deno.env.get(k);
  return handler(req, {
    env,
    db: criarDb(env("SUPABASE_URL") ?? "", env("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
    fetchFn: fetch,
    agora: () => new Date(),
  });
});
