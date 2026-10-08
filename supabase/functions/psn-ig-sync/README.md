# psn-ig-sync

Edge Function (Deno/TypeScript) que coleta as métricas do Instagram pela Meta Graph API (v25.0)
e grava nas tabelas `psn_ig_*` (migração `20261008_psn_ig_v1.sql`). É o porte para Supabase do coletor
`ig-analytics` (Node/SQLite), sem stories, demografia, espelho de cards, gatilho viral e Notion.

## O que faz (uma execução)

1. **Saúde do token** (1x por dia, se houver `META_APP_ID`/`META_APP_SECRET`): `debug_token` -> `psn_ig_config.token_saude`.
2. **Snapshot da conta** -> `psn_ig_conta_snapshot` (seguidores, seguindo, n_midias; data local São Paulo).
3. **Backfill de `follower_count`** (uma única vez, 30 dias; `follower_backfill_done`).
4. **Métricas diárias da conta** -> `psn_ig_conta_diaria`, uma chamada por dia (`metric_type=total_value`) na janela de 28 dias:
   preenche só as lacunas e sempre refaz ontem e hoje.
5. **Lista de mídias** -> `psn_ig_midia`: incremental (para na primeira página toda conhecida) e re-varredura completa a cada 7 dias (`last_full_media_walk`).
6. **Insights por mídia** -> `psn_ig_midia_insight` (um snapshot por execução, `capturado_em` = início do run):
   - mídias dos últimos 90 dias: a cada execução;
   - mais antigas: uma passada por semana, **retomável** (`last_old_media_pass` guarda `concluido_em` e `cursor`);
   - conjuntos de métricas separados para FEED e REELS; erro 10 marca `insights_indisponivel`.

Datas são sempre locais (`America/Sao_Paulo`). O `end_time` dos buckets da Graph marca o fim do dia, então o dia gravado é o anterior (igual ao original).
Tudo é gravado com upsert (`onConflict`), então reexecutar nunca duplica.

### Degradação de métricas
Erro 100 citando uma métrica a remove do conjunto naquela execução e grava o conjunto em
`psn_ig_config` (`working_metrics_account`, `working_metrics_FEED`, `working_metrics_REELS`) como
`{ metricas: [...], removidas: { metrica: "data-iso" } }`. Métricas removidas há mais de **7 dias** voltam a ser tentadas;
se falharem de novo, saem outra vez com data nova.

### Estado em `psn_ig_config`
`follower_backfill_done`, `last_full_media_walk`, `last_old_media_pass`, `ultima_coleta_ok`, `token_saude`, `working_metrics_*`.
Nunca há valor de token ali (só validade, escopos e flags).

### Token (erro 190)
Se a Graph devolver 190 em qualquer chamada, grava `token_saude.valido=false` (com a mensagem, sem token) e o run termina como `erro`.
Uma coleta posterior bem-sucedida volta `valido` para `true`.

## Segredos

```bash
supabase secrets set META_PAGE_TOKEN=... META_IG_USER_ID=... PSN_CRON_SECRET=...
# opcionais (saúde do token via debug_token):
supabase secrets set META_APP_ID=... META_APP_SECRET=...
# opcionais (limites): PSN_MAX_CALLS (padrão 400), PSN_MAX_SEGUNDOS (padrão 120)
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados pelo Supabase. Nunca coloque os valores no repositório.

## Deploy (não executado por este código)

```bash
supabase functions deploy psn-ig-sync --no-verify-jwt
```

A função não usa JWT: a autenticação é o header `x-psn-cron`, que deve ser igual a `PSN_CRON_SECRET` (senão 401).
Se `PSN_CRON_SECRET` não estiver definido, a função responde 500 e nunca abre.

## Agendamento (pg_cron + pg_net, a cada 2h)

Guarde a URL e o segredo no Vault (rodar uma vez, com os valores reais) e agende. Não foi executado.

```sql
select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/psn-ig-sync', 'psn_ig_sync_url');
select vault.create_secret('<mesmo valor de PSN_CRON_SECRET>', 'psn_cron_secret');

select cron.schedule(
  'psn-ig-sync',
  '5 */2 * * *',   -- minuto 5 de cada 2h (UTC)
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'psn_ig_sync_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-psn-cron',   (select decrypted_secret from vault.decrypted_secrets where name = 'psn_cron_secret')
    ),
    body    := '{"tipo":"cron"}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

-- para desligar: select cron.unschedule('psn-ig-sync');
```

Requer as extensões `pg_cron`, `pg_net` e `supabase_vault` habilitadas.

## Rodar manualmente

```bash
curl -sS -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/psn-ig-sync" \
  -H "x-psn-cron: $PSN_CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"tipo":"manual"}'
```

Corpo (opcional): `{ "tipo": "cron" | "manual", "forcar_completo": true|false }`. `forcar_completo` refaz todos os dias da janela da conta,
a varredura completa de mídias e reinicia a passada das mídias antigas.

Resposta: `{ "ok": true, "sync_id": 12, "parcial": false, "contagens": { ... } }`.
Códigos: 200 ok (inclui parcial), 400 corpo inválido, 401 sem/errado `x-psn-cron`, 405 método, 409 coleta em andamento, 500 erro (detalhe em `psn_ig_sync`).

Cada execução fica em `psn_ig_sync` (`rodando` -> `ok`/`erro`) com `detalhe` (contagens por etapa, chamadas feitas, métricas removidas/reativadas, parcial, erro).
Tokens e `access_token=...` são redigidos de qualquer texto gravado.

## Limites

- **Orçamento por execução:** 400 chamadas à Graph (cada tentativa de retry conta) e ~120 s de relógio. Ao estourar, o run encerra
  graciosamente como `ok` com `detalhe.parcial` (motivo, etapa e o que faltou); a próxima execução continua
  (o progresso já foi gravado; a passada das antigas retoma do cursor).
  Se a lista de mídias for interrompida no meio de uma re-varredura completa, `last_full_media_walk` não é atualizado e ela recomeça na próxima.
- **Retry:** códigos 4, 17, 32, 613 com backoff 2s·2^n; falha de rede 1s·2^n; até 4 retries. Erro 190 não tem retry.
- **Lock:** run `rodando` com menos de 20 min -> 409; `rodando` mais antigo é marcado `erro` (órfão). A checagem não é atômica:
  duas chamadas simultâneas no mesmo instante poderiam passar, mas o pg_cron a cada 2h torna isso improvável (e os upserts são idempotentes).
- A Meta limita consultas diárias da conta a ~30 dias; a janela usada é 28.
- Métricas e erros da Graph mudam com frequência: a degradação evita que uma métrica inválida derrube a coleta, mas métricas novas exigem editar `DESEJADAS` em `metricas.ts`.

## Desenvolvimento e testes

Módulos: `index.ts` (servidor), `handler.ts` (auth, lock, log), `coleta.ts` (etapas), `graph.ts` (cliente, retry, orçamento, redação),
`metricas.ts` (degradação), `token.ts` (saúde do token), `datas.ts` (fuso local), `db.ts` (supabase-js).

```bash
cd supabase/functions/psn-ig-sync
deno check *.ts
deno test -A      # offline: fetch e banco são falsos (_fakes.ts)
```
