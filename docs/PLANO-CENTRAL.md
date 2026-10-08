# PSN como central de conteúdo — avaliação estratégica e plano

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
05:23  Métricas do Dia  → análise + sinal no PSN (como hoje)
05:47  Sugestões do Dia → ≥3 sugestões (tema + proposta) no PSN + push "Hoje: 3 sugestões"   [sem render]
 ↓     Duda no app (Hoje): escolhe 1+ → "Produzir"; demais → Banco de ideias (ou Descartar)
 ↓     Produção da Pauta (rotina) pega as aprovadas → deck editorial → render → PNGs no PSN + push
 ↓     Duda: Aprovar / Ajustar (comentário) → posta → "Postado"
```

**Sugestão** (o que chega de manhã, por item): tema, gancho da capa, estrutura (tutorial, lista, mito×verdade…), 5–7 bullets do que cada slide diz, urgência U01–U10, linha L1–L5, degrau D0–D4, formato (carrossel/Reels), "por quê" (métrica/sinal/radar de 48 h), fontes. Mínimo 3, sem repetir tema/gancho de 30 dias, rodízio de ferramenta.

**Banco de ideias:** sugestões não escolhidas ficam com status `ideia`; ela pode mandar produzir de lá a qualquer dia. A rotina da manhã também lê o banco (pode repropor uma ideia guardada em vez de inventar).

**Gatilho da produção** (decisão técnica): o app não pode disparar a rotina com segurança (sem login, chave pública). Proposta: rotina **"Produção da Pauta"** de hora em hora, seg–sex 07–20 BRT, que consulta o PSN primeiro e encerra em segundos se não houver nada aprovado. Atraso máximo de ~1 h entre o toque e o material. Alternativa mais barata: 3 janelas fixas (08:30, 12:30, 16:30).

**Status da pauta:** `ideia` → `sugerida` → `aprovada_producao` → `em_producao` → `para_revisar` → `ajustar` ↔ `para_revisar` → `aprovado` → `postado`; `descartado` a partir de qualquer um.

## 3. Arquitetura

**Banco** (migração `psn_pauta_v1.sql`):
- `psn_pauta`: `id`, `data`, `slug`, `status` (check acima), `tema`, `gancho`, `estrutura`, `roteiro_resumo jsonb`, `urgencia`, `linha`, `degrau`, `formatos text[]`, `por_que`, `fontes`, `legenda`, `reels`, `deck jsonb`, `slides jsonb` (`[{n, path}]`), `avisos`, `comentario`, `comentario_em`, `revisado_em`, `aprovado_producao_em`, `postado_em`, `refaz_de`, `notion_url`, `origem`, `criado_em`, `atualizado_em`.
- `psn_pauta_dia`: 1 linha por dia (resumo da manhã, métricas usadas e fonte, radar, avisos).
- RLS: anon lê; anon **só atualiza** `status` (transições permitidas por trigger), `comentario`, `comentario_em`, `revisado_em`, `aprovado_producao_em`, `postado_em`. Inserção e conteúdo só pela rotina.
- RPC `psn_pauta_gravar(segredo, payload jsonb)` e `psn_pauta_producao(segredo, id, payload)` `security definer`, mesmo segredo `psn_ig_rotina` / `PSN_ROTINA_SEGREDO` (padrão de `psn_ig_gravar_analise`, `mecanismo-inst/supabase/migrations/20261009_psn_ig_c5.sql`).
- Imagens: bucket `psn-pautas` leitura pública; escrita só pela Edge Function `psn-pauta-upload` (header com segredo, service role), `<pauta_id>/NN.png`.

**Ponte** (`mecanismo-car/pipeline/psn.py`, stdlib, fail-soft, reaproveita `mascarar()`): `pautas --dias 30`, `sugerir <json>`, `fila-producao`, `entregar <json>` (linha + PNGs), `postado --data`.

**App** (`app/index.html`, receita do módulo Métricas: rota em `rota()`/`render()`, estado próprio com `seq`, `db()`, CSS com os tokens existentes): `#/` vira **Hoje**; canais vão para `#/canais`; `#/pauta/<id>` ficha; `#/ideias-pauta` banco de ideias.

**Skills (`mecanismo-car`):** `pauta-do-dia` vira **sugestões** (sem render); skill nova `producao-pauta` (deck **editorial** → `pipeline.carrossel` → conferir → `entregar`); `metricas-do-dia` passo 3 lê `postado` do PSN. Durante o paralelo, a sugestão da manhã também vira página no Notion (sem PNG). Prompts por `update_trigger`; rotina nova por `create_trigger`.

## 4. Entregas (fatias de valor)

| Release | O que a Duda ganha | Conteúdo |
|---|---|---|
| **R0 — base** | nada visível | Tempo 1 do repo (mecanismo-inst → `psn-planejamentosemneura` com histórico); inventário do Notion |
| **R1 — escolher antes de produzir** | alerta de manhã com ≥3 sugestões, escolhe no app, banco de ideias | spec + protótipo "Hoje" (gate dela) → migração → app Hoje/banco → `pauta-do-dia` em modo sugestão → backfill das pautas do Notion |
| **R2 — produção sob demanda** | carrossel só do que ela escolheu, no estilo editorial, revisado no app | bucket + Edge Function → `producao-pauta` + rotina horária → ficha com PNGs, copiar legenda, Aprovar/Ajustar/Postado |
| **R3 — corte** | um lugar só | 5 dias úteis de paralelo → Notion sai da pauta; fim da C6 → sai da métricas; Tempo 2 do repo (mecanismo-car para o repo novo) planejado à parte |

