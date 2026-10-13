# PSN como central de conteúdo — visão e plano (atualizado em 13/10/2026)

O que está feito, parado e aberto: `docs/CONTINUAR.md`. Decisões datadas: `docs/DECISOES.md`. Spec das telas: `docs/UX-HOJE.md`.

## 1. Cenário (visão de produto)

**Problema real.** O trabalho de conteúdo da Duda está espalhado em 3 repos, Notion, VPS e rotinas. O que ainda passa pelo Notion:

| Fluxo no Notion | Situação |
|---|---|
| **Pauta do Dia**: 1 carrossel já renderizado + legenda + Reels por dia; até 3 "Ideia"; aprovação por Status e Comentário; memória de 30 dias | **Migrar e redesenhar (este plano)** |
| **Métricas IG + Painel IG** | Já substituído pela aba Métricas; sai no fim da C6 (15/10, ok da Duda). Sem trabalho novo |
| `@menção` como alerta no celular | Vira o push da rotina com link do app |

**Desperdício identificado.**
1. A rotina produz o carrossel inteiro **antes** de a Duda escolher o tema: render, recorte, 3 voltas de QA e upload todo dia, para um material que muitas vezes não é postado.
2. A rotina gera no estilo antigo: o prompt atual manda "capa-foto com logos" e a referência `entrada/desinfluenciando-ia.deck.json` (estilo padrão), enquanto o padrão aprovado em 08/10 é o **editorial** (`entrada/ia-concorda-editorial.deck.json`).
3. Cada disparo grava num branch que nunca entra no `main`: `historico/pautas.jsonl`, os decks e os PNGs se perdem (PNGs só existem no Notion).

**Norte do produto.** O PSN só vale se for aberto todo dia. Métrica-guia: **pautas postadas por semana**. Apoio: % de dias com revisão feita até 10h (`revisado_em`), % de sugestões aprovadas, carrosséis produzidos × postados (meta: perto de 1:1).

**Princípios de interface (para este e os próximos módulos migrados).**
- Uma tela de entrada, **"Hoje"**: só o que pede ação dela agora, em ordem. Módulos são destinos a partir do Hoje.
- Ação em 1 toque (Produzir · Guardar · Descartar; Aprovar · Ajustar · Postado). Texto só quando precisa (comentário no Ajustar).
- Celular primeiro (ela já captura pelo Atalho do iPhone).
- Nada que a rotina já sabe é perguntado de novo.
- Todo módulo novo passa por spec + protótipo aprovado antes de código.

## 2. Fluxo novo da Pauta (2 portões)

```
05:23  Métricas do Dia  → análise + sinal no PSN
05:47  Pauta do Dia     → 3 sugestões de estático + 3 de Reels no PSN + push   [sem render]
 ↓     Duda no app (Hoje): Produzir · Banco · Lixeira
 ↓     Produção (GitHub Actions, disparada pelo app) → deck editorial → render → PNGs no PSN → status para_revisar
 ↓     Duda: Aprovar / Ajustar (comentário) → posta → "Postado"
```

**Sugestão** (o que chega de manhã, por item): tema, gancho da capa, estrutura (tutorial, lista, mito×verdade…), 5–7 bullets do que cada slide diz, urgência U01–U10, linha L1–L5, degrau D0–D4, formato (estático/Reels), "por quê" (métrica/sinal/radar de 48 h), fontes. 3 de estático + 3 de Reels por dia, sem repetir tema/gancho de 30 dias, rodízio de ferramenta.

**Banco de ideias:** sugestões não escolhidas ficam com status `ideia`; ela pode mandar produzir de lá a qualquer dia. A rotina da manhã também lê o banco (pode repropor uma ideia guardada em vez de inventar).

**Gatilho da produção** (decisão de 09/10, substitui a rotina horária 07–20h proposta na R1): o app não dispara a produção direto (sem login, chave pública). Depois de Produzir/Ajustar chama a Edge Function `psn-pauta-disparar`, que lê a fila no banco, aplica debounce (2 min) e teto (10 disparos/dia) e faz `workflow_dispatch` no GitHub Actions; o atraso esperado é de ~10 min. O cron do workflow (08:30, 13:30 e 18:30 BRT) é só reserva. A produção roda em 3 jobs (fila, produzir, entregar) para o Claude não ver o segredo do PSN; tetos de 3 itens por execução e 6 execuções com produção por dia.

**Status da pauta:** `ideia` → `sugerida` → `aprovada_producao` → `em_producao` → `para_revisar` → `ajustar` ↔ `para_revisar` → `aprovado` → `postado`; `descartado` a partir de qualquer um.

## 3. Releases

| Release | Situação | Resumo |
|---|---|---|
| **R0 base** | Feita em 08/10 | Tempo 1 do repo (histórico do `mecanismo-inst` aqui, `main` criada); inventário de 19 linhas do Notion |
| **R1 escolher antes de produzir** | Feita em 08/10 (PR #1; mecanismo-car#8) | Migrações `psn_pauta_v1` e `v1_1`; app Hoje/Calendário/Banco/Lixeira/ficha; backfill de 11 ideias + 4 pautas; rotina Pauta do Dia em modo sugestões |
| **R2 produção sob demanda** | Feita em 09/10 (PR #2; mecanismo-car#9). **No ar, aguardando secrets: produção parada em 13/10** | Bucket `psn-pautas`, Edge `psn-pauta-upload` e `psn-pauta-disparar`, workflow `producao-pauta.yml`, skill `producao-pauta`, ficha com slides |
| **R3 corte do Notion** | Aberta | 5 dias úteis de paralelo da pauta (09 a 16/10; 12/10 é feriado) e fim da C6 (previsto 15/10), cada um com ok da Duda; depois recriar as rotinas sem o conector Notion e desligar o VPS |
| **Tempo 2** | Aberto | Trazer o `mecanismo-car` para o central; esboço em `docs/CONTINUAR.md` seção 5 |

Feito fora do plano original: módulo Métricas completo (C1–C5, `psn-ig-sync`), ver `docs/ESTADO.md`.

## 4. Riscos (vigentes)

| Risco | Mitigação |
|---|---|
| Ela não abrir o app de manhã → nada é produzido | Push às 05:47 com link; "Hoje" mostra a falta; push das 10h decidido, não implementado; `visto_em` mede (vazio em 12 e 13/10) |
| Workflow "verde" sem produzir quando falta secret | Passo 2 de `docs/CONTINUAR.md`: job `fila` falhar visível |
| Custo da produção | Chave de workspace com limite de gasto; tetos 3 × 6; medir na 1ª semana |
| App sem login muda status/comentário | Anon só nas colunas de revisão, transições por trigger; conteúdo e imagens só com segredo; texto de pauta é dado para o Claude |
| Token da Meta vence em 04/01/2027 | Aviso no app; reautorizar antes |

## 5. Verificação padrão

- Migração: `list_tables` + `get_advisors` após cada passo; teste negativo (anon não insere nem muda `tema`; transição inválida recusada).
- Dados de teste com `zz-`, apagados no fim pela Duda (o conector trava em `DELETE`).
- App: site no ar conferido contra o commit; Playwright em 390 px e 1280 px quando houver mudança de tela.
- Testes do motor: `python -m unittest discover tests` no `mecanismo-car`.

Nota:
- As seções de arquitetura (tabelas, RPCs, Edge Functions, ponte) e a tabela de time/ondas da R1 saíram deste documento: a arquitetura vigente está em `CLAUDE.md` (Mapa das peças) e nas migrações.
