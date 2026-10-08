# psn-planejamentosemneura — contexto para novas sessões

Repositório central do PSN (desde 08/10/2026). Recebeu o `sorellaidigital/mecanismo-inst` com o histórico inteiro
(Tempo 1); o `sorellaidigital/mecanismo-car` (motor do carrossel, skills e rotinas) entra no Tempo 2. Plano em
`docs/PLANO-CENTRAL.md`.

Objetivo: centralizar todo o trabalho de conteúdo da Duda (@dudafonte.s) no app **Planejamento sem Neura (PSN)**,
em camadas, descontinuando os mecanismos espalhados (IG Analytics no VPS, rotinas que gravam no Notion).

Antes de mexer em qualquer coisa, leia `docs/ESTADO.md` e `docs/PLANO-CENTRAL.md` (o que já foi feito, o que falta, decisões).

## Peças

| Peça | Onde |
|---|---|
| App PSN | `app/index.html` (arquivo único, sem build) → Netlify site `planejamento-sem-neura` (id `a67192c7-69f4-4be3-a5b4-853f32c9fb07`) |
| Banco | Supabase `financeiro.sorellai` (`hvmmkwafzeqbjpusdmin`), tabelas `psn_*`. Migrações em `supabase/migrations/` |
| Coletor de métricas | Edge Function `supabase/functions/psn-ig-sync` (README lá), pg_cron a cada 4h |
| Mecanismo de referências | plugin `plugins/insta-ops` (`/insta-ops:fila`, `/insta-ops:ref-ig`) |
| Atalho do iPhone | `app/ATALHO-IPHONE.md` |

## Regras de trabalho

- Preferências da usuária: português, sem preâmbulo nem recapitulação, completo em vez de curto, exceções em "Nota:" no fim.
- Planejar antes de executar quando ela pedir; delegar por capacidade (Haiku mecânico, Sonnet execução, Opus revisão).
- Branch novo a partir de `main` para cada rodada, PR para `main`. Nunca commitar segredos.
- App sem login por decisão dela (até a plataforma estar completa). Tabelas `psn_ig_*`: anon só lê; escrita só service role.
- Antes de alterar dados reais: registrar hash/contagem e conferir depois. Testes com canais `zz-` apagados no fim.
- Deploy do app: conector Netlify `deploy-site` gera um comando; rodar numa pasta só com `index.html`, com
  `NODE_USE_ENV_PROXY=1` (o fetch do Node não usa o proxy da sessão sem isso). Conferir o site no ar contra o commit.
- O conector do Supabase às vezes trava (timeout) em DDL; criar tabelas funciona, `alter`/`drop policy` às vezes não.
  Aplicar em comandos pequenos e conferir o estado depois de cada timeout.
