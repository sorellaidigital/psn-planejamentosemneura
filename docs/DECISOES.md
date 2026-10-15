# Decisões da Duda (e as técnicas que decorrem delas)

Tabela datada. "Onde" aponta para o arquivo, a tabela ou a tela em que a decisão vive. Arquivos do `mecanismo-car` estão naquele repo (não neste).
Para mudar uma decisão, registrar a nova linha aqui com a data e dizer qual substitui.

## Arquitetura e processo

| Data | Decisão | Por quê / efeito | Onde |
|---|---|---|---|
| 08/10 | Centralizar todo o conteúdo no PSN, em camadas; repo central novo em 2 tempos | Trabalho espalhado em 3 repos, Notion, VPS e rotinas. Tempo 1 feito (histórico do `mecanismo-inst`); Tempo 2 = trazer o `mecanismo-car`, primeira tarefa do chat novo | `docs/PLANO-CENTRAL.md`, `docs/CONTINUAR.md` seção 5 |
| 08/10 | Todo módulo novo passa por spec + protótipo aprovado antes de código; o app precisa ser de uso diário, não "n funções" | Evita construir telas que ela não abre. Métrica-guia: pautas postadas por semana | `docs/UX-HOJE.md`, `docs/prototipo-hoje.html` |
| 08/10 | Pauta em 2 portões: sugestões de manhã sem render; ela escolhe; só o escolhido é produzido; ela revisa | Antes a rotina produzia tudo antes da escolha (render, recorte, QA) para material que muitas vezes não era postado | `docs/PLANO-CENTRAL.md` seção 2; skill `pauta-do-dia` (mecanismo-car) |
| 08/10 | Paralelo de 5 dias úteis com o Notion antes do corte da pauta; métricas cortam no fim da C6, com ok dela | Comparar antes de desligar. Pauta começou em 09/10 e termina em 16/10 (12/10 é feriado); C6 prevista até 15/10 | `docs/ESTADO.md`, `docs/CONTINUAR.md` passo 6 |
| 08/10 | "Pauta aprovada → cartão na Produção (funil)" fica para depois | Fora do escopo das releases atuais | `docs/CONTINUAR.md` passo 11 |
| sem data | App sem login até a plataforma estar completa | Simplicidade para uso diário. Consequência: anon lê; em `psn_pauta` só muda colunas de revisão, em transições validadas por trigger; escrever conteúdo e imagens só com segredo (leitura é pública: anon lê `psn_pauta` inteiro e o bucket `psn-pautas` é público); em `psn_referencias` (e no bucket `psn-referencias`) anon tem leitura e escrita completas desde a migração de 27/09, como no módulo Ideias; conteúdo de pauta entra no Claude como dado | migrações `20261010_psn_pauta_v1.sql`, `20261011_psn_pauta_v1_1.sql`; trigger `psn_pauta_transicao` |
| 09/10 | Produção pelo GitHub Actions usando crédito de API agora; depois trocar para a assinatura (`CLAUDE_CODE_OAUTH_TOKEN`). Chave de API nunca no app | Isolar o segredo do PSN do Claude (3 jobs), teto de gasto, sem rotina com Bash livre lendo texto de app sem login | `mecanismo-car/.github/workflows/producao-pauta.yml`; Edge `psn-pauta-disparar` |
| 09/10 | Rotina "Produção da Pauta" não é criada; fica só como alternativa se o GitHub falhar | Menos isolamento (Claude com segredo e Bash livre) | `mecanismo-car/docs/ROTINAS-PAUTA.md` (c) |
| 09/10 | Janelas de produção 08:30, 13:30 e 18:30 BRT mais disparo imediato pelo app, em vez de rotina horária 07–20h | O app dispara o workflow após Produzir/Ajustar (debounce 2 min, teto 10 disparos/dia); cron só de reserva. Tetos 3 itens × 6 execuções/dia | Edge `psn-pauta-disparar`; workflow; `pipeline/producao.py` (mecanismo-car) |
| 08/10 | Métricas: fonte é o `psn-ig-sync` estendido, não MCP da Meta. Ads MCP só interativo e leitura, nunca em rotina | A Meta não tem MCP de Instagram orgânico; rotina que lê texto de terceiros não recebe escrita | `docs/AVALIACAO-MCP-META.md`, `docs/ESTADO.md` |
| 09/10 | Rotinas gravam no PSN por RPC com segredo (opção A), sem conector Supabase | Conector daria `execute_sql` em todos os projetos a uma rotina que lê texto de terceiros | migração `20261009_psn_ig_c5.sql`; `docs/ROTINAS-C5.md` |
| 08/10 | Bucket `psn-transfer` fica (vazio, privado, sem policies) | O Supabase não deixou apagar por SQL nem pela tela | `docs/ESTADO.md` |
| 13/10 | Passagem para um chat só no central; Tempo 2 depois | Chat novo continua sem perder contexto | `CLAUDE.md`, `docs/CONTINUAR.md` |

