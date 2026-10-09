# psn-pauta-disparar

O app chama depois de "Produzir/Ajustar". Se há pauta em `aprovada_producao` ou `ajustar`, dispara a produção e registra em
`psn_pauta_disparo`. Deploy com `verify_jwt=true` (o app manda a chave anon em `apikey`/`Authorization`).

## Contrato

`POST https://hvmmkwafzeqbjpusdmin.supabase.co/functions/v1/psn-pauta-disparar` (sem corpo). CORS: `https://planejamento-sem-neura.netlify.app` e `http://localhost[:porta]`.

Resposta 200 `{disparou:true, sessao_url?}` ou `{disparou:false, motivo}` com motivo em
`fila_vazia | debounce | teto_diario | nao_configurado | erro`. (500 `erro_interno` só se o banco falhar.)

Regras: debounce de 2 min após um `disparado`; teto de 20 `disparado` por dia (America/Sao_Paulo); registros `ignorado`/`nao_configurado`
no máximo 1 por minuto (anti-spam). O texto enviado contém só uuids da fila.

## Destinos (secret `PSN_PRODUCAO_MODO`)

- `github` (padrão): `POST /repos/sorellaidigital/mecanismo-car/actions/workflows/producao-pauta.yml/dispatches` com
  `{"ref":"main","inputs":{"ids":"<uuids,separados,por,vírgula>"}}`. Sucesso = 204; `sessao_url` = página do workflow.
- `rotina`: `POST https://api.anthropic.com/v1/claude_code/routines/<TRIG>/fire` com `{"text":"Fila de produção (ids): ..."}`.

## Secrets (Supabase > Edge Functions > Secrets)

| Secret | Quando | Valor |
|---|---|---|
| `PSN_PRODUCAO_MODO` | opcional | `github` (padrão) ou `rotina` |
| `PSN_GITHUB_TOKEN` | modo github | token fine-grained só do repo `mecanismo-car`, permissão Actions: read and write |
| `PSN_ROTINA_PRODUCAO_TOKEN` | modo rotina | a Duda gera na tela da rotina (claude.ai/code/routines > Edit > Add trigger > API > Generate token; aparece uma vez) |
| `PSN_ROTINA_PRODUCAO_TRIG` | modo rotina | id da rotina (`trig_...`) |

Faltando o secret do modo ativo, a função registra `nao_configurado` e responde 200 `{disparou:false, motivo:"nao_configurado"}`.
Nunca coloque tokens no repo. Os secrets `SUPABASE_*` já vêm do runtime.

Testes: `deno test -A` nesta pasta.
