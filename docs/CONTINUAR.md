# Continuar daqui (passagem em 14/10/2026)

Roteiro para um chat novo, aberto só neste repo, retomar sem perder nada. Complementos: `docs/ESTADO.md` (histórico por módulo),
`docs/DECISOES.md` (decisões da Duda), `docs/UX-HOJE.md` (spec das telas), `docs/MAPA-PSN.html` (mapa).
Os arquivos de carrossel, skills, rotinas e workflow citados abaixo moram no repo `sorellaidigital/mecanismo-car`, que precisa ser
anexado (ferramenta `add_repo`, `owner=sorellaidigital`, `repo=mecanismo-car`; depois clonar). Ver `CLAUDE.md`.

## 1. Estado em 13/10/2026

- **Repo central:** `main` tem R0, R1 (PR #1, merge 08/10) e R2 (PR #2, merge 09/10). A documentação desta passagem (mapa, ESTADO, CONTINUAR, DECISOES, README) entrou na `main` pelo PR #3 em 13/10.
- **App no ar:** deploy de 09/10 = `main` d5b0dcb (conferido; só difere pelo comentário que o Netlify injeta). Hoje, Calendário, Banco, Lixeira,
  ficha, Métricas e Canais funcionam. Ações gravam depois de 5 s (Desfazer); Produzir/Ajustar chamam `psn-pauta-disparar` (debounce local de 3 s).
- **Pauta do Dia:** a rotina roda todo dia às 05:47 e hoje há 6 pautas `sugerida`. `rotina_status` sai sempre `parcial` porque o radar de
  notícias acha pouca fonte. `visto_em` está vazio em 12 e 13/10: a Duda não abriu o app nesses dias.
- **Métricas do Dia:** roda todo dia às 05:23. As duas rotinas tiveram a última execução (13/10) como SUCCEEDED.
- **Coletor `psn-ig-sync`:** a cada 4 h, sem incidente conhecido. Camada C6 (paralelo de 7 dias PSN × VPS × Notion) em andamento, fim previsto 15/10.
- **Dados no banco:** 18 ideias, 4 `para_revisar` antigas vindas do Notion (grupo recolhido no Banco), 1 descartada (`zz-teste-r2`).
  Pauta Gemini real `e831a498-391b-4e29-ac66-194d3aa987c1`: 11 slides no bucket, status `ajustar` (comentário da Duda pedindo cenas sobre o assunto;
  já respondido com os prompts cena-34..37 em `mecanismo-car/assets/fotos/PROMPTS-NOVAS-CENAS.md`).
- **Paralelo com o Notion:** a pauta começou em 09/10 (5 dias úteis: termina em 16/10, porque 12/10 é feriado); as métricas seguem até o fim da C6.
- **Home do app (14/10):** a home voltou a ser Canais (captura de ideias); o Hoje virou `#/hoje` (PR #4, deploy 14/10 = `main` 8713649, conferido: só as 3 linhas do Netlify diferem). O prompt da rotina Pauta do Dia já aponta para `#/hoje`.
- **Diagnóstico da Pauta (14/10):** a Pauta não lê `psn_ideias` (49 ideias salvas pelo raio). Só 1 de 8 posts desde 05/10 bateu com uma sugestão. Reels alcançaram 2,6 mil a 74 mil e carrosséis 380 a 520.
- **Em andamento (14/10):** catálogo de modelos (templates) extraído do banco de ideias, no mecanismo-car `modelos/`, para teste no perfil antes de mudar a Pauta.

## 2. O que está parado e por quê

**A produção (Portão 2) não funciona.** O workflow `producao-pauta.yml` rodou 10 vezes agendadas desde 09/10; todas terminaram "success" em ~15 s
sem produzir, porque `PSN_ROTINA_SEGREDO` está vazio no GitHub (o log diz "não iniciado (Variável PSN_ROTINA_SEGREDO ausente...)").
Além disso `psn_pauta_disparo` só tem registros `nao_configurado`: falta `PSN_GITHUB_TOKEN` no Supabase, então o toque em Produzir no app não dispara nada.
Também falta a chave da Anthropic (`ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN`).
A fila está parada com **4 itens: 3 `aprovada_producao` e 1 `ajustar` (o Gemini)**. Ninguém perde dado: o que ela aprovou espera.
Só a Duda cadastra secrets; o Claude não deve pedir nem receber os valores.

## 3. Próximos passos (em ordem)

Quem age: **D** = Duda, **C** = Claude.

0. **Catálogo de modelos → aprovação da Duda → teste de 2 semanas (1 Reels + 1 carrossel por dia) → Pauta v2** (lê `psn_ideias` com um comando `pipeline.psn ideias` e `psn_ig_*`; 1 + 1 por dia; cada sugestão = modelo aprovado + tema de ideia salva ou notícia com fonte; `estrutura` = id do modelo; atualizar o prompt da rotina com `update_trigger`).

1. **Ligar a produção** (D cadastra, C acompanha).
   - *O que fazer:* D cria `ANTHROPIC_API_KEY` (de um workspace dedicado com limite de gasto no Console) e `PSN_ROTINA_SEGREDO` (mesmo valor do ambiente "Instagram") — para conferir sem expor o valor: se a 1ª execução iniciar os itens, bate; se aparecer "segredo inválido" (erro 42501), o valor está diferente em
     GitHub `mecanismo-car` > Settings > Secrets and variables > Actions; e `PSN_GITHUB_TOKEN` (fine-grained, só `mecanismo-car`, Actions read/write) em
     Supabase > Edge Functions > Secrets. Depois rodar o workflow à mão (Actions > Produção da Pauta > Run workflow) e passar o checklist abaixo.
   - *Onde:* `mecanismo-car/.github/workflows/producao-pauta.yml`, `mecanismo-car/docs/ROTINAS-PAUTA.md`, `mecanismo-car/pipeline/producao.py` (`TETO_RODADAS_DIA`, `MAX_POR_RODADA`).
   - *Como conferir:* checklist da 1ª execução; itens da fila saem de `aprovada_producao` para `para_revisar`; app mostra os slides; `psn_pauta_disparo` passa a ter `disparado`.
     Medir o custo real por carrossel (estimativa US$ 1–3 com Sonnet 5.5; pior caso ~18 produções/dia) e recalibrar os dois tetos.
2. **Fazer o workflow falhar visível sem secret** (C).
   - *O que fazer:* o job `fila` deve terminar vermelho quando faltar `PSN_ROTINA_SEGREDO` (hoje `preparar` junta o aviso "não iniciado (...ausente...)" em `avisos`, grava `n=0` e sai 0, então `produzir` é pulado e tudo fica verde).
   - *Onde:* `mecanismo-car/pipeline/producao.py` (`preparar`/`main`: sair com código 1 quando houver fila e nenhum item iniciado por falta de segredo) e o passo "Fila e iniciar" do workflow. PR no mecanismo-car.
   - *Como conferir:* rodar o workflow sem o secret (ou com `ids` falso) e ver o job vermelho; com o secret, verde.
3. **Tempo 2: trazer o mecanismo-car para o central** (C; planejar antes com a Duda). Esboço na seção 5.
4. **Horários do público e "postado" automático** (C, no `psn-ig-sync`).
   - *O que fazer:* preencher `psn_ig_horarios` (`online_followers` se a v25 entregar; senão histórico próprio de engajamento por hora); o coletor casar post novo com pauta `aprovado`
     e marcar `postado` (`postado_origem`); comando de leitura em `pipeline.psn` para a pauta sugerir `horario_sugerido`.
   - *Onde:* `supabase/functions/psn-ig-sync`, migração nova, `mecanismo-car/pipeline/psn.py`, spec em `docs/UX-HOJE.md` seções 5.2 e 6.3.
   - *Como conferir:* testar numa execução manual se a v25 aceita a métrica; `psn_ig_horarios` com linhas; um post real marcando a pauta como postada; Calendário mostrando os melhores horários.
5. **Push das 10h se nada escolhido** (C; decidido em 08/10, não implementado). Um por dia, todos os dias, só se nenhuma sugestão do dia foi escolhida.
   - *Onde:* texto em `docs/UX-HOJE.md` seção 8.4; implementar na rotina/Edge Function que dispara o push (definir no plano).
   - *Como conferir:* dia sem escolha recebe um push às 10:00; dia com escolha não recebe.
6. **Corte do Notion** (D dá o ok, C executa).
   - *Pauta:* depois de 5 dias úteis de paralelo (09, 13, 14, 15 e 16/10; 12/10 é feriado → termina em 16/10), com ok dela. *Métricas:* no fim da C6 (previsto 15/10), com ok dela.
   - *O que fazer:* parar de gravar no Notion; tirar a seção do paralelo da skill `pauta-do-dia` e os passos 1 e 6 da `metricas-do-dia`; recriar as rotinas sem o conector Notion
     (`update_trigger` não troca conector; perde o histórico de execuções); desligar o cron do coletor do VPS e arquivar `ig-analytics`, se ela não usar hub/agentes/CRM/radar lá.
   - *Como conferir:* rotinas seguem verdes sem Notion; comparação PSN × VPS × Notion ≤ 1% registrada antes do corte (somando os mesmos dias; o PSN usa a conta do último dia completo, D-1).
7. **Abas Stories e Público no Métricas** (C). Plano em `docs/ESTADO.md` (Próximos módulos) e `docs/AVALIACAO-MCP-META.md`: migração `psn_ig_story` e `psn_ig_publico`, coletor estendido
   (stories a cada execução; `follower_demographics`/`engaged_audience_demographics` 1x por dia), conferir antes se a v25 aceita os nomes de métrica. *Conferir:* contagens no banco e abas no app.
8. **Upload de imagem pelo app** (proposto, **não decidido**: perguntar à Duda). Ela gera a imagem no GPT e envia na ficha; a pauta volta para produção.
9. **Cenas 34–37 do Gemini** (D gera no GPT com os prompts; C cataloga). Salvar em `mecanismo-car/assets/fotos`, catalogar em `CENAS.md`, commit e push, re-render da pauta Gemini
   (está em `ajustar`). *Conferir:* nova versão em `para_revisar` com as cenas.
10. **Limpeza de testes** (D, no SQL editor; o conector trava em `DELETE`): `delete from psn_pauta_disparo where status <> 'disparado';` (opcional),
    `delete from psn_pauta where id='4442fc8a-c7c6-4029-918e-ad96bd660bf2';` e o objeto `psn-pautas/4442fc8a-c7c6-4029-918e-ad96bd660bf2/01.png` pelo painel Storage.
    Em seguida C versiona o DDL de `psn_criadores` e `psn_ideias` (hoje fora de `supabase/migrations/`). *Conferir:* contagens antes e depois.
11. **Pauta aprovada vira cartão na Produção (funil de 7 etapas)** (C; depois, fora do escopo atual por decisão dela em 08/10).
12. **Bucket `psn-pautas`: tirar a policy de select** (C; baixa prioridade). Hoje ela permite listar o bucket; a URL pública do objeto não depende dela. *Conferir:* listagem anon falha, imagens do app continuam.

Também em aberto, sem número: reautorizar o app da Meta antes de 04/01/2027 (D); conferir o `IG_USER_ID` do ambiente "Instagram" (D); login do app quando a plataforma estiver completa.

## 4. Checklist da 1ª execução do workflow

Disparar à mão (Run workflow) com a fila de 4 itens e conferir, em ordem:

1. Job `fila` termina em segundos, imprime a fila e `iniciar` leva os itens para `em_producao` (no máximo 3). `PSN_ROTINA_SEGREDO` não aparece em log nenhum.
2. Artefato `fila.json` existe e `historico/producao/_fila/fila.json` tem os itens com tema, formato, ajuste e comentário.
3. Job `produzir`: o `claude-code-action` instala o Python/Playwright/Chromium (setup do workflow) e a skill `producao-pauta` carrega ("Modo GitHub Actions").
4. Ferramentas negadas continuam negadas: sem Bash livre, escrita só em `entrada/`, `historico/producao/` e `PROMPTS-NOVAS-CENAS.md`; sem acesso ao segredo.
5. Estático: deck no estilo editorial (`deck.estilo = editorial`), `pipeline.carrossel` sem ✘, `contato.png` revisado, até 3 voltas do conferir.
6. Reels: roteiro em cenas/fala + legenda, sem render. Item `ajustar` (Gemini): refaz o mesmo slug considerando o comentário.
7. Artefato `producao` traz `historico/producao/<id>.json` e `saida/<slug>/NN.png` (ou `<id>.falhou.txt`).
8. Job `entregar`: sobe cada `NN.png` por `psn-pauta-upload`, chama `entregar` e o item chega a `para_revisar` (ou volta à fila com aviso e link da execução se `falhou`).
9. Commit de deck e payload no branch `producao/<data>-<run_id>`, nunca na `main`.
10. App: a ficha em `#/pauta/<id>` mostra os slides (sem cache velho, `?v=produzido_em`), legenda para copiar e Aprovar/Ajustar/Postado.
11. Tempo e custo: anotar duração do job e gasto no Console; recalibrar `TETO_RODADAS_DIA` (6) e `MAX_POR_RODADA` (3); lembrar que o repo privado no plano gratuito tem 2.000 min/mês de Actions.
12. Depois do toque no app: `psn_pauta_disparo` registra `disparado` (valida `PSN_GITHUB_TOKEN`) e o app mostra "Produzindo agora · ~10 min".

## 5. Esboço do Tempo 2 (planejar antes com a Duda)

Objetivo: um repo só. Ordem sugerida:

1. Merge do `mecanismo-car` no central preservando histórico, com os arquivos do motor na raiz (`pipeline/`, `templates/`, `marca/`, `assets/`, `entrada/`, `historico/`, `tests/`).
2. Fundir os dois `CLAUDE.md` (o do carrossel entra como seção; manter as regras do estilo editorial e do marsala `#5E0B1A`).
3. `.claude/skills/` na raiz do central; `.github/workflows/producao-pauta.yml` e os secrets passam a viver no central.
4. Trocar o repo no `psn-pauta-disparar` (constante `GH_DISPATCH` em `supabase/functions/psn-pauta-disparar/handler.ts`), redeploy da função e novo `PSN_GITHUB_TOKEN` com escopo no central.
5. Recriar as duas rotinas apontando para o central (`update_trigger` não troca repo), com os mesmos prompts, cron, conector e ambiente; migrar `config/pauta.json`.
6. Rodar teste ponta a ponta (sugestão `zz-` > Produzir > `para_revisar`), conferir as rotinas por um dia, só então arquivar `mecanismo-car` e `mecanismo-inst`.
7. Risco: `assets/fotos` pesa ~44 MB; avaliar Git LFS ou deixar como está. Os branches `claude/*` das rotinas não devem vir.

## 6. Prompt para colar no chat novo

```
Leia CLAUDE.md, docs/CONTINUAR.md, docs/ESTADO.md e docs/DECISOES.md antes de agir. Continuamos a centralização do conteúdo da Duda no PSN.
Comece por [tarefa: por exemplo, o passo 1 de docs/CONTINUAR.md]. Se a tarefa tocar carrossel, skills, rotinas ou o workflow de produção, anexe o repo sorellaidigital/mecanismo-car (add_repo, depois clonar).
Planeje antes de executar e delegue por capacidade (Haiku mecânico, Sonnet execução, Opus revisão). Português, sem preâmbulo, exceções em "Nota:" no fim. Nunca peça nem grave valor de secret.
```

Nota:
- O checklist da seção 4 foi montado a partir do desenho do workflow e das pendências de 13/10; o `mecanismo-car/docs/ROTINAS-PAUTA.md` descreve os três jobs e os secrets, mas não traz uma lista de conferência pronta.