## Produto e UX do app (protótipo v2, aprovado em 08/10)

| Data | Decisão | Por quê / efeito | Onde |
|---|---|---|---|
| 14/10 | Pauta do Dia passa a 1 Reels + 1 carrossel por dia (hoje 3 + 3). Ainda não implementado; vem depois do teste de modelos | Pauta com 6 sugestões por dia não virou post: só 1 de 8 posts desde 05/10 bateu com sugestão | skill `pauta-do-dia` (mecanismo-car); `docs/CONTINUAR.md` seção 3, passo 0 |
| 14/10 | Base das sugestões = ideias salvas no raio (`psn_ideias`) + notícia do dia com fonte. Ainda não implementado | A Pauta não lia `psn_ideias` (49 ideias salvas, sem uso); a ideia que a Duda já guardou é o insumo | `pipeline/psn.py` (comando `ideias` a criar), skill `pauta-do-dia` (mecanismo-car); `docs/CONTINUAR.md` seção 1 |
| 08/10 | Hoje substitui o diretório em `#/`; canais vão para `#/canais`; atalhos para Calendário, Banco, Métricas e Canais; Lixeira por link | Uma tela de entrada com só o que pede ação | `docs/UX-HOJE.md` §3–4, §12.1; `app/index.html` |
| 14/10 | Home do app volta a ser Canais (captura de ideias); Hoje vira botão (`#/hoje`). Substitui a decisão de 08/10 de Hoje em `#/`. `#/canais` segue como alias | O app foi criado para guardar ideias rápido; concentrar tudo no Hoje fez a Duda parar de usar. Nada foi desfeito, só mudou a ordem | `app/index.html` (`rota`, `hjEhRota`, `hjRender`, `renderHome` com o botão `#bHoje`), `docs/UX-HOJE.md` §2 e §3, `CLAUDE.md` (Rotas); link do push e do Notion em `mecanismo-car` aponta para `#/hoje` |
| 08/10 | Meta: mínimo 1 post/dia, ideal 1 estático + 1 Reels, todos os dias; placar "Hoje: Estático ✓/— · Reels ✓/—" e "Semana: N de 7 dias com post" | Objetivo mensurável de uso | `docs/UX-HOJE.md` §1, §12.2 |
| 08/10 | 3 sugestões de estático + 3 de Reels por dia, em faixas de rolagem horizontal com snap; rotina todos os dias, inclusive fim de semana | Escolha barata (menos de 2 min) | skill `pauta-do-dia`; `docs/UX-HOJE.md` §4.2 |
| 08/10 | Gancho em fonte normal (sem serifada); sem tema escuro; sem estado de fim de semana | Consistência com o app atual | `docs/UX-HOJE.md` §11, §12.14 |
| 08/10 | Destinos de cada sugestão: Produzir · Banco · Lixeira; Lixeira restaurável; nada se apaga sozinho; Desfazer de 5 s com gravação adiada | Evita perda por toque errado | `docs/UX-HOJE.md` §7, §12.4 |
| 08/10 | Produzir e Banco no mesmo bloco; Lixeira só como ícone vermelho de 44 px (com texto na ficha) | Menos botões no cartão | `docs/UX-HOJE.md` §13.3 |
| 08/10 | Calendário (semana/mês) com 2 vagas por dia, horário sugerido pelo comportamento do público, "postado" automático (coleta a cada 4 h) com reserva manual | Ver o ritmo e o melhor horário | `docs/UX-HOJE.md` §6, §5.2; `psn_ig_horarios` (vazia; passo 4 de CONTINUAR) |
| 08/10 | Reels produzido = roteiro em blocos + cenas + legenda, sem render (ela grava); mesmo fluxo Aprovar/Ajustar/Postado do estático | Reels não se renderiza | skill `producao-pauta`, `sofia` (mecanismo-car); `docs/UX-HOJE.md` §5.2 |
| 08/10 | Comentário obrigatório no Ajustar, com 4 atalhos por formato; ajuste opcional antes de produzir (só na ficha) | Ajuste sem texto não orienta a refação | `docs/UX-HOJE.md` §12.9–10; trigger de transição |
| 08/10 | Pode produzir mais de uma por dia, sem limite de UX; o toast informa quantas estão na fila | Os tetos ficam no workflow, não na tela | `docs/UX-HOJE.md` §12.11; `pipeline/producao.py` |
| 08/10 | Sugestão não escolhida vira `ideia` na manhã seguinte; "Rotina falhou" só depois das 06:30, sem push de erro | Banco alimenta a rotina | `docs/UX-HOJE.md` §12.12 |
| 08/10 | As 4 pautas produzidas no Notion e nunca revisadas ficam num grupo recolhido do Banco (`origem='notion'`, `status='para_revisar'`), fora do Hoje e do Calendário | Não poluir a decisão do dia | `docs/UX-HOJE.md` §13.1 |
| 08/10 | Push às 10h se nada foi escolhido: um por dia, todos os dias | Lembrete único. **Decidido, não implementado** | `docs/UX-HOJE.md` §8.4, §13.2; `docs/CONTINUAR.md` passo 5 |
| 08/10 | Ordem do Hoje por distância até "postado": postar > revisar > escolher > acompanhar > informar | Priorizar o que fecha o ciclo | `docs/UX-HOJE.md` §12.8 |

