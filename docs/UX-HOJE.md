# UX — telas "Hoje", "Calendário", "Banco" e "Lixeira" e o fluxo da Pauta em 2 portões

Especificação de produto para a R1/R2 do `docs/PLANO-CENTRAL.md` (seções 1–3 e 2b).
Protótipo navegável (v2, 08/10/2026): `prototipo-hoje.html` (scratchpad da sessão; publicar só com o ok da Duda).
Base de dados real: inventário do Notion "Pauta do Dia" de 08/10/2026.
Versão 2: incorpora os ajustes da Duda sobre o protótipo v1 (seção 2b do plano).

## 0. Diagnóstico que orienta a spec

Inventário do Notion (19 linhas): 5 "Para revisar" (4 reais + 1 [TESTE]) com 48 PNGs, 14 "Ideia" (11 reais + 3 [TESTE]),
0 aprovadas, 0 postadas, 0 comentários. A rotina produz; ninguém revisa. A causa não é a qualidade do carrossel:
é que a decisão chega tarde (depois do trabalho feito), longe (no Notion, sem alerta acionável) e pesada
(10 PNGs para olhar antes de dizer "não é esse o tema").

A spec inverte isso: **a primeira coisa que a Duda vê é uma decisão barata** (escolher entre 3 temas de cada formato),
e só depois chega o material pesado, que ela já pediu.

## 1. Objetivo, meta e métrica-guia

**Objetivo:** o PSN é aberto todo dia e cada abertura termina com uma decisão tomada em menos de 2 minutos.

**Meta de conteúdo (decisão da Duda):** **mínimo 1 post por dia; ideal 1 estático + 1 Reels por dia**, todos os dias,
inclusive sábado e domingo. Dia "com post" = dia com ao menos 1 pauta `postado` (pelo `postado_em` em BRT).

**Placar do topo do Hoje** (cada item leva ao Calendário):
- **Hoje: Estático ✓/— · Reels ✓/—** (✓ em verde-ácido quando há `postado` do formato com `data` = hoje).
- **Semana: N de 7 dias com post** (segunda a domingo).
- "para revisar N" (leva ao Hoje) e "no banco de ideias N" (leva ao Banco).
- Linha fixa: "Mínimo: 1 post por dia · Ideal: 1 estático + 1 Reels".

| Métrica | Definição | Fonte | Meta inicial |
|---|---|---|---|
| **Dias com post por semana** (guia) | dias distintos com `postado_em` na semana (seg–dom, BRT) | `psn_pauta` | 7 de 7 (mínimo aceitável: 5) |
| Dias com o ideal (1+1) | dias com ao menos 1 `estatico` e 1 `reels` postados | `psn_pauta` | ≥ 4 de 7 |
| Escolha até 10h | % de dias em que `decidido_em` da 1ª sugestão do dia ≤ 10:00 BRT | `psn_pauta` | ≥ 80% |
| Revisão em até 24h da entrega | % de pautas com `revisado_em − produzido_em` ≤ 24h | `psn_pauta` | ≥ 80% |
| Produzidas × postadas | `count(produzido_em) : count(postado_em)` em 30 dias | `psn_pauta` | perto de 1:1 |
| % de sugestões aprovadas | `aprovado_producao_em not null / sugeridas` em 30 dias, por formato | `psn_pauta` | 25–40% (abaixo, a rotina sugere mal) |
| Postado automático | % de `postado` com `postado_origem='auto'` | `psn_pauta` | ≥ 90% (mede se o casamento com o Instagram funciona) |
| Dias com o app aberto | dias com `psn_pauta_dia.visto_em` / dias do período | `psn_pauta_dia` | ≥ 5 de 7 |

Todas saem de colunas que o app ou o coletor já gravam (status e carimbos). Nenhum rastreador externo.

## 2. Princípios

1. **Hoje é a única entrada.** `#/` abre o Hoje. Calendário, banco, lixeira, métricas e canais são destinos a partir dele, nunca abas concorrentes.
2. **Ação em 1 toque.** Produzir · Banco · Lixeira; Aprovar · Marquei como postado. Texto só no Ajustar (obrigatório) e no ajuste antes de produzir (opcional).
3. **Sem confirmação, com Desfazer.** Toda ação mostra um toast de 5 s com "Desfazer". O app só grava depois dessa janela (ou na hora, se a página for escondida: `visibilitychange`).
4. **Celular primeiro.** 390 px, botão de ação a um polegar, barra fixa com `env(safe-area-inset-bottom)`; desktop é a mesma coluna centralizada (máx. 720 px).
5. **O app mostra, a rotina preenche.** O app só muda `status`, `comentario`, `agendado_para` e carimbos de tempo.
6. **Ordem por distância até "postado".** postar > revisar > escolher > acompanhar > informar.
7. **Estado vazio digno.** Sem tela em branco, sem "nenhum item".
8. **Nada se apaga sozinho.** Descartar manda para a Lixeira, de onde se restaura. Ideia velha vira aviso, não exclusão.
9. **Todos os dias.** Não existe "dia útil" no produto: sugestões 7/7 às 05:47 e produção 07–20h 7/7.
10. **Medir uso.** Toda decisão tem carimbo; a primeira abertura do dia carimba `psn_pauta_dia.visto_em`.

## 3. Mapa de telas e rotas

