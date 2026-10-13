# psn-planejamentosemneura

Repositório central do **Planejamento sem Neura (PSN)**, o app de conteúdo da Duda (@dudafonte.s): Hoje (sugestões, produção e revisão), Calendário, Banco de ideias, Métricas do Instagram, Ideias/Produção e Canais.

- App: https://planejamento-sem-neura.netlify.app (código em `app/index.html`, arquivo único sem build).
- Banco e funções: `supabase/` (migrações e Edge Functions `psn-ig-sync`, `psn-pauta-upload`, `psn-pauta-disparar`).
- Plugin de referências: `plugins/insta-ops`. Atalho do iPhone: `app/ATALHO-IPHONE.md`.
- O motor do carrossel, as skills e o workflow de produção estão em outro repo, `sorellaidigital/mecanismo-car`, que entra aqui no Tempo 2.

## Ordem de leitura

1. [`CLAUDE.md`](CLAUDE.md) — regras de trabalho, mapa das peças, secrets (só nomes), deploy, armadilhas.
2. [`docs/CONTINUAR.md`](docs/CONTINUAR.md) — estado em 13/10/2026, o que está parado, próximos passos, prompt para o chat novo.
3. [`docs/ESTADO.md`](docs/ESTADO.md) — módulos entregues e pendências.
4. [`docs/DECISOES.md`](docs/DECISOES.md) — decisões da Duda, datadas.
5. [`docs/UX-HOJE.md`](docs/UX-HOJE.md) — spec das telas.
6. [`docs/MAPA-PSN.html`](docs/MAPA-PSN.html) — mapa visual (abrir no navegador).

Também: [`docs/PLANO-CENTRAL.md`](docs/PLANO-CENTRAL.md) (visão e releases), [`docs/AVALIACAO-MCP-META.md`](docs/AVALIACAO-MCP-META.md), [`docs/ROTINAS-C5.md`](docs/ROTINAS-C5.md).