## Conteúdo e marca

| Data | Decisão | Por quê / efeito | Onde |
|---|---|---|---|
| 15/10 | Templates de carrossel aprovados no catálogo: editorial, balões, tela real, Duda me indica, tela dividida (ajustar só as cenas), reação de série. Ajustados: chapado (mascote 3D no modelo da inspiração, gerado no GPT), notas (capa no padrão da inspiração + capa de caixas empilhadas do datilografado), frase e fofoca (fotos conforme o tema) | Cada template vem de um post que ela salvou pelo raio; visual próprio por formato em vez de tudo no editorial | mecanismo-car `templates/<estilo>/` (estilos plugáveis), `marca/PERFIL.md` seção "Templates"; catálogo https://claude.ai/artifact/UgGYBiFkfAUzsPfdyRvEq8 |
| 15/10 | Fusões: meme + série → `meme` (meme ocupa o slide todo, texto branco, destaques em fundo marsala); diário + cotidiano → `diario` (foto do dia a dia + texto do diário; frase serif só como capa); notícia + reportagem → `reportagem` (capa com foto da Duda conforme o tema + logos em círculos; miolo com imagens da própria notícia) | Formatos parecidos viram um só para simplificar a escolha | mecanismo-car `templates/meme`, `templates/diario`, `templates/reportagem`, `pipeline/print_url.py` |
| 15/10 | Reprovados e removidos do repo: cartão, colagem, grade, guia, papel, destaque ("o formato cheio de fru-fru não representa a gente"), ícones ("inspiração pontual, não formato próprio"). Pendentes: última hora, template de edição de Reels, formatos de conteúdo | Biblioteca enxuta; o git guarda o histórico se ela quiser voltar | mecanismo-car (commit "Remove templates reprovados…"), `marca/PERFIL.md` |
| 14/10 | Antes de mudar a Pauta, varrer o banco de ideias e extrair modelos e temas para testar no perfil, mantendo a ID visual do editorial. Em andamento: mecanismo-car `modelos/` | Testar no perfil antes de mudar a Pauta; a ID visual do editorial fica igual no teste | `docs/CONTINUAR.md` seção 1 e passo 0 da seção 3; mecanismo-car `modelos/` |
| 08/10 | Estilo editorial é o padrão do carrossel (cena em tela cheia, fundos chapados, Inter Bold + manuscrito, `serie` no topo); estático produzido pela rotina sempre editorial | Aprovado a partir do post de @juliawolfcruz | `entrada/ia-concorda-editorial.deck.json`, skill `design`, `marca/marca.json` (mecanismo-car) |
| 08/10 | Marsala correto = `#5E0B1A` (o antigo `#7A0C2E` está aposentado) | Tom da camisa/blazer das fotos | `marca/marca.json`, `marca/PERFIL.md` (mecanismo-car) |
| 08/10 | Combinado de trabalho no carrossel: ajustar um ponto por vez, mostrar o `contato.png` e esperar o ok; reprovação vai para o PERFIL | Evita retrabalho em cascata | `marca/PERFIL.md` (mecanismo-car) |
| 08/10 | Mecanismo de capa = 3ª rodada (moldura acompanha a foto, `zoom: 1`); a 4ª rodada foi reprovada e revertida | Capa com texto e cena chamando mais que o rosto | `assets/fotos/CENAS.md`, `marca/PERFIL.md` (mecanismo-car) |
| 05/10 | Público, urgências U01–U10, linhas L1–L5 e esteira D0–D4 aprovados; ferramentas em rodízio (ChatGPT, Claude, Gemini, Copilot); tema comum vira "IA" com os 4 logos | Base de toda sugestão | `marca/publico/PUBLICO.md` (mecanismo-car) |
| 09/10 | Valores sempre em R$ de fonte oficial brasileira (sem converter, sem US$) | Público brasileiro | skill `roteiro` (mecanismo-car) |
| 09/10 | Imagem conforme o tema; se nenhuma cena do banco combinar, dar o prompt para ela gerar no GPT (padrão `PROMPTS-NOVAS-CENAS.md`) | Evita foto fora do assunto; ex.: Gemini, cenas 34–37 | `assets/fotos/PROMPTS-NOVAS-CENAS.md` (mecanismo-car) |
| sem data | Nunca publicar no Instagram automaticamente | Quem posta é a Duda | skills e prompts das rotinas |