| Rota | Tela | Como chega |
|---|---|---|
| `#/` | **Hoje** | abrir o app; link do push; ← de qualquer tela |
| `#/calendario` | **Calendário** (semana/mês, 2 vagas por dia) | placar do topo; atalho no rodapé do Hoje; voltar da ficha aberta por uma vaga |
| `#/pauta/<id>` | Ficha (sugestão, ideia, pauta em produção ou produzida; mesma rota, corpo muda pelo status e pelo formato) | toque num cartão ou numa vaga; link do push |
| `#/banco` | Banco de ideias | placar "no banco"; atalho no rodapé; aviso de rotina falhou; "escolher do banco" numa vaga vazia do Calendário |
| `#/lixeira` | **Lixeira** (descartadas, com Restaurar) | link "Lixeira (N)" no Banco e no rodapé do Hoje |
| `#/metricas` | Métricas (já existe) | cartão "ontem no instagram" e atalho |
| `#/canais` | Diretório de canais atual (Ideias de referência + Produção) | atalho "Canais" no rodapé do Hoje |
| `#/c/<id>` | Quadro do canal (já existe) | a partir de `#/canais` |
| `#/capturar?ref=` | Captura do Atalho do iPhone (já existe) | inalterada; ao fechar, volta para `#/canais` |

No protótipo as rotas são `#hoje`, `#calendario`, `#banco`, `#lixeira`, `#pauta-<id>`, `#metricas`, `#canais`.

Mudanças no código existente: `renderHome()` vira `renderCanais()` em `#/canais`; o ← de Métricas e do quadro do canal volta
para `#/` (Hoje) e `#/canais` respectivamente. O botão "Métricas" sai do topo do diretório.

**Como os módulos ficam acessíveis sem virar abas:** 4 atalhos no fim do Hoje (Calendário · Banco de ideias · Métricas · Canais),
um link "Lixeira (N)" logo abaixo, e os números do placar no header. Sem barra de abas inferior: barra de abas convida a "passear"
e faz o Hoje competir com os módulos. O ← da ficha volta para a tela de onde ela foi aberta (Hoje, Calendário, Banco ou Lixeira).

Nota de nome: o app já tem "Ideias" (referências de outros perfis). O banco de pautas chama **"banco de ideias"** na interface
(termo da Duda); na rota e no código é `banco`. O diretório antigo passa a "Canais" com subtítulo "referências e funil".

## 4. Tela Hoje

### 4.1 Estrutura (de cima para baixo)

1. **Header roxo (território):** selo PSN, "hoje", data e hora em Space Grotesk 600 ("quinta, 8 de outubro · 07:12"),
   linha **Hoje: Estático ✓/— · Reels ✓/—**, números (Semana N de 7 · para revisar · no banco) e a linha de meta.
   Na tela Hoje o header **rola com a página** (não é fixo): com o placar de duas linhas ele passaria de 200 px e comeria o celular.
   Nas demais telas o header continua fixo e compacto.
2. **Bloqueio** (só se houver): rotina falhou.
3. **Falta postar** (`aprovado`): cartão com prévia (miniaturas no estático; gancho falado e nº de cenas no Reels), horário agendado,
   "Copiar legenda" e **"Marquei como postado"** (reserva do automático).
4. **Pronto para revisar** (`para_revisar`, `origem <> 'notion'`): cartão com prévia, hora de chegada e conferência; ação **"Revisar →"**.
5. **Estático de hoje** e **Reels de hoje**: duas faixas, cada uma com 3 cartões de sugestão (ver 4.2). Decididas viram linhas-resumo
   ("na fila de produção · tema", "no banco · tema", "na lixeira · tema"), tocáveis.
6. **Em produção** (`aprovada_producao`, `em_producao`, `ajustar`): trilha de 5 segmentos e previsão.
7. **Tudo feito** (se 3–6 estiverem vazios e a rotina não falhou).
8. **Ontem no Instagram** (sempre): 3 números + "Sinal para a pauta"; "Ver métricas →".
9. **Atalhos:** Calendário · Banco de ideias · Métricas · Canais (2×2 no celular, 4 em linha a partir de 520 px) e "Lixeira (N) →".
10. **Simulador do protótipo** (só no protótipo, `<details>` no fim): manhã, em produção, pronto para revisar, tudo feito, rotina falhou.

### 4.2 Cartão de sugestão e a decisão de layout das faixas

**Decisão: cada faixa é uma fileira com rolagem horizontal e `scroll-snap` (cartão a 86% da largura, o próximo aparece pela borda), com 3 pontinhos de posição.**
Por quê: (a) a Duda precisa comparar 3 opções do mesmo formato lado a lado, e a borda do próximo cartão avisa que há mais;
(b) as duas faixas cabem juntas em ~2 telas de celular; uma pilha de 6 cartões altos (~2.500 px) empurraria "ontem no Instagram",
revisar e postar para longe e faria o Hoje parecer lista de tarefas; (c) o polegar já rola assim em stories e carrosséis;
(d) a rolagem é interna à fileira, então a página nunca ganha rolagem lateral. Contra: o 3º cartão fica escondido; mitigado pelo
"3/3" no título e pelos pontos. No desktop (coluna de 720 px) cabem ~2 cartões de 340 px, mesma lógica.

Cartão (altura igual entre os 3, botões sempre no pé):
- Linha 1: número (1, 2, 3 em círculo, Space Grotesk 700), estrutura (tutorial, lista, mito×verdade…), no Reels "N cenas · ~36 s".
- Tema (título do cartão, até 3 linhas).
- **Gancho** em **Space Grotesk 600**, com rótulo "CAPA ·" (estático) ou "GANCHO FALADO ·" (Reels). **Nada em fonte serifada em texto de conteúdo.**
- Chips: urgência (U + nome), linha (L + nome), degrau (só se ≠ D0).
- "Por quê:" 1ª razão, 2 linhas no máximo.
- "✋ Precisa de você: …" quando a rotina marcou algo que só ela sabe.
- **3 destinos:** bloco único **Produzir** (verde-ácido, maior) | **Banco**, e ao lado o ícone vermelho da **Lixeira** (sem texto).
- Tocar no corpo abre a ficha.

Sugestão de **Reels** traz gancho falado e cenas curtas (cada cena: tempo, o que aparece/quem fala e a fala).
Reels "produzido" é **só texto**: roteiro completo em blocos + cenas + legenda; ela grava. Não há render.

