# Prompts das rotinas na C5 (aplicar com `update_trigger`, depois do merge de sorellaidigital/mecanismo-car#7)

As rotinas partem do `main` do `mecanismo-car`: trocar o prompt antes do merge faz a rotina chamar
`pipeline.psn`, que ainda não existe lá. Antes de aplicar, a variável `PSN_ROTINA_SEGREDO` precisa estar
no ambiente "Instagram" (sem ela a Métricas do Dia segue, mas não grava no PSN e registra o aviso).

## Métricas do Dia (IG) — `trig_016mGKwhD8152HRpcEdPxaG1`

```
Rotina diária Métricas do Dia do Instagram da Duda (@dudafonte.s), repo sorellaidigital/mecanismo-car (branch main).

Leia CLAUDE.md e rode a skill metricas-do-dia (.claude/skills/metricas-do-dia/SKILL.md) para HOJE (data em America/Sao_Paulo), seguindo o fluxo inteiro (paralelo de 7 dias PSN × Notion):
1. `python -m pipeline.metricas --data <hoje> --stdout` (fail-soft): números do Notion.
2. `python -m pipeline.psn resumo --data <hoje>` (fail-soft): números prontos do PSN (seguidores e ganhos, conta do último dia completo, 10 posts, melhor post, médias por formato). Não recalcule.
3. Se a pauta de ontem estiver "Postado" no banco "Pauta do Dia", compare o post dela com a média do formato.
4. Análise de 3 a 5 frases com números do PSN + 1 frase de "Sinal para a pauta" usando os IDs do marca/publico/PUBLICO.md.
5. Grave historico/psn/<hoje>.json e rode `python -m pipeline.psn gravar historico/psn/<hoje>.json` (1 linha por dia em psn_ig_analise).
6. 1 linha nova em "Métricas IG" no Notion (uma por dia; se já existir a de hoje, não duplique): números do passo 1, melhor post do PSN, a mesma Análise e o mesmo Sinal, Avisos; tabela dos 10 posts no corpo.
7. Commit de historico/metricas/ e historico/psn/ e push no branch desta sessão.

Nunca publicar nada, nunca editar nem apagar páginas existentes no Notion (inclusive "Painel IG"), nunca imprimir nem gravar IG_PAGE_TOKEN nem PSN_ROTINA_SEGREDO. No PSN, só pelo pipeline.psn. Número só do JSON (PSN ou API): o que não veio fica vazio.
```

## Pauta do Dia (seg–sex) — `trig_015cmjNHWqBMcgoFP2EXLwDK`

Igual ao prompt atual, trocando o passo 1 por:

```
1. Coleta: métricas pelo PSN — `python -m pipeline.psn analise` (Análise e Sinal para a pauta de hoje, gravados pela rotina Métricas do Dia às 05:23) e `python -m pipeline.psn resumo` (números); sem linha de hoje no PSN, use a linha de hoje do banco "Métricas IG" e diga na página de onde veio; não rode pipeline.metricas, não grave no PSN nem crie linha de métricas; feedback, comentários e histórico dos últimos 30 dias pelo banco "Pauta do Dia"; radar de notícias de IA das últimas 48 h relevantes para o público do marca/publico/PUBLICO.md.
```

e a regra final por: `Nunca imprimir nem gravar IG_PAGE_TOKEN nem PSN_ROTINA_SEGREDO.`

## Depois do paralelo (C6, com o ok da Duda)

Métricas do Dia: tirar os passos 1 e 6 (pipeline.metricas e Notion) e o conector Notion só se o passo 3
deixar de precisar dele (ele lê o banco "Pauta do Dia"); skill `metricas-do-dia` sem a seção do paralelo.