## Métricas e infraestrutura

| Data | Decisão | Por quê / efeito | Onde |
|---|---|---|---|
| 08/10 | Coletor próprio no Supabase (`psn-ig-sync`) substitui o IG Analytics do VPS; desligar o VPS só após o ok da C6 e se ela não usar hub/agentes/CRM/radar | Um lugar só | `supabase/functions/psn-ig-sync`, `docs/ESTADO.md` |
| 08/10 | Comparação do paralelo C6 com critério de diferença ≤ 1%, somando os mesmos dias (PSN usa o último dia completo, D-1) | Janelas diferentes enganam linha a linha | `docs/ESTADO.md` |
| 08/10 | Limpeza das tabelas de transferência feita pela Duda no SQL editor | O conector não apaga | `docs/ESTADO.md` |
| 13/10 | `DELETE` e limpezas de dado de teste são feitos pela Duda no SQL editor | O conector Supabase trava em `DELETE` | `CLAUDE.md` (Armadilhas) |

Nota:
- As datas de 05/10 (público) e 08/10 (editorial, marsala, capa) vêm do `CLAUDE.md` do `mecanismo-car`. A data de 09/10 para "valores em R$" e "imagem conforme o tema" vem do arquivo de fatos da passagem; os arquivos `PUBLICO.md`, `PERFIL.md` e `CENAS.md` não estão neste repo.
- Linhas "sem data" (app sem login, nunca publicar sozinho) são regras permanentes sem data de decisão registrada nos documentos.