### 4.3 Estados

| Estado | Quando | O que aparece |
|---|---|---|
| **Manhã com sugestões** | `psn_pauta_dia` do dia ok, há `sugerida` | header; faixas "estático de hoje 3/3" e "reels de hoje 3/3"; texto "Escolha 1 ou mais; o resto vai para o banco ou para a lixeira. Escolhendo até 10h, fica pronto para postar hoje." |
| **Já escolheu** | há `aprovada_producao`/`em_producao` | resumo da escolha + "em produção": "**Produzindo agora** · chega em ~10 min" ou "Vai na próxima janela… **Próxima: hoje 13:30**" (4.4) "Não precisa fazer nada. Avisamos no celular quando chegar." Sugestões pendentes continuam nas faixas ("Produzir também funciona aqui") |
| **Pronto para revisar** | há `para_revisar` | bloco no topo: "O que você escolheu chegou. Revise até as 10h para postar hoje." (depois das 10h: "Revise para postar hoje.") |
| **Falta postar** | há `aprovado` | cartão com legenda copiável e "Marquei como postado"; o app costuma detectar sozinho (ver 5.1) |
| **Tudo feito** | nada a postar, revisar, escolher ou acompanhar | "✓ nada esperando você". Com 1+1 postados: "Estático e Reels de hoje estão postados: o ideal do dia foi cumprido." Com só 1: "O Reels de hoje está postado: o mínimo do dia foi cumprido. Falta o estático para o ideal." Fecha com "Amanhã às 05:47 chegam 3 sugestões de estático e 3 de Reels…", "N ideias guardadas", "N de 7 dias com post nesta semana" |
| **Rotina falhou** | depois das 06:30, sem `psn_pauta_dia` do dia ou `rotina_status='falhou'`, e sem `sugerida` do dia | aviso bordô: "**As sugestões de hoje não chegaram.** A rotina das 05:47 não terminou. Não é nada com você: já ficou registrado e ela tenta de novo amanhã. Quer postar algo hoje? Escolha uma do banco, de estático ou de Reels." + "Abrir banco de ideias (N)" |
| **Rotina atrasada** | 05:47–06:30, sem sugestões | linha discreta: "As sugestões de hoje estão chegando." |

Não há estado de fim de semana nem de tema escuro. O produto é só claro.

**Sugestões não escolhidas no dia:** às 05:47 do dia seguinte a rotina passa as `sugerida` antigas para `ideia` (banco), com `origem`
preservada. O Hoje nunca acumula sugestão velha. (Regra da rotina, não do app.)

### 4.4 Previsão de produção

Modelo R2 (desde 09/10/2026): **disparo imediato + janelas de reserva**. Depois que o PATCH de Produzir/Ajustar grava, o app
chama a Edge Function `psn-pauta-disparar` (fire-and-forget, debounce local de 3 s), que faz `workflow_dispatch` do
`producao-pauta.yml` (repo `mecanismo-car`). Reserva: o mesmo workflow roda às **08:30, 13:30 e 18:30 BRT** (cron
`30 11,16,21 * * *` UTC). Tetos: 3 itens por execução, 6 execuções com produção por dia, 10 disparos por dia na função;
o que passar do teto espera a próxima janela.

O estado vem do item e do último registro de `psn_pauta_disparo` (anon lê):

| Situação | Texto |
|---|---|
| `em_producao`, ou último `disparado` posterior à decisão do item e com menos de 5 min | "**Produzindo agora** · chega em ~10 min" |
| idem, mas iniciado há mais de 25 min | "**Demorando mais que o normal.** Se não chegar, vai na próxima janela." (a entrega com falha devolve o item à fila com o aviso) |
| qualquer outro caso (disparo `ignorado`/`erro`/`nao_configurado`, teto, disparo que não pegou o item) | "Vai na próxima janela de produção (08:30, 13:30 ou 18:30). **Próxima: hoje 13:30**" / "amanhã 08:30" |

Sem previsão de hora exata: os toasts dizem "Avisamos quando chegar" (Produzir) e "Ajuste enviado. Avisamos quando voltar".

## 5. Ficha (`#/pauta/<id>`)

Header: ← (volta para a tela de origem) · "Sugestão"/"Pauta"/"Carrossel"/"Reels" · formato, status e data.

### 5.1 Ficha da sugestão ou da ideia (`sugerida`, `ideia`; também `descartado` e `aprovada_producao`)

Corpo, nesta ordem:
1. Chips (formato, estrutura, U, L, D).
2. Tema.
3. **Gancho da capa** (estático) ou **Gancho falado** (Reels), em Space Grotesk 700.
4. Estático: **O que cada slide diz** (lista numerada, 5–8 itens). Reels: **Cenas** (tempo, `[o que aparece]`, fala).
5. **Por quê** (sinal · radar · rodízio · público · degrau · banco).
6. **Fontes.**
7. **Precisa de você** (aviso bordô), se houver.
8. **Prazo** ("só faz sentido até 10/10"), se houver `valida_ate`.
9. **Agendado para** (ver 5.3).
10. **Ajuste antes de produzir (opcional)**: campo de 2 linhas, "Ex.: troca o exemplo por um de RH".

Barra fixa: **Lixeira** · **Banco** (só em `sugerida`) · **Produzir**.
Em `aprovada_producao`: "Voltar para o banco" (desiste antes de a rotina pegar). Em `descartado`: "Restaurar para o banco".

Ideia do banco sem roteiro (as do Notion só têm ângulo): mostra **Ângulo** com a dica "Ideia guardada sem roteiro: a produção monta gancho e slides (ou cenas) a partir do ângulo."

**Ajuste antes de produzir: sim, mas só como campo opcional na ficha, nunca no cartão.** O ajuste mais comum custa 10 segundos antes e uma
volta inteira de produção depois; mantém o Produzir do cartão em 1 toque; não cria um 3º portão. O texto vai para `comentario` (+ `comentario_em`)
junto com a transição para `aprovada_producao`; a produção lê `comentario` nesse status.

