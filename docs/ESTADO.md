# Estado do projeto (atualizado em 09/10/2026)

## Módulos entregues

| Módulo | Situação |
|---|---|
| **Ideias** (referências salvas pelo celular → fila → análise na ficha) | No ar. Pastas de ideias e de Utilidade; marcações Conteúdo, Formato/visual, Gancho/copy e Série. Plugin `insta-ops` v0.2. |
| **Produção** (funil de 7 etapas do curso) | No ar, sem mudanças. |
| **Métricas** (visão geral do Instagram) | No ar desde 08/10/2026, em paralelo com os coletores antigos (camada C6 abaixo). |

## Módulo Métricas: plano em camadas e onde estamos

Plano completo aprovado: arquitetura, camadas e verificação estão nesta seção e no README do coletor.

| Camada | Situação |
|---|---|
| **C1 Banco** `psn_ig_*` | Feita. Migrações `20261008_psn_ig_v1.sql` e `20261008_psn_ig_v1_cron.sql`. |
| **C2 Histórico do VPS** | Feita. Importados 96 snapshots de conta (03/07 a 08/10) e 1.289 métricas diárias (03/06 a 08/10), com contagens e somas mensais iguais à origem. Os posts não foram importados: vieram pela primeira coleta (60 posts, métricas atuais). A série diária de cada post antes de 08/10 ficou só no VPS (backup de 08/10 18:06). |
| **C3 Coletor** | No ar. Edge Function `psn-ig-sync`, pg_cron `5 */4 * * *` UTC. Autenticação pelo segredo `psn_ig_cron` do Vault. Primeira coleta: 35 s, 66 chamadas, sem erro. |
| **C4 Aba Métricas** | No ar. Números conferidos contra o banco. |
| **C5 Rotinas apontando para o Supabase** | **Em andamento (09/10).** Banco pronto e testado (migração `20261009_psn_ig_c5.sql`); PR sorellaidigital/mecanismo-car#7 aberto; faltam o merge, a variável `PSN_ROTINA_SEGREDO` e o `update_trigger` (prompts em `docs/ROTINAS-C5.md`). |
| **C6 Paralelo de 7 dias e desligamento** | **Pendente.** O paralelo começa assim que C5 estiver pronta. |

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
2. **C5 — falta, nesta ordem:**
   - a Duda copia o segredo (SQL editor: `select decrypted_secret from vault.decrypted_secrets where name='psn_ig_rotina'`)
     para a variável `PSN_ROTINA_SEGREDO` do ambiente "Instagram";
   - merge do PR sorellaidigital/mecanismo-car#7;
   - `update_trigger` nas duas rotinas com os prompts de `docs/ROTINAS-C5.md`;
   - disparo manual da Métricas do Dia e conferência da linha em `psn_ig_analise`; a Pauta do Dia é conferida na
     execução seguinte (não disparar à mão: cria pauta real).
3. **C6 — paralelo de 7 dias:**
   - comparar diariamente PSN × VPS × Notion, com critério de diferença ≤ 1%;
   - delegar o relatório ao Haiku;
   - só então, com o ok da Duda: Notion deixa de receber dados, sai o coletor do `mecanismo-car` e decide-se o IG Analytics. Ela ainda vai conferir se usa hub, agentes, CRM ou radar lá. Se não usar, desligar o cron de coleta do VPS e o agendador antigo do Windows, se existir.
4. **Saúde do token:** o `debug_token` respondeu "Invalid OAuth access token signature", ou seja, o par `META_APP_ID`/`META_APP_SECRET` não confere. Conferir os dois no painel do Supabase (Edge Functions → Secrets). Isso não impede a coleta, que segue funcionando com `META_PAGE_TOKEN`.
5. **"Visitas ao perfil"** aparece "—" porque o coletor não pede essa métrica no nível da conta. Testar se a API v25 entrega `profile_views` para a conta e incluir.
6. **Limpeza no Supabase** (o conector travou nesses comandos). Rodar no SQL editor do painel:
   ```sql
   drop function if exists public.psn_ig_importar_tmp(text,text,jsonb);
   drop policy if exists psn_transfer_up on storage.objects;
   drop policy if exists psn_transfer_get on storage.objects;
   drop policy if exists psn_transfer_teste on storage.objects;
   drop policy if exists psn_transfer_del on storage.objects;
   drop policy if exists psn_transfer_sel on storage.objects;
   delete from storage.buckets where id = 'psn-transfer';
   delete from public.psn_ig_analise where data between '1900-01-01' and '1900-01-31';  -- linha de teste da C5
   ```
   A função já está sem permissão para anon. O bucket `psn-transfer` está vazio.
7. **PR do branch `claude/psn-metricas` para `main`:** ainda não aberto.

## Próximos módulos (ideia da Duda: centralizar tudo no PSN)

- Métricas: abas Posts/Reels, Stories e Público (fora da v1).
- Ponte ideias → produção, página de série, banco de ganchos (a partir de `aprendizado.pontos`).
- Login, quando a plataforma estiver completa.
- Partes do IG Analytics, se ela usar: hub/kanban, agentes, radar, relatório semanal, CRM.

## Fontes e acessos úteis

- **Repositórios:**
  - `sorellaidigital/mecanismo-inst` (este);
  - `sorellaidigital/ig-analytics` (VPS, `/opt/ig-analytics`, EasyPanel, `appig.mariafontes.tech`);
  - `sorellaidigital/mecanismo-car` (rotinas Pauta do Dia e Métricas do Dia).
- **Notion:** "Central de Conteúdo @dudafonte.s" → "Métricas IG" (`collection://4ed9f0d3-84b1-4dec-91ec-e840dcffafae`) e "Painel IG".
- **Rede da sessão de nuvem:** precisa liberar os domínios do Supabase, TikTok/tiktokcdn, Netlify (`*.netlify.app`, `api.netlify.com`, `netlify-mcp.netlify.app`).