## 5. Time e ondas

| # | Tarefa | Modelo | Por quê | Precisa de | Frente | Entrega |
|---|---|---|---|---|---|---|
| 1 | Tempo 1 do repo + docs (CLAUDE.md, ESTADO) apontando para o repo novo | Sonnet | git com cuidado | — | repo novo | branch com histórico |
| 2 | Inventário do Notion "Pauta do Dia" (linhas, propriedades, corpo, imagens) | Haiku | extração | — | leitura Notion | JSON em scratchpad |
| 3 | Spec "Hoje" + protótipo navegável com dados reais (fluxo de 2 portões) | Opus | UX e padrão dos próximos módulos | 2 | design | `docs/UX-HOJE.md` + protótipo publicado |
| — | **Gate: ok da Duda no protótipo** | | | 3 | | |
| 4 | Migração `psn_pauta_v1` (tabelas, RLS, trigger de transição, RPCs) | Sonnet | spec fechada | gate | `supabase/` | aplicada em passos pequenos, teste `zz-` apagado |
| 5 | `pipeline.psn` (`pautas`, `sugerir`, `postado`) + testes | Sonnet | padrão existente | 4 | `mecanismo-car/pipeline`, `tests` | testes verdes |
| 6 | App: Hoje, ficha, banco de ideias | Sonnet | contra protótipo | 4 | `app/index.html` | módulo novo |
| 7 | Backfill Notion → `psn_pauta` | Sonnet | regra clara | 2, 4 | dados | contagem igual, hash registrado |
| 8 | Skill `pauta-do-dia` em modo sugestão + prompt | Sonnet | regra definida | 5 | `.claude/skills/` | PR mecanismo-car |
| 9 | Revisão R1 (RLS/segredo, fail-soft, UX × protótipo) | Opus | gate | 4–8 | leitura | achados resolvidos |
| 10 | Deploy, merges, `update_trigger`, disparo de teste | orquestrador | ações externas | 9 | produção | R1 no ar |
| 11 | Bucket + Edge Function `psn-pauta-upload` + `fila-producao`/`entregar` | Sonnet | spec fechada | 10 | `supabase/`, `pipeline` | upload testado |
| 12 | Skill `producao-pauta` (editorial) + ficha com PNGs no app | Sonnet | padrão existente | 11 | skills, app | R2 |
| 13 | Revisão R2 + `create_trigger` da Produção + teste ponta a ponta | Opus + orquestrador | gate | 12 | produção | R2 no ar |

**Ondas:** 1 (paralelo): 1, 2 · 2: 3 → gate · 3: 4 · 4 (paralelo): 5, 6, 7 · 5: 8 · 6: 9 · 7: 10 · 8: 11 · 9: 12 · 10: 13 → paralelo de 5 dias úteis → corte.
**Por que em série:** o protótipo depende do inventário e precede qualquer código; app, ponte e backfill dependem do contrato da tabela; R2 só depois de R1 em uso (as primeiras semanas mostram se o portão de escolha funciona).

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Ela não abrir o app de manhã → nada é produzido | push às 05:47 com link direto; Hoje mostra "sem escolha até 10h"; métrica `revisado_em` |
| Rotina horária gastar sessão à toa | primeira ação é `fila-producao`; sai em segundos; ou 3 janelas fixas |
| App sem login muda status/comentário | anon só nas colunas de revisão, transições por trigger; conteúdo e imagens só com segredo |
| Prompt antigo gerando estilo padrão | skill `producao-pauta` usa só o editorial; teste ponta a ponta confere `deck.estilo` |
| Token da Meta vence em 04/01/2027 | aviso já no app; reautorizar antes |
| Mudança na Métricas do Dia durante a C6 | só o passo 3 muda; passos 1–6 do paralelo intactos até 15/10 |

## 7. Verificação

- Migração: `list_tables` + `get_advisors` após cada passo; teste negativo (anon não insere nem muda `tema`; transição inválida recusada); anon muda status/comentário.
- `python -m unittest discover tests` no mecanismo-car; `sugerir`/`entregar` com `zz-teste` (data jan/1900) e limpeza.
- App: Playwright em 390 px e 1280 px — Hoje mostra 3 sugestões, Produzir/Guardar/Descartar gravam; site conferido contra o commit.
- Backfill: contagem e slugs Notion × PSN iguais.
- R1: disparo de teste → ≥3 sugestões no PSN e página no Notion, sem PNG; push com link.
- R2: aprovar uma sugestão `zz-` → Produção pega na próxima janela, deck com `estilo: editorial`, PNGs no bucket, ficha mostra o carrossel.

Nota:
- O repo novo está vazio e sem `main`; trabalho no branch `claude/wizardly-mayer-nxwfe0`. Para abrir PRs, `main` precisa existir: com sua autorização crio `main` a partir do histórico do `mecanismo-inst`.
- `update_trigger` não troca conector: o Notion sai das rotinas recriando-as (perde o histórico de execuções) ou fica anexado sem uso. Decidir no corte.
- A rotina da manhã passa a precisar de `PSN_ROTINA_SEGREDO`; ela já está no ambiente "Instagram", compartilhado.
- Enquanto R2 não entra, a pauta escolhida no app é produzida em sessão interativa (`/briefing`) a partir da sugestão.
- `psn_criadores`/`psn_ideias` não têm DDL versionado; ficam para o Tempo 2.
- "Pauta aprovada → cartão na Produção (funil de 7 etapas)" fica fora, como você decidiu.