### 5.2 Ficha da pauta produzida (`para_revisar`, `ajustar`, `aprovado`, `postado`)

Comum aos dois formatos:
1. **Faixa de status**: chip, "chegou 08:24", "postado 19:42 · detectado no Instagram" ou "· marcado por você", trilha de 5 segmentos.
2. Tema + chips. Se `postado`: link "ver no Instagram ↗" (`ig_midia_id`).
3. **Legenda** com "⧉ Copiar legenda".
4. **Agendado para** (5.3), exceto se `postado`.
5. Se `aprovado`: bloco "Postado é automático" (ver abaixo).
6. "Proposta original e fontes" recolhido.
7. "Não vou postar este" (botão de risco) → `descartado` (Lixeira).

**Estático:** tira deslizante de slides 4:5 (scroll-snap, 82% da largura), contador "3 de 11", pontos, linha de QA
("Conferência automática: 0 erro, 0 aviso · estilo editorial · 1080×1350"; com ✘ ou ⚠, aviso bordô com a lista).

**Reels:** bloco **"Roteiro para gravar"** com chip "N cenas · ~36 s", aviso "Reels produzido é só texto: você grava. Não há vídeo para baixar",
as cenas em blocos numerados (`[o que aparece]` + tempo, e a fala entre aspas; a 1ª, "Gancho falado", em negrito), botão **⧉ Copiar roteiro**
e "Texto corrido para copiar" recolhido (também serve de reserva se a cópia falhar). Não existe "Marquei como gravado": o fluxo é o mesmo do estático.

Barra fixa por status (igual nos dois formatos):

| Status | Barra |
|---|---|
| `para_revisar` | **Ajustar** (fantasma) · **Aprovar** (verde) |
| `ajustar` | sem barra; aviso "Ajuste pedido. A rotina refaz e avisa quando voltar." + comentário citado |
| `aprovado` | **Copiar legenda** · **Marquei como postado** |
| `postado` | sem barra; faixa com "postado 17:52" |

**Ajustar** abre um painel na própria página: "O que mudar?", 4 atalhos (estático: "Troca o gancho da capa", "Outra foto na capa",
"Mais curto", "Tom mais leve"; Reels: "Troca o gancho falado", "Cenas mais curtas", "Mais curto", "Tom mais leve"), campo livre,
"Cancelar" · "Enviar ajuste" (desabilitado com campo vazio). Comentário é obrigatório no Ajustar.

**"Postado" automático (decisão da Duda).** O coletor `psn-ig-sync` (a cada 4 h) casa cada post novo do Instagram com a pauta `aprovado`
do mesmo formato e dia (legenda e data) e grava `postado_em` real, `ig_midia_id` e `postado_origem='auto'`. O botão "Marquei como postado"
(`postado_origem='manual'`) é só reserva, para quando o post ainda não apareceu na coleta. A ficha `aprovado` mostra a próxima coleta
("próxima ~12:00") e essa explicação.

### 5.3 "Agendado para"

Bloco na ficha de toda pauta que não esteja `postado` nem `descartado`: horário grande ("19:30"), dia ("hoje", "amanhã", "sex 9/10"),
chip "sugerido" ou "escolhido por você", e uma linha com as faixas fortes do dia da semana.
**"Mudar horário"** abre, na própria página: **3 opções rápidas** (melhor horário do dia · 2ª faixa · "em ~1 h" no dia de hoje ou "cedo 08:00" nos outros)
e um campo `time` ("Outro horário") + "Usar". Escolher grava `agendado_para` (e marca que foi editado), com toast "Agendado para hoje 20:00" e Desfazer.
Antes de produzir, o horário escolhido fica como preferência e vira `agendado_para` quando a pauta é produzida. O app **não posta**: o horário
é um lembrete e o dado que o Calendário mostra; o push de "hora de postar" é decisão futura.

Horário sugerido padrão: o estático fica com o pico da faixa mais forte do dia da semana; o Reels, com o pico da outra faixa
(assim os dois não colidem). Fonte dos picos: seção 6.2.

## 6. Calendário (`#/calendario`)

### 6.1 Estrutura
1. **Melhores horários do seu público** (no topo, curto): 7 linhas (seg a dom), cada uma com 2 faixas; a mais forte em verde-ácido; hoje em negrito.
   Uma linha de fonte: **"Fonte: pelos seguidores online por hora (Instagram)"** ou, se esse dado não estiver disponível,
   **"Fonte: pelo alcance dos seus posts nas primeiras horas"**. No protótipo os números são exemplo (chip "exemplo").
2. Bloco **"Postado é automático"**: "Quando o post aparece no Instagram (o app olha a cada 4 h), a vaga vira 'postado' sozinha, com o horário real.
   Se demorar, abra a pauta e toque em 'Marquei como postado'."
3. Segmentado **Semana | Mês** (semana é o padrão).
4. **Semana:** ‹ "5 a 11 de outubro" › (+ "Voltar para hoje" fora da semana atual); 7 cartões de dia, cada um com **2 vagas lado a lado: Estático e Reels**.
5. **Mês:** ‹ "outubro de 2026" ›; grade seg–dom; cada dia mostra 2 pontos (1º estático, 2º Reels) coloridos pelo status, com legenda;
   tocar no dia abre embaixo o painel do dia com as 2 vagas (mesmo componente da semana). Dia de hoje com contorno.

### 6.2 Vaga
Cada vaga mostra: rótulo do formato, **status**, tema curto (2 linhas) e horário.

