# Estado do projeto (atualizado em 09/10/2026)

## Módulos entregues

| Módulo | Situação |
|---|---|
| **Ideias** (referências salvas pelo celular → fila → análise na ficha) | No ar. Pastas de ideias e de Utilidade; marcações Conteúdo, Formato/visual, Gancho/copy e Série. Plugin `insta-ops` v0.2. |
| **Produção** (funil de 7 etapas do curso) | No ar, sem mudanças. |
| **Métricas** (visão geral do Instagram) | No ar desde 08/10/2026, em paralelo com os coletores antigos (camada C6 abaixo). |

## Módulo Pauta (Notion → PSN): em planejamento desde 08/10/2026

Plano aprovado em `docs/PLANO-CENTRAL.md`: tela "Hoje" como entrada do app, Pauta do Dia em 2 portões (de manhã ≥3
sugestões sem render; a Duda escolhe no app; só o escolhido é produzido, no estilo editorial), banco de ideias,
paralelo de 5 dias úteis com o Notion antes do corte.

| Release | Situação |
|---|---|
| R0 base (repo central + inventário do Notion) | Feita em 08/10: histórico do `mecanismo-inst` neste repo, `main` criada; inventário de 19 linhas do Notion |
| R1 escolher antes de produzir | **No ar desde 08/10 (noite).** Migrações `20261010_psn_pauta_v1.sql` + `20261011_psn_pauta_v1_1.sql`; app com Hoje/Calendário/Banco/Lixeira/ficha (PR #1, deploy conferido); backfill de 11 ideias + 4 pautas antigas do Notion; rotina "Pauta do Dia" em modo sugestões todo dia 05:47 (PR sorellaidigital/mecanismo-car#8). Disparo de teste 08/10 21h: 3 Reels novos + 3 estáticos repropostos do banco, `rotina_status=parcial` (radar só achou fonte para o Copilot) |
| R2 produção sob demanda | Pendente: bucket `psn-pautas` + upload de PNGs no `pipeline.psn`, rotina "Produção da Pauta" (texto em `mecanismo-car/docs/ROTINAS-PAUTA.md`). Até lá, o que for para "Produzir" fica na fila |
| R3 corte do Notion + Tempo 2 do repo | Depois do paralelo e do fim da C6 |

## Módulo Métricas: plano em camadas e onde estamos

Plano completo aprovado: arquitetura, camadas e verificação estão nesta seção e no README do coletor.

| Camada | Situação |
|---|---|
| **C1 Banco** `psn_ig_*` | Feita. Migrações `20261008_psn_ig_v1.sql` e `20261008_psn_ig_v1_cron.sql`. |
| **C2 Histórico do VPS** | Feita. Importados 96 snapshots de conta (03/07 a 08/10) e 1.289 métricas diárias (03/06 a 08/10), com contagens e somas mensais iguais à origem. Os posts não foram importados: vieram pela primeira coleta (60 posts, métricas atuais). A série diária de cada post antes de 08/10 ficou só no VPS (backup de 08/10 18:06). |
| **C3 Coletor** | No ar. Edge Function `psn-ig-sync`, pg_cron `5 */4 * * *` UTC. Autenticação pelo segredo `psn_ig_cron` do Vault. Primeira coleta: 35 s, 66 chamadas, sem erro. |
| **C4 Aba Métricas** | No ar. Números conferidos contra o banco. |
| **C5 Rotinas apontando para o Supabase** | **Feita em 08/10.** Migração `20261009_psn_ig_c5.sql`, PR sorellaidigital/mecanismo-car#7 (merge feito), variável `PSN_ROTINA_SEGREDO` no ambiente "Instagram", prompts trocados por `update_trigger` (texto em `docs/ROTINAS-C5.md`). Disparo de teste da Métricas do Dia às 19:46 UTC gravou a linha de 08/10 em `psn_ig_analise` com os números do resumo. A Pauta do Dia é conferida na execução de 09/10 (05:47). |
| **C6 Paralelo de 7 dias e desligamento** | **Em andamento.** Começa com as execuções de 09/10; previsão de fim em 15/10, depois o ok da Duda. |

### Pendências do módulo Métricas

1. **C5 — decidido em 09/10:**
   - Gravação pela opção A: RPC `psn_ig_gravar_analise(segredo, …)` `security definer`, confere o segredo
     `psn_ig_rotina` do Vault, 1 linha por dia (atualiza se repetir), só datas da última semana (ou jan/1900 para
     teste). Sem conector Supabase nas rotinas (ele daria `execute_sql` em todos os projetos a uma rotina que lê
     texto de terceiros). `update_trigger` não troca conector; esta opção não precisa.
   - Leitura: RPC `psn_ig_resumo_dia(p_data)` (anon executa, `security invoker`) com seguidores e ganhos, conta do
     **último dia completo** (D-1), 10 posts, melhor post, médias por formato, última coleta e avisos.
   - No `mecanismo-car`: `pipeline/psn.py` (`resumo`, `analise`, `gravar`), skills `metricas-do-dia` e
     `pauta-do-dia` atualizadas, PR sorellaidigital/mecanismo-car#7.
   - Paralelo: a Métricas do Dia mantém o `pipeline.metricas` → Notion (fonte independente para a comparação) e
     grava no Notion o mesmo texto de análise que vai ao PSN.
2. **C5 — conferir:** a execução da Pauta do Dia de 09/10 (05:47) deve dizer "fonte: PSN" nas métricas da página.
3. **C6 — paralelo de 7 dias:**
   - começa em 09/10; comparar diariamente PSN × VPS × Notion, com critério de diferença ≤ 1%;
   - atenção: o resumo do PSN usa a conta do último dia completo (D-1). O `pipeline.metricas` pede os insights da
     conta sem `since/until`, e nesse caso a API devolve uma janela de ~2 dias terminando agora (testado em 08/10
     com `profile_views`: 38 sem datas × 21 só em 07/10). Comparar Notion × PSN somando os mesmos dias, não linha a linha;
   - delegar o relatório ao Haiku;
   - só então, com o ok da Duda: Notion deixa de receber dados, sai o coletor do `mecanismo-car` e decide-se o IG Analytics. Ela ainda vai conferir se usa hub, agentes, CRM ou radar lá. Se não usar, desligar o cron de coleta do VPS e o agendador antigo do Windows, se existir.
4. **Saúde do token:** resolvida em 08/10 (secrets `META_APP_ID`/`META_APP_SECRET` regravados). `debug_token` válido: token de página sem vencimento, escopos de insights ok. **O acesso a dados vence em 04/01/2027**: antes disso a Duda precisa reautorizar o app da Meta (o app PSN avisa quando estiver perto).
5. **"Visitas ao perfil":** resolvida em 08/10. A v25 entrega `profile_views` da conta por dia (só com `metric_type=total_value`). Coletor v4 (Edge Function `psn-ig-sync`, versão 4) pede a métrica; histórico de 03/06 a 06/10 preenchido direto da API (126 dias, soma 2.822); 07/10 e 08/10 vieram pela coleta. Card do app passou a somar `profile_views` (28 dias até 07/10 = 370, ▼ 2,9% contra 381), site no ar conferido. `psn_ig_resumo_dia` já inclui a métrica em `conta_dia_anterior`.
6. **Limpeza no Supabase:** feita em 08/10 pela Duda no SQL editor (função `psn_ig_importar_tmp`, 5 políticas `psn_transfer_*` e a linha de teste de 1900 em `psn_ig_analise` removidas; conferido). O bucket `psn-transfer` ficou: o Supabase não deixa apagá-lo por SQL e a tela não apagou. Está vazio, privado e sem políticas (ninguém além do service role acessa); decisão: deixar e não usar.
7. **PR do branch `claude/psn-metricas` para `main`:** feito (sorellaidigital/mecanismo-inst#2, merge em 08/10).

## Próximos módulos (ideia da Duda: centralizar tudo no PSN)

- Métricas: abas Posts/Reels, Stories e Público (fora da v1). **Fonte decidida: o `psn-ig-sync` estendido**, não MCP
  (avaliação em `docs/AVALIACAO-MCP-META.md`, PR #6). Plano para quando o C6 terminar:
  - migração `psn_ig_story` (+ insights por coleta) e `psn_ig_publico` (data, tipo, breakdown, chave, valor), mesmas
    políticas das `psn_ig_*`;
  - coletor: stories ativos a cada execução (os insights só existem enquanto o story está no ar, 24h; por isso
    coleta agendada, não consulta avulsa) e `follower_demographics`/`engaged_audience_demographics` 1x por dia
    (`profile_views` já entrou no coletor v4, pendência 5);
  - antes, conferir numa execução manual se a v25 aceita esses nomes de métrica;
  - abas Stories e Público no app.
- Ponte ideias → produção, página de série, banco de ganchos (a partir de `aprendizado.pontos`).
- Login, quando a plataforma estiver completa.
- Partes do IG Analytics, se ela usar: hub/kanban, agentes, radar, relatório semanal, CRM.

## MCP da Meta (avaliado em 08/10/2026)

- A Meta não tem MCP oficial de Instagram orgânico. A página oficial (`developers.facebook.com/documentation/mcp`)
  lista só Ads MCP (`mcp.facebook.com/ads`, beta), Social Technologies MCP (`/devtools`, gestão do app, não lê dados)
  e WhatsApp Business Tools MCP. Detalhes, fontes e riscos em `docs/AVALIACAO-MCP-META.md`.
- Decisões:
  - orgânico (conta, posts, stories, público): não usar MCP; tudo pelo coletor;
  - Ads MCP só se a Duda anunciar ou impulsionar, em sessão interativa, com regra de leitura apenas
    (Business Settings → Integrations → Ads MCP Server); **nunca em rotina** (a Pauta do Dia lê texto de terceiros e
    a própria Meta manda não dar escopo de escrita a agente que processa conteúdo não confiável);
  - anúncios dentro do PSN, se ela quiser: Marketing API no coletor (`ads_read`), não MCP;
  - opcional: Social Technologies MCP com escopo Read, em sessão interativa, para acompanhar depreciações da Graph API;
  - reavaliar se a Meta lançar MCP de Instagram orgânico.
- Nenhum conector da Meta está instalado na conta; os endpoints respondem 401 sem login.

## Fontes e acessos úteis

- **Repositórios:**
  - `sorellaidigital/psn-planejamentosemneura` (este, central desde 08/10/2026);
  - `sorellaidigital/mecanismo-inst` (origem deste repo, histórico trazido inteiro; arquivar depois do Tempo 1);
  - `sorellaidigital/ig-analytics` (VPS, `/opt/ig-analytics`, EasyPanel, `appig.mariafontes.tech`);
  - `sorellaidigital/mecanismo-car` (rotinas Pauta do Dia e Métricas do Dia).
- **Notion:** "Central de Conteúdo @dudafonte.s" → "Métricas IG" (`collection://4ed9f0d3-84b1-4dec-91ec-e840dcffafae`) e "Painel IG".
- **Rede da sessão de nuvem:** precisa liberar os domínios do Supabase, TikTok/tiktokcdn, Netlify (`*.netlify.app`, `api.netlify.com`, `netlify-mcp.netlify.app`).