| Status da vaga | Quando | Horário mostrado | Toque |
|---|---|---|---|
| `sugerida` | hoje, com sugestões pendentes do formato | "sugerido 19:30" | vai ao Hoje |
| `em produção` | `aprovada_producao`, `em_producao` ou `ajustar` | "sugerido 19:30" (ou "agendado 20:00" se ela editou) | abre a ficha |
| `para revisar` | `para_revisar` | idem | abre a ficha |
| `aprovado` | `aprovado` | idem | abre a ficha |
| `postado` | `postado` | "postado 19:42" + link **ver no Instagram ↗** | abre a ficha |
| `vazio` (hoje ou futuro) | sem pauta | "sugerido 18:30" | **"escolher do banco →"**: abre o Banco já filtrado pelo formato e com "Escolhendo para sex 9/10 · Reels"; Produzir ali cria a pauta com `data` e `agendado_para` daquela vaga e volta ao Calendário |
| `vazio` (passado) | sem registro | "sem registro" | nenhum |

Se o dia tem mais de uma pauta do mesmo formato, a vaga mostra a mais adiantada e um chip "+1".
Precedência: postado > aprovado > para revisar > em produção.

**Meses passados** mostram o histórico (o que foi postado, formato, tema e hora). O protótipo traz 2 semanas de exemplo (21/09 a 07/10, todas marcadas como exemplo);
antes disso, "sem registro". No app real o histórico vem de `psn_ig_midia` (posts reais) e das pautas.

### 6.3 Horários do público (`psn_ig_horarios`)
Prioridade da fonte: (1) `online_followers` (seguidores online por hora) da Graph API, **se a v25 ainda entregar** (testar numa execução manual do coletor,
antes de desenhar a tabela, onda 3); (2) histórico próprio: alcance e engajamento nas primeiras horas por dia da semana × hora de `psn_ig_midia.publicado_em`.
A tela lê `psn_ig_horarios` e escolhe as 2 faixas de maior `valor` por dia da semana; `fonte` diz qual explicação mostrar.

## 7. Banco de ideias (`#/banco`) e Lixeira (`#/lixeira`)

### 7.1 Banco
- Header: ← · "Banco de ideias" · "N guardadas · produzir a qualquer dia". Com vaga de destino: "escolhendo para sex 9/10 · Reels".
- **Filtros:** 2 selects (urgência U01–U10, linha L1–L5), segmentado de **formato** (todos · estático · Reels; travado no formato da vaga quando veio do Calendário)
  e **ordenar** (recentes · com prazo · antigas).
- Cartão: formato, tema, ângulo/gancho em 2 linhas, chips de prazo, idade, U, L e D (se ≠ D0). Ações: **Produzir** e **Lixeira**.
- **Formato único por ideia.** As ideias do Notion que tinham "Carrossel" e "Reels" juntos entram no banco com um formato (a rotina escolhe o que combina com o ângulo; a Duda pode produzir a outra versão pedindo "ajuste antes de produzir").
- **Prazo:** `valida_ate` ≤ 3 dias → chip vermelho "vale até 10/10"; vencido → "passou do prazo (10/10)".
- **Envelhecimento:** mais de 30 dias → grupo "mais de 30 dias · N", borda tracejada e "há 40 dias · ainda vale?". Sem exclusão automática.
- Grupo recolhido **"produzidas no Notion, nunca revisadas · 4"** (decisão 1 da seção 13), com "Abrir no Notion ↗" e Lixeira.
- Link **"Lixeira (N) →"** no fim. O antigo grupo "descartadas" foi substituído pela tela Lixeira.
- Vazio com filtro: "Nenhuma ideia com esse filtro." + "Limpar filtros". Banco vazio: "Banco vazio. As sugestões que você guardar aparecem aqui."

### 7.2 Lixeira
- Header: ← · "Lixeira" · "N descartadas · nada se apaga sozinho".
- Lista por `descartado_em` mais recente: formato, "descartada ontem 18:20", tema, ângulo/gancho; botão **Restaurar** (`descartado → ideia`, volta para o banco) com Desfazer.
- Tocar no cartão abre a ficha (barra "Restaurar para o banco").
- Vazia: "lixeira vazia" e o que fazer. Sem botão "esvaziar" nesta versão (nada se apaga sozinho); excluir de vez, se ela quiser, fica para depois.

## 8. Microcopy

### 8.1 Botões
Produzir · Banco · Lixeira · Revisar → · Aprovar · Ajustar · Enviar ajuste · Cancelar · Marquei como postado · Copiar legenda · ⧉ Copiar legenda ·
⧉ Copiar roteiro · Mudar horário · Usar · Voltar para o banco · Restaurar · Restaurar para o banco · Não vou postar este · Abrir banco de ideias (N) ·
Ver banco de ideias · Ver métricas → · Limpar filtros · escolher do banco → · ver no Instagram ↗ · Voltar para hoje · Abrir no Notion ↗ · Tentar de novo.

### 8.2 Toasts (topo, 5 s quando há Desfazer, 2,6 s sem)
| Ação | Toast |
|---|---|
| Produzir | "Na fila. Avisamos quando chegar" · com outra na fila: "Na fila (2 em produção). Avisamos quando chegar" · para outro dia: "… · para sex 9/10" — com **Desfazer**. Do Banco sem vaga: grava `data` = hoje (BRT) |
| Banco | "Guardada no banco de ideias" — Desfazer |
| Lixeira | "Foi para a Lixeira" — Desfazer |
| Restaurar | "De volta ao banco" — Desfazer |
| Aprovar | "Aprovado. Agora é postar." — Desfazer |
| Enviar ajuste | "Ajuste enviado. Avisamos quando voltar" — Desfazer |
| Marquei como postado | "Marcado como postado. Conta no dia de hoje." — Desfazer |
| Postado detectado (automático) | push/aviso "Detectado no Instagram: postado 19:42." |
| Mudar horário | "Agendado para hoje 20:00" — Desfazer |
| Copiar ok | "Copiado" |
| Copiar falhou | "Não deu para copiar sozinho. Texto selecionado: toque em Copiar" (erro) |

### 8.3 Erros
| Situação | Mensagem |
|---|---|
| Sem rede ao gravar | "Sem conexão. Guardei aqui e envio quando voltar." (reusa a fila offline `filaFlush`) |
| Transição recusada pelo banco | "Isso já mudou em outro lugar. Atualizei a tela." + recarrega a pauta |
| Falha ao carregar o Hoje | "Não consegui carregar o Hoje. Confira a conexão." + "Tentar de novo" |
| Imagem do slide não carrega | quadro cinza 4:5 com "slide N não carregou" |

Copiar: `navigator.clipboard.writeText` dentro do clique; no `catch`, o `<pre>` é expandido (abrindo o `<details>` pai) e todo selecionado com `Range`.

### 8.4 Push (rotinas)
- 05:47: "Hoje: 3 sugestões de estático e 3 de Reels. Escolha até as 10h." → `#/`
- Produção entregue: "Seu carrossel chegou: ‘A IA concorda com você…’. Revisar →" / "Seu roteiro de Reels chegou…" → `#/pauta/<id>`
- (Decisão 2 da seção 13) 10:00 sem escolha: "Ainda dá tempo: escolha 1 das sugestões de hoje." → `#/`
- Rotina falhou: sem push (o aviso fica no Hoje).

## 9. Status e transições

`ideia` · `sugerida` · `aprovada_producao` · `em_producao` · `para_revisar` · `ajustar` · `aprovado` · `postado` · `descartado`.
"Lixeira" é `descartado`; nenhum status novo.

### 9.1 Transições permitidas ao app (anon), validadas por trigger

| De | Para | Ação na interface | Colunas que o app grava junto |
|---|---|---|---|
| `sugerida` | `aprovada_producao` | Produzir | `aprovado_producao_em`, `decidido_em`, `data`/`agendado_para` (se vaga escolhida), `comentario`/`comentario_em` (se ajuste) |
| `sugerida` | `ideia` | Banco | `decidido_em` |
| `sugerida` | `descartado` | Lixeira | `decidido_em`, `descartado_em` |
| `ideia` | `aprovada_producao` | Produzir (banco) | idem ao 1º |
| `ideia` | `descartado` | Lixeira (banco) | `decidido_em`, `descartado_em` |
| `descartado` | `ideia` | Restaurar | — |
| `aprovada_producao` | `ideia` | Voltar para o banco (só antes de a rotina pegar) | — |
| `para_revisar` | `aprovado` | Aprovar | `revisado_em` |
| `para_revisar` | `ajustar` | Enviar ajuste | `revisado_em`, `comentario`, `comentario_em` |
| `para_revisar`, `aprovado` | `descartado` | Não vou postar este | `revisado_em`, `descartado_em` |
| `aprovado` | `postado` | Marquei como postado | `postado_em`, `postado_origem='manual'` |

Sem mudança de status, o app também grava `agendado_para` (Mudar horário) em qualquer pauta que não esteja `postado` ou `descartado`.
Tudo o mais é recusado para anon (inclusive `em_producao`, `para_revisar` e voltar de `postado`).
O Desfazer não precisa de transição reversa: o PATCH só sai depois dos 5 s (ou na hora, se a página for escondida; o Desfazer some).

### 9.2 Transições da rotina e do coletor (segredo / service role)
- Rotina: insere `sugerida`/`ideia` · `sugerida(dia anterior) → ideia` · `ideia → sugerida` (repropor) · `aprovada_producao → em_producao` ·
  `ajustar → em_producao` · `em_producao → para_revisar` · **`em_producao → aprovada_producao`** (produção falhou: volta à fila com `avisos`).
- Coletor `psn-ig-sync`: **`aprovado → postado`** com `postado_em` real, `ig_midia_id` e `postado_origem='auto'`.

### 9.3 Colunas que o anon pode escrever
`status`, `comentario`, `comentario_em`, `decidido_em`, `revisado_em`, `aprovado_producao_em`, `descartado_em`, `agendado_para`, `data`
(só ao produzir para uma vaga), `postado_em`, `postado_origem` (só `'manual'`) e, em `psn_pauta_dia`, só `visto_em` (uma vez por dia).
Conteúdo (tema, gancho, roteiro, cenas, legenda, slides) só pela rotina.

## 10. Campos para a migração `psn_pauta_v1`

### 10.1 `psn_pauta` (novos ou confirmados nesta versão)

| Campo | Tipo | Para quê |
|---|---|---|
| `formato` | text check (`'estatico'`,`'reels'`) | faixa do Hoje, vaga do Calendário; uma pauta = um formato (substitui o array `formatos`) |
| `ordem` | smallint | posição 1–3 da sugestão **dentro do formato** no dia. A ideia guarda a ordem antiga no Banco: o app só conta como "sugestão de hoje" quem tem `data` = hoje e está `sugerida` ou foi criada hoje (Produzir do Banco grava `data` = hoje e não pode aparecer na faixa) |
| `data` | date | dia da vaga (dia da sugestão; ao produzir para outro dia, o dia escolhido) |
| `agendado_para` | timestamptz | horário agendado (sugerido pela rotina, editável pela Duda) |
| `horario_sugerido` | timestamptz | horário calculado pela rotina com `psn_ig_horarios`; permite saber se `agendado_para` foi editado |
| `ig_midia_id` | text (fk lógica `psn_ig_midia`) | post do Instagram casado; link "ver no Instagram" |
| `postado_em` | timestamptz | horário real do post (coletor) ou do toque (manual) |
| `postado_origem` | text check (`'auto'`,`'manual'`) | mede o casamento automático |
| `decidido_em` | timestamptz | carimbo do portão 1 (Produzir, Banco ou Lixeira) |
| `aprovado_producao_em` | timestamptz | quando mandou produzir |
| `em_producao_em` | timestamptz | detecta produção travada (> 2 h) e alimenta a previsão |
| `produzido_em` | timestamptz | quando virou `para_revisar`; "chegou 08:24" |
| `revisado_em` | timestamptz | só portão 2 (Aprovar/Ajustar/Não vou postar) |
| `descartado_em` | timestamptz | ordena a Lixeira; "descartada ontem 18:20" |
| `valida_ate` | date | prazo de pautas de notícia |
| `angulo` | text | ideias do Notion só têm "Ângulo" |
| `confirmar` | text | "Precisa de você" (`[Duda: …]`) |
| `por_que` | jsonb `[{tipo:'sinal'\|'radar'\|'rodízio'\|'público'\|'degrau'\|'banco', texto}]` | cartão mostra só a 1ª razão |
| `cenas` | jsonb `[{t, c, f}]` (tempo, o que aparece, fala) | roteiro do Reels (sugestão e produzido); `roteiro_resumo` segue para os slides do estático |
| `dur` | text | duração estimada do Reels ("~36 s") |
| `comentario`, `comentario_em` | text, timestamptz | ajuste antes de produzir e Ajustar. **Avaliação:** `comentario` único basta na R1 (cada pauta tem 1 ciclo de ajuste na maioria dos casos). Trocar por `comentarios jsonb [{em, de:'duda'\|'rotina', fase, texto}]` na R2 se ela usar o Ajustar mais de uma vez por pauta; o app grava só o último e a rotina lê o último |
| `origem` | text | `'notion'` (backfill), `'rotina'` |
| `legenda`, `reels`, `deck`, `slides`, `avisos`, `fontes`, `estrutura`, `gancho`, `urgencia`, `linha`, `degrau`, `slug`, `tema`, `criado_em`, `atualizado_em`, `notion_url` | — | como no plano (seção 3) |

`formatos text[]` do plano sai: o formato é um por pauta, e ideias do Notion com os dois formatos entram como uma pauta por formato (ou a rotina escolhe um).

### 10.2 `psn_pauta_dia` (1 linha por dia)
`data`, `visto_em` (anon grava uma vez, `where visto_em is null`), `rotina_status` (`'ok'`/`'parcial'`/`'falhou'`), `gerado_em`,
`sinal` (texto curto do "ontem no Instagram"), `metricas` (resumo usado), `radar`, `avisos`.

### 10.3 `psn_ig_horarios` (nova)
`dia_semana smallint` (0–6), `hora smallint` (0–23), `valor numeric`, `fonte text check ('online_followers','historico')`, `calculado_em timestamptz`.
Chave `(dia_semana, hora, fonte)`; RLS: anon só lê; escrita só service role (padrão `psn_ig_*`). A tela escolhe as 2 faixas de maior `valor` por dia da semana da fonte mais confiável disponível.

### 10.4 Campos que cada tela precisa

| Tela | `psn_pauta` | `psn_pauta_dia` / outras |
|---|---|---|
| Hoje · placar | `status`, `formato`, `data`, `postado_em` | — |
| Hoje · faixas | `id`, `data`, `status`, `formato`, `tema`, `gancho`, `estrutura`, `urgencia`, `linha`, `degrau`, `por_que` (1ª), `confirmar`, `ordem`, `cenas` (contagem), `dur` | `rotina_status`, `gerado_em` |
| Hoje · revisar/postar | `slides` (4 primeiros) ou `cenas[0]`, `produzido_em`, `avisos`, `agendado_para` | — |
| Hoje · em produção | `aprovado_producao_em`, `em_producao_em`, `comentario`, `agendado_para` | — |
| Hoje · ontem no Instagram | — | `sinal`, `metricas` (ou `psn_ig_analise`) |
| Hoje · uso | — | `visto_em` |
| Calendário | `data`, `formato`, `status`, `tema`, `agendado_para`, `horario_sugerido`, `postado_em`, `ig_midia_id` | `psn_ig_horarios` |
| Ficha da sugestão | + `roteiro_resumo`, `cenas`, `por_que`, `fontes`, `valida_ate`, `angulo` | — |
| Ficha produzida | + `slides`, `legenda`, `cenas`, `avisos`, `deck`, `comentario`, `comentario_em`, `revisado_em`, `postado_origem` | — |
| Banco | `tema`, `angulo`, `gancho`, `formato`, `urgencia`, `linha`, `degrau`, `criado_em`, `valida_ate`, `status`, `origem`, `notion_url` | — |
| Lixeira | `tema`, `angulo`, `gancho`, `formato`, `descartado_em`, `status` | — |

### 10.5 Conferência contra o plano
- Rota do banco: `#/banco` (plano dizia `#/ideias-pauta`); nova `#/lixeira`; nova `#/calendario`.
- Triggers: acrescentar `aprovada_producao → ideia`, `descartado → ideia`, `em_producao → aprovada_producao`, `aprovado → postado` (coletor) e as colunas novas na lista do anon (9.3).
- Backfill do Notion: 4 pautas produzidas entram com `status='para_revisar'`, `origem='notion'`, `formato='estatico'`; o Hoje e o Calendário filtram `origem='notion'`. Ideias do Notion entram como `ideia`.
- Status: os 9 do plano bastam. "Atrasada", "travada" e "lixeira" são estados de tela ou rótulos de `descartado`, não status novos.

## 11. Padrão reutilizável: contrato do "cartão do Hoje"

Cada módulo migrado entra no Hoje por **uma função que devolve cartões**, nunca por uma aba nova:

```js
// hojeCartoes_<modulo>(dados, agora) -> Cartao[]
{
  modulo:   "pauta" | "ideias" | "producao" | "metricas" | ...,
  id:       "pauta:3f3d…",              // estável, para animar a saída
  faixa:    1..6,                        // 1 bloqueio · 2 postar/entregar · 3 revisar · 4 decidir · 5 acompanhar · 6 informar
  peso:     0..99,                       // desempate dentro da faixa (prazo mais perto = maior)
  estado:   "acao" | "espera" | "info" | "erro",
  titulo:   "…", sub: "…",
  acao:     { rotulo:"Produzir", tipo:"transicao"|"rota", alvo:"aprovada_producao"|"#/pauta/…" },
  acoes2:   [ … ],                       // no máx. 2, nunca destrutiva sem Desfazer
  previsao: "Pronto até ~08:30" | null,
  rota:     "#/pauta/…"                  // toque no corpo
}
```

Regras:
1. Só entra no Hoje o que pede ação **hoje** (faixas 1–4) ou uma única linha de acompanhamento/informação (5–6) por módulo.
2. Máx. 3 cartões por módulo **e por faixa** (as faixas Estático e Reels seguem esta regra: 3 cada); o resto vira "+N no <módulo> →".
3. Ação primária resolve em 1 toque ou abre a ficha; nunca abre formulário no Hoje.
4. Cartão some quando a ação é feita (com Desfazer) e vira linha-resumo até o fim do dia.
5. Faixa 1 (erro) explica de quem é o problema e qual o caminho alternativo, nunca só "erro".
6. Verde-ácido só na ação de ganho de cada cartão; um verde por cartão.
7. Cada módulo novo traz spec + protótipo com os 5 estados (com ação, esperando, pronto, vazio, falhou).
8. Tipografia: texto de conteúdo (gancho, título de pauta, número de ordem) sempre em Space Grotesk (títulos de seção em Bricolage Grotesque, como o app). Sem fonte serifada na interface.

Candidatos já visíveis:
- **Ideias (referências):** faixa 4, "3 referências analisadas esperando triagem →".
- **Produção (funil):** faixa 5, "1 ideia parada há 7 dias em ‘roteiro’ →".
- **Métricas:** faixa 6 (cartão "ontem no instagram"); faixa 1 se a coleta falhar 2 vezes ou o token estiver a < 30 dias de vencer (04/01/2027).

## 12. Decisões de UX tomadas (resumo)

1. Hoje substitui o diretório em `#/`; canais vão para `#/canais`; Calendário, Banco, Métricas e Canais por 4 atalhos no rodapé, Lixeira por um link; placar leva ao Calendário. Sem barra de abas.
2. Meta: mínimo 1 post/dia, ideal 1 estático + 1 Reels, todos os dias; placar "Hoje: Estático ✓/— · Reels ✓/—" + "Semana: N de 7 dias com post".
3. 3 sugestões de estático + 3 de Reels por dia, em duas faixas de rolagem horizontal com snap; header do Hoje rola com a página.
4. Destinos de cada sugestão: Produzir · Banco · Lixeira; Lixeira restaurável, nada se apaga sozinho; Desfazer de 5 s com gravação adiada.
5. Calendário semana/mês com 2 vagas por dia, status, horário sugerido, "postado" automático (coleta a cada 4 h) com reserva manual, histórico em meses passados, melhores horários do público no topo.
6. Reels produzido = roteiro em blocos + cenas + legenda, sem render; mesmo fluxo Aprovar/Ajustar/Postado do estático.
7. "Agendado para" editável por toque (3 opções rápidas + horário livre) na ficha.
8. Ordem por distância até "postado": postar > revisar > escolher > acompanhar > informar.
9. Ajuste antes de produzir: campo opcional só na ficha; Produzir do cartão continua 1 toque.
10. Comentário obrigatório no Ajustar, com 4 atalhos por formato.
11. Pode produzir mais de uma por dia, sem limite; o toast informa quantas estão na fila.
12. Sugestão não escolhida vira `ideia` na manhã seguinte (rotina). "Rotina falhou" só depois das 06:30; sem push de erro.
13. Banco: filtros U, L e formato, 3 ordens, prazo por `valida_ate`, grupo "mais de 30 dias", formato único por ideia.
14. Só tema claro (o app atual só tem claro); sem estado de fim de semana; sem fonte serifada na interface.

## 13. Decisões tomadas pela Duda em 08/10 (protótipo v2 aprovado)

1. **As 4 pautas já produzidas no Notion e nunca revisadas** ficam num grupo recolhido do Banco ("produzidas no Notion,
   nunca revisadas"), fora do Hoje e do Calendário. No backfill entram com `status='para_revisar'` e `origem='notion'`;
   Hoje e Calendário filtram `origem='notion'`.
2. **Lembrete das 10h:** sim, um só push por dia, todos os dias, só se nenhuma sugestão do dia foi escolhida.
3. **Botões do cartão de sugestão:** "Produzir" e "Banco" juntos num mesmo bloco (escolha entre os dois); a Lixeira vira só
   o ícone de lixeira em vermelho (`--alerta-texto`), sem texto, com `aria-label` e área de toque de 44 px. Nos cartões do
   Banco, "Produzir" + ícone da lixeira. Na ficha da pauta a Lixeira segue com texto.

Nota:
- O protótipo mostra 8 ideias reais no banco (as 11 do inventário menos 3 repropostas hoje como sugestão: "o que nunca colar", "seu chefe pergunta se você usa IA" e "errei 3 vezes com o ChatGPT") e 1 ideia real já na Lixeira como exemplo ("Pode usar IA no trabalho? 3 perguntas…"). As 6 sugestões de hoje, o histórico do Calendário (21/09 a 07/10), os "melhores horários" e os números de "ontem no Instagram" são exemplos montados a partir do sinal real de 08/10, do `PUBLICO.md` e do inventário, todos marcados "exemplo". A sugestão de estático 1 usa o deck editorial real (`ia-concorda-editorial`); os slides são desenhados em CSS com o texto do deck, não são os PNGs. Só ela (e os Reels) têm material produzido no protótipo.
- As fontes do carrossel desenhado (Inter, Covered By Your Grace) são do estilo editorial, ou seja, conteúdo do slide, não da interface.
