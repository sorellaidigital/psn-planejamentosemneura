# UX — tela "Hoje" e fluxo da Pauta em 2 portões

Especificação de produto para a R1/R2 do `docs/PLANO-CENTRAL.md` (seções 1–3).
Protótipo navegável: `prototipo-hoje.html` (scratchpad da sessão de 08/10/2026; publicar só com o ok da Duda).
Base de dados real: inventário do Notion "Pauta do Dia" de 08/10/2026.

## 0. Diagnóstico que orienta a spec

Inventário do Notion (19 linhas): 5 "Para revisar" (4 reais + 1 [TESTE]) com 48 PNGs, 14 "Ideia" (11 reais + 3 [TESTE]),
0 aprovadas, 0 postadas, 0 comentários. A rotina produz; ninguém revisa. A causa não é a qualidade do carrossel:
é que a decisão chega tarde (depois do trabalho feito), longe (no Notion, sem alerta acionável) e pesada
(10 PNGs para olhar antes de dizer "não é esse o tema").

A spec inverte isso: **a primeira coisa que a Duda vê é uma decisão barata** (escolher 1 de 3 temas),
e só depois chega o material pesado, que ela já pediu.

## 1. Objetivo e métrica-guia

**Objetivo:** o PSN é aberto todo dia e cada abertura termina com uma decisão tomada em menos de 2 minutos.

| Métrica | Definição | Fonte | Meta inicial |
|---|---|---|---|
| **Pautas postadas por semana** (guia) | `count(status='postado')` com `postado_em` na semana (seg–dom, BRT) | `psn_pauta` | 3 (ver decisão em aberto 1) |
| Escolha até 10h | % de dias úteis em que `decidido_em` da 1ª sugestão do dia ≤ 10:00 BRT | `psn_pauta` | ≥ 80% |
| Revisão até 10h do dia seguinte à entrega | % de pautas com `revisado_em − produzido_em` ≤ 24h | `psn_pauta` | ≥ 80% |
| Produzidas × postadas | `count(produzido_em) : count(postado_em)` em 30 dias | `psn_pauta` | perto de 1:1 |
| % de sugestões aprovadas | `aprovado_producao_em not null / sugeridas` em 30 dias | `psn_pauta` | 25–40% (abaixo disso, a rotina sugere mal) |
| Dias com o app aberto | dias com `psn_pauta_dia.visto_em` preenchido / dias úteis | `psn_pauta_dia` | ≥ 4 de 5 |

As 6 saem de colunas que o app já grava (status e carimbos de tempo). Nenhum rastreador externo.

## 2. Princípios

1. **Hoje é a única entrada.** `#/` abre o Hoje. Tudo o mais (banco, métricas, canais) é destino a partir dele, nunca aba concorrente.
2. **Ação em 1 toque.** Produzir · Guardar · Descartar; Aprovar · Postado. Texto só no Ajustar (obrigatório) e no ajuste antes de produzir (opcional).
3. **Sem confirmação, com Desfazer.** Toda ação mostra um toast de 5 s com "Desfazer". O app só grava depois dessa janela (ou na hora, se a página for escondida: `visibilitychange`). Confirmação modal custa 1 toque a mais todo dia; Desfazer custa 1 toque só quando ela erra.
4. **Celular primeiro.** 390 px, botão de ação a um polegar, barra fixa com `env(safe-area-inset-bottom)`; desktop é a mesma coluna centralizada (máx. 720 px).
5. **O app mostra, a rotina preenche.** Nada que a rotina já sabe é perguntado. O app só muda status, comentário e carimbos de tempo.
6. **Ordem por distância até "postado".** O que está mais perto de virar post aparece primeiro: postar > revisar > escolher > acompanhar > informar.
7. **Estado vazio digno.** Quando não há nada a fazer, o Hoje diz isso e diz o que vem depois. Sem tela em branco, sem "nenhum item".
8. **Medir uso.** Toda decisão tem carimbo (`decidido_em`, `revisado_em`, `postado_em`); a primeira abertura do dia carimba `psn_pauta_dia.visto_em`.

## 3. Mapa de telas e rotas

| Rota | Tela | Como chega |
|---|---|---|
| `#/` | **Hoje** | abrir o app; link do push; ← de qualquer tela |
| `#/pauta/<id>` | Ficha (sugestão ou pauta produzida, mesma rota, corpo muda pelo status) | toque num cartão; link do push "pronto para revisar" |
| `#/banco` | Banco de ideias | placar "no banco"; atalho no rodapé do Hoje; aviso de rotina falhou |
| `#/metricas` | Métricas (já existe) | cartão "ontem no instagram" e atalho |
| `#/canais` | Diretório de canais atual (Ideias de referência + Produção) | atalho "Canais" no rodapé do Hoje |
| `#/c/<id>` | Quadro do canal (já existe) | a partir de `#/canais` |
| `#/capturar?ref=` | Captura do Atalho do iPhone (já existe) | inalterada; ao fechar, volta para `#/canais` |

Mudanças no código existente: `renderHome()` vira `renderCanais()` em `#/canais`; o ← de Métricas e do quadro do canal volta
para `#/` (Hoje) e `#/canais` respectivamente. O botão "Métricas" sai do topo do diretório (passa a viver no Hoje).

**Como os módulos ficam acessíveis sem virar abas:** uma linha de 3 atalhos no fim do Hoje (Banco de ideias · Métricas · Canais),
mais os números do placar no header (tocar em "no banco" abre o banco). Não há barra de abas inferior: barra de abas convida a
"passear" e faz o Hoje competir com os módulos. O Hoje sempre puxa para o módulo só quando há algo nele (ver contrato na seção 10).

Nota de nome: o app já tem "Ideias" (referências de outros perfis). O banco de pautas chama "banco de ideias" na interface
porque é o termo da Duda; na rota e no código é `banco`. Ver decisão em aberto 3.

## 4. Tela Hoje

### 4.1 Estrutura (de cima para baixo)

1. **Header roxo (território):** selo PSN, "hoje", data e hora ("quinta, 8 de outubro · 07:12" em Instrument Serif) e placar:
   `postadas na semana N /3` (verde-ácido: é ganho) · `para revisar N` · `no banco de ideias N`.
2. **Bloqueios** (só se houver): rotina falhou; fim de semana.
3. **Falta postar** (`aprovado`): cartão com miniaturas, "Copiar legenda" e **"Postado ✓"**.
4. **Pronto para revisar** (`para_revisar`): cartão com 4 miniaturas, hora de chegada e resultado da conferência; ação **"Revisar →"**.
5. **Sugestões de hoje** (`sugerida` com `data = hoje`): até 3–5 cartões; cada um com **Produzir · Guardar · ✕**. Depois de decididas,
   viram linhas-resumo ("na fila de produção · tema", "no banco · tema", "descartada · tema"), tocáveis.
6. **Em produção** (`aprovada_producao`, `em_producao`, `ajustar`): trilha de 5 segmentos (escolhida · produzindo · revisar · aprovado · postado) e previsão.
7. **Tudo feito** (se 3–6 estiverem vazios e a rotina não falhou).
8. **Ontem no Instagram** (sempre): 3 números + "Sinal para a pauta" da análise das 05:23; "Ver métricas →".
9. **Atalhos:** Banco de ideias (N guardadas) · Métricas · Canais.

### 4.2 Cartão de sugestão

- Linha 1: número (1, 2, 3 em serifa bordô), formato(s), estrutura.
- Tema (título do cartão).
- Gancho da capa entre aspas, em serifa, com rótulo "CAPA ·".
- Chips: urgência (U + nome), linha (L + nome), degrau (D + nome).
- "Por quê:" 1ª razão, 2 linhas no máximo.
- "✋ Precisa de você: …" quando a rotina marcou algo que só ela sabe (o tempo real de uma tarefa, os 3 erros reais).
- Ações: **Produzir** (verde-ácido, maior) · **Guardar** (fantasma) · **✕** (descartar, ícone com `aria-label`).
- Tocar no corpo abre a ficha.

### 4.3 Estados

| Estado | Quando | O que aparece |
|---|---|---|
| **Manhã com sugestões** | dia útil, `psn_pauta_dia` do dia ok, há `sugerida` | header; "3 sugestões para hoje" + "Escolha 1 para produzir. O resto vai para o banco ou some. Escolhendo até 10h, fica pronto para postar hoje."; cartões; ontem no Instagram; atalhos |
| **Já escolheu** | há `aprovada_producao`/`em_producao` | resumo da escolha + "em produção": "Na fila da rodada das 08:00. **Pronto até ~08:30**" ou "A rotina das 08:00 está montando." Subtítulo: "Não precisa fazer nada. Avisamos no celular quando chegar." Se ainda há sugestões pendentes: "Quer mais uma? Produzir também funciona aqui." |
| **Pronto para revisar** | há `para_revisar` | bloco no topo: "O carrossel que você escolheu chegou. Revise até as 10h para postar hoje." (depois das 10h: "Revise para postar hoje.") |
| **Tudo feito** | nada a postar, revisar, escolher ou acompanhar | "✓ nada esperando você" · "O de hoje está postado. Amanhã às 05:47 chegam 3 sugestões novas, já pensadas a partir das métricas de hoje." · "N ideias guardadas no banco · N de 3 postadas nesta semana" · botão "Ver banco de ideias". Na sexta à noite: "Segunda às 05:47…" |
| **Sem sugestões (rotina falhou)** | dia útil, depois das 06:30, sem `psn_pauta_dia` do dia ou `rotina_status='falhou'`, e sem `sugerida` do dia | aviso bordô: "**As sugestões de hoje não chegaram.** A rotina das 05:47 não terminou. Não é nada com você: já ficou registrado e ela tenta de novo amanhã. Quer produzir algo hoje? Escolha uma do banco." + botão verde "Abrir banco de ideias (N)" |
| **Rotina atrasada** | dia útil, 05:47–06:30, sem sugestões | linha discreta: "As sugestões de hoje estão chegando." (sem alarme antes de 06:30) |
| **Fim de semana** | sáb/dom | aviso: "**Fim de semana, sem sugestões novas.** A próxima leva chega segunda às 05:47. Se mandar produzir algo do banco agora, fica pronto segunda até ~07:30." Pendências (postar/revisar) continuam aparecendo normalmente |

**Sugestões não escolhidas no dia:** às 05:47 do dia seguinte a rotina passa as `sugerida` antigas para `ideia` (banco), com
`origem` preservada. O Hoje nunca acumula sugestão velha. (Regra da rotina, não do app.)

### 4.4 Previsão de produção

Rotina "Produção da Pauta" de hora em hora, seg–sex, 07h–20h BRT (plano, seção 2), ~30 min por carrossel.
Previsão = próxima hora cheia dentro da janela + 30 min. Fora da janela: próximo dia útil 07:30.
Texto: "Pronto até ~08:30" / "Pronto segunda ~07:30". Se `em_producao` passar de 2 h sem virar `para_revisar`:
"Está demorando mais que o normal. Se não chegar até HH:MM, a rotina tenta de novo." (precisa de `em_producao_em`).
Se a decisão técnica for 3 janelas fixas (08:30, 12:30, 16:30), só a função de previsão muda.

## 5. Ficha da sugestão (`#/pauta/<id>`, status `sugerida` ou `ideia`)

Header: ← (volta ao Hoje ou ao banco, conforme a origem) · "Sugestão" · status e data.

Corpo, nesta ordem:
1. Chips (formato, estrutura, U, L, D).
2. Tema (Bricolage 27 px).
3. **Gancho da capa** (serifa grande).
4. **O que cada slide diz** (lista numerada, 5–8 itens; chip "N slides").
5. **Por quê** (lista com rótulo: sinal · radar · rodízio · público · degrau).
6. **Fontes.**
7. **Precisa de você** (aviso bordô), se houver.
8. **Prazo** ("só faz sentido até 10/10"), se houver `valida_ate`.
9. **Ajuste antes de produzir (opcional)**: campo de 2 linhas, placeholder "Ex.: troca o exemplo por um de RH",
   dica "A rotina lê isto antes de montar. Deixe em branco para produzir como está."

Barra fixa: **✕** · **Guardar** (só em `sugerida`) · **Produzir**.
Em `aprovada_producao`: barra com "Voltar para o banco" (desiste antes de a rotina pegar). Em `descartado`: "Restaurar para o banco".

Ideia do banco sem roteiro (as 11 do Notion só têm ângulo): mostra **Ângulo** no lugar do gancho/roteiro, com a dica
"Ideia guardada sem roteiro: a produção monta gancho e slides a partir do ângulo."

**Decisão: sim, pode pedir ajuste na sugestão, mas só como campo opcional na ficha, nunca no cartão.**
Por quê: (a) o ajuste mais comum ("troca o exemplo", "foca no Copilot") custa 10 segundos antes e uma volta inteira de produção
(~1 h + nova revisão) depois; (b) mantém o Produzir do cartão em 1 toque para o caso normal; (c) não cria um 3º portão
(a rotina não reescreve a sugestão para nova aprovação: o ajuste vai direto para a produção). O texto vai para `comentario`
(+ `comentario_em`) junto com a transição `sugerida/ideia → aprovada_producao`; a produção lê `comentario` quando o status é
`aprovada_producao`.

## 6. Ficha da pauta produzida (`#/pauta/<id>`, status `para_revisar`, `ajustar`, `aprovado`, `postado`)

1. **Faixa de status**: chip ("pronto para revisar"), "chegou 08:24", trilha de 5 segmentos.
2. Tema + chips.
3. **Tira deslizante** de slides 4:5 (scroll-snap horizontal, 82% da largura no celular para mostrar a borda do próximo;
   300 px no desktop), contador "3 de 11" e pontos. Imagens `slides[].path` do bucket `psn-pautas`, `loading="lazy"` a partir do 3º.
   Tocar num slide abre em tela cheia (R2; o protótipo não faz).
4. Linha de QA: "Conferência automática: 0 erro, 0 aviso · estilo editorial · 1080×1350" (de `avisos`/`conferir`). Se houver ✘ ou ⚠,
   aviso bordô com a lista.
5. **Legenda** com "⧉ Copiar legenda" (ver 8.3 para a cópia).
6. **Roteiro do Reels** (se `formatos` inclui Reels) com "⧉ Copiar".
7. "Proposta original e fontes" recolhido (gancho, fontes, ajuste pedido antes de produzir).
8. "Não vou postar este" (botão de risco, fim da página) → `descartado`.

Barra fixa por status:

| Status | Barra |
|---|---|
| `para_revisar` | **Ajustar** (fantasma) · **Aprovar** (verde) |
| `ajustar` | sem barra; aviso "Ajuste pedido. A rotina refaz e avisa quando voltar." + comentário citado |
| `aprovado` | **Copiar legenda** · **Postado ✓** |
| `postado` | sem barra; faixa com "postado 17:52" |

**Ajustar** abre um painel na própria página (sem modal): "O que mudar?", 4 atalhos que preenchem o texto
("Troca o gancho da capa", "Outra foto na capa", "Mais curto", "Tom mais leve"), campo livre, "Cancelar" · "Enviar ajuste"
(desabilitado com campo vazio). Comentário é obrigatório no Ajustar: sem ele a rotina não sabe o que refazer.

## 7. Banco de ideias (`#/banco`)

- Header: ← · "Banco de ideias" · "N guardadas · produzir a qualquer dia".
- **Filtros mínimos:** 2 selects lado a lado: urgência (Todas + U01–U10) e linha (Todas + L1–L5). Sem filtro de degrau/formato
  (com 11–30 itens, mais filtros custam mais que rolar).
- **Ordenar** (segmentado): recentes (padrão) · com prazo (por `valida_ate`, mais urgente primeiro) · antigas.
- Cartão: tema, ângulo/gancho em 2 linhas, chips de prazo, idade ("hoje", "ontem", "há 5 dias"), U, L e D (D só se ≠ D0).
  Ações à direita: **Produzir** e **✕**.
- **Prazo:** `valida_ate` ≤ 3 dias → chip vermelho "vale até 10/10"; vencido → "passou do prazo (10/10)".
  Inventário real tem 2 casos ("Gemini grátis muda dia 9", "Gems somem em 20/10").
- **Envelhecimento:** ideia com mais de 30 dias no banco desce para o grupo "mais de 30 dias · N", com borda tracejada e chip
  "há 40 dias · ainda vale?" e a dica "Ideia parada há mais de um mês: produza ou descarte." Sem exclusão automática.
  A rotina da manhã pode repropor uma ideia velha (vira `sugerida` de novo, mesmo `id`), e aí ela sai do grupo.
- Grupo recolhido **"produzidas no Notion, nunca revisadas · 4"** (ver decisão em aberto 2), com "Abrir no Notion ↗" e ✕.
- Grupo recolhido **"descartadas · N"** com "Restaurar" (`descartado → ideia`), últimos 30 dias.
- Vazio com filtro: "Nenhuma ideia com esse filtro." + "Limpar filtros". Banco vazio: "Banco vazio. As sugestões que você guardar aparecem aqui."

Produzir do banco funciona igual ao da sugestão (vai para `aprovada_producao`, aparece no Hoje em "em produção").

## 8. Microcopy

### 8.1 Botões
Produzir · Guardar · ✕ (aria: "Descartar sugestão N") · Revisar → · Aprovar · Ajustar · Enviar ajuste · Cancelar ·
Postado ✓ · Copiar legenda · ⧉ Copiar · Voltar para o banco · Restaurar · Restaurar para o banco · Não vou postar este ·
Abrir banco de ideias (N) · Ver banco de ideias · Ver métricas → · Limpar filtros · Abrir no Notion ↗ · Tentar de novo.

### 8.2 Toasts (topo, 5 s quando há Desfazer, 2,6 s sem)
| Ação | Toast |
|---|---|
| Produzir | "Na fila. Pronto até ~08:30" · com outra já na fila: "Na fila (2 em produção). Pronto até ~08:30" · fora da janela: "Na fila. Pronto segunda ~07:30" — com **Desfazer** |
| Guardar | "Guardada no banco de ideias" — Desfazer |
| Descartar | "Descartada" — Desfazer |
| Aprovar | "Aprovado. Agora é postar." — Desfazer |
| Enviar ajuste | "Ajuste enviado. Volta até ~11:30" — Desfazer |
| Postado | "Postado! Conta na meta da semana." — Desfazer |
| Restaurar | "De volta ao banco" — Desfazer |
| Copiar ok | "Copiado" |
| Copiar falhou | "Não deu para copiar sozinho. Texto selecionado: toque em Copiar" (erro) |

### 8.3 Erros
| Situação | Mensagem |
|---|---|
| Sem rede ao gravar | "Sem conexão. Guardei aqui e envio quando voltar." (reusa a fila offline `filaFlush` do app) |
| Transição recusada pelo banco (outra aba/rotina mudou antes) | "Isso já mudou em outro lugar. Atualizei a tela." + recarrega a pauta |
| Falha ao carregar o Hoje | "Não consegui carregar o Hoje. Confira a conexão." + "Tentar de novo" |
| Imagem do slide não carrega | quadro cinza 4:5 com "slide N não carregou" (a legenda continua copiável) |

Copiar: `navigator.clipboard.writeText` dentro do clique; no `catch` (ou sem API), o `<pre>` da legenda é expandido e todo
selecionado com `Range`, para ela usar o "Copiar" do sistema.

### 8.4 Push (rotinas)
- 05:47: "Hoje: 3 sugestões de pauta. Escolha 1 até as 10h." → `#/`
- Produção entregue: "Seu carrossel chegou: ‘A IA concorda com você…’. Revisar →" → `#/pauta/<id>`
- (Decisão em aberto 4) 10:00 sem escolha: "Ainda dá tempo: escolha 1 das 3 sugestões de hoje." → `#/`
- Rotina falhou: sem push (o aviso fica no Hoje; push de erro às 6h só gera ansiedade).

## 9. Status e transições

`ideia` · `sugerida` · `aprovada_producao` · `em_producao` · `para_revisar` · `ajustar` · `aprovado` · `postado` · `descartado`.

### 9.1 Transições permitidas ao app (anon), validadas por trigger

| De | Para | Ação na interface | Colunas que o app grava junto |
|---|---|---|---|
| `sugerida` | `aprovada_producao` | Produzir | `aprovado_producao_em`, `decidido_em`, `comentario`/`comentario_em` (se ajuste) |
| `sugerida` | `ideia` | Guardar | `decidido_em` |
| `sugerida` | `descartado` | ✕ | `decidido_em` |
| `ideia` | `aprovada_producao` | Produzir (banco) | `aprovado_producao_em`, `decidido_em`, `comentario`/`comentario_em` |
| `ideia` | `descartado` | ✕ (banco) | `decidido_em` |
| `aprovada_producao` | `ideia` | Voltar para o banco (só antes de a rotina pegar) | — |
| `para_revisar` | `aprovado` | Aprovar | `revisado_em` |
| `para_revisar` | `ajustar` | Enviar ajuste | `revisado_em`, `comentario`, `comentario_em` |
| `para_revisar`, `aprovado` | `descartado` | Não vou postar este | `revisado_em` |
| `aprovado` | `postado` | Postado ✓ | `postado_em` |
| `descartado` | `ideia` | Restaurar | — |

Tudo o mais é recusado para anon (inclusive `em_producao`, `para_revisar` e voltar de `postado`).
O Desfazer não precisa de transição reversa: o PATCH só sai depois dos 5 s. Exceção: se a página for escondida durante
a janela, o PATCH sai na hora e o Desfazer some.

### 9.2 Transições da rotina (segredo)
insere `sugerida`/`ideia` · `sugerida(dia anterior) → ideia` · `ideia → sugerida` (repropor) · `aprovada_producao → em_producao` ·
`ajustar → em_producao` · `em_producao → para_revisar` · `em_producao → aprovada_producao` (falhou, tenta na próxima rodada, com `avisos`).

### 9.3 Colunas que o anon pode escrever
`status`, `comentario`, `comentario_em`, `decidido_em`, `revisado_em`, `aprovado_producao_em`, `postado_em`
e, em `psn_pauta_dia`, só `visto_em` (uma vez por dia). Conteúdo (tema, gancho, roteiro, legenda, slides) só pela rotina.

## 10. Campos que cada tela precisa (para a migração `psn_pauta_v1`)

| Tela | `psn_pauta` | `psn_pauta_dia` |
|---|---|---|
| Hoje · header | `status`, `postado_em` | — |
| Hoje · sugestões | `id`, `data`, `status`, `tema`, `gancho`, `estrutura`, `formatos`, `urgencia`, `linha`, `degrau`, `por_que` (1ª razão), `confirmar`, `ordem` | `data`, `rotina_status`, `gerado_em` |
| Hoje · revisar/postar | `slides` (4 primeiros), `produzido_em`, `avisos` | — |
| Hoje · em produção | `aprovado_producao_em`, `em_producao_em`, `comentario` | — |
| Hoje · ontem no Instagram | — | `sinal`, `metricas` (alcance, salvos, compart.) — ou ler `psn_ig_analise` direto |
| Hoje · uso | — | `visto_em` |
| Ficha da sugestão | + `roteiro_resumo`, `por_que` (lista com tipo), `fontes`, `valida_ate`, `angulo` | — |
| Ficha produzida | + `slides`, `legenda`, `reels`, `avisos`, `deck` (estilo), `comentario`, `comentario_em`, `revisado_em`, `postado_em` | — |
| Banco | `tema`, `angulo`, `gancho`, `urgencia`, `linha`, `degrau`, `formatos`, `criado_em`, `valida_ate`, `status`, `origem`, `notion_url` | — |

### 10.1 Conferência contra o plano (seção 3) — o que falta ou muda

| Item | Situação no plano | Proposta |
|---|---|---|
| `decidido_em` | **falta** | carimbo do portão 1 (Produzir, Guardar ou Descartar). Sem ele, "% escolha até 10h" mistura com o portão 2 |
| `revisado_em` | existe | fica só para o portão 2 (Aprovar/Ajustar/Não vou postar) |
| `produzido_em` | **falta** | quando virou `para_revisar`: mostra "chegou 08:24", mede lead time e "produzidas × postadas" |
| `em_producao_em` | **falta** | detecta produção travada (> 2 h) e alimenta a previsão |
| `valida_ate date` | **falta** | prazo de pautas de notícia (2 das 11 ideias reais têm prazo no texto) |
| `angulo text` | **falta** | as 11 ideias reais só têm "Ângulo" (campo `resumo` do Notion); não cabe em `gancho` nem em `por_que` |
| `confirmar text` | **falta** | "Precisa de você" (marcadores `[Duda: …]` das pautas reais) |
| `ordem smallint` | **falta** | posição 1–3 da sugestão no dia (a rotina ordena pela força do sinal) |
| `por_que` | `text` | preferir `jsonb` `[{tipo:"sinal"|"radar"|"rodízio"|"público"|"degrau", texto}]` para o cartão mostrar só a 1ª razão |
| `psn_pauta_dia.rotina_status`, `gerado_em` | não detalhado | `ok`/`parcial`/`falhou` + hora: distingue "atrasada" de "falhou" |
| `psn_pauta_dia.sinal` | "métricas usadas" | texto curto do sinal (o cartão "ontem no Instagram" não precisa abrir `psn_ig_analise`) |
| `psn_pauta_dia.visto_em` | **falta** | 1ª abertura do Hoje no dia; anon grava uma vez (`where visto_em is null`) |
| Transições `aprovada_producao → ideia` e `descartado → ideia` | não listadas | incluir no trigger (Voltar para o banco, Restaurar) |
| Transição `em_producao → aprovada_producao` | não listada | falha de produção volta para a fila com `avisos` |
| Rota do banco | `#/ideias-pauta` | `#/banco` (curta; "ideias" já é nome do módulo de referências) |
| Comentário único | `comentario` sobrescreve | aceitável na R1; se a Duda usar Ajustar mais de uma vez por pauta, trocar por `comentarios jsonb` (histórico) na R2 |

Status: os 9 do plano bastam; nenhum status novo. "Atrasada" e "travada" são estados de tela derivados de carimbos, não status.

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
2. Máx. 3 cartões por módulo; o resto vira "+N no <módulo> →".
3. Ação primária resolve em 1 toque ou abre a ficha; nunca abre formulário no Hoje.
4. Cartão some quando a ação é feita (com Desfazer) e vira linha-resumo até o fim do dia.
5. Faixa 1 (erro) explica de quem é o problema e qual o caminho alternativo, nunca só "erro".
6. Verde-ácido só na ação de ganho de cada cartão; um verde por cartão.
7. Cada módulo novo traz spec + protótipo com os 5 estados (com ação, esperando, pronto, vazio, falhou).

Candidatos já visíveis:
- **Ideias (referências):** faixa 4, "3 referências analisadas esperando triagem →" (só se `mec_status='processada'` e não triada).
- **Produção (funil):** faixa 5, "1 ideia parada há 7 dias em ‘roteiro’ →".
- **Métricas:** faixa 6 (o cartão "ontem no Instagram"); faixa 1 se a coleta falhar 2 vezes ou o token estiver a < 30 dias de vencer (04/01/2027).

## 12. Decisões de UX tomadas (resumo)

1. Hoje substitui o diretório em `#/`; canais vão para `#/canais`; módulos acessíveis por 3 atalhos no rodapé + placar, sem barra de abas.
2. Ordem por distância até "postado": postar > revisar > escolher > acompanhar > informar.
3. Sem modal de confirmação; Desfazer de 5 s com gravação adiada.
4. Ajuste antes de produzir: campo opcional só na ficha; Produzir do cartão continua 1 toque.
5. Comentário obrigatório no Ajustar, com 4 atalhos que preenchem o texto.
6. Pode produzir mais de uma por dia, sem limite; o toast informa quantas estão na fila.
7. Sugestão não escolhida vira `ideia` automaticamente na manhã seguinte (rotina).
8. "Rotina falhou" só depois das 06:30; antes disso é "chegando". Sem push de erro.
9. Fim de semana: sem sugestões, pendências continuam, previsão aponta segunda 07:30.
10. Banco: 2 filtros (U, L), 3 ordens, prazo por `valida_ate`, grupo "mais de 30 dias" sem exclusão automática, descartadas restauráveis.
11. Placar do header mede a métrica-guia (postadas/semana) em verde-ácido.
12. Tema claro como o app + tema escuro por tokens (o app hoje só tem claro; o escuro fica pronto, não obrigatório na R1).

## 13. Decisões em aberto para a Duda (com recomendação)

1. **Meta de postadas por semana** (aparece no placar "N /3").
   Recomendo **3** (seg, qua, sex): é o que cabe com revisão em 2 minutos e já é 3× o que foi postado do Notion até hoje.
2. **As 4 pautas já produzidas no Notion e nunca revisadas** (39 PNGs, estilo padrão antigo).
   Opções: (a) entram no Hoje como "para revisar"; (b) ficam num grupo recolhido do banco; (c) descartar todas.
   Recomendo **(b)**: no Hoje elas viram 4 cartões de revisão no primeiro dia e enterram as sugestões novas; estão no estilo
   que foi substituído pelo editorial. No backfill entram com `status='para_revisar'` e `origem='notion'`, e o Hoje filtra `origem='notion'`.
3. **Nome do banco**: "banco de ideias" (sua palavra) convive com o módulo "Ideias" de referências.
   Recomendo **manter "banco de ideias"** e renomear o atalho do diretório para **"Canais"** com subtítulo "referências e funil"
   (como no protótipo), para não haver dois lugares chamados "Ideias" no Hoje.
4. **Lembrete das 10h** se nenhuma sugestão foi escolhida.
   Recomendo **sim, só um push, só em dia útil, só se não houver escolha**: é o ponto em que a pauta do dia ainda dá tempo de sair.
   Desligável depois se incomodar.

Nota:
- O protótipo mostra as 11 ideias reais do banco (as 14 "Ideia" do Notion menos 3 [TESTE]); as 3 sugestões de hoje são exemplos plausíveis montados a partir do sinal real de 08/10 e do inventário, marcadas "exemplo". A sugestão 1 usa o deck editorial real (`ia-concorda-editorial`); os slides são desenhados em CSS com o texto do deck, não são os PNGs.
- O tema escuro do protótipo é novo; o app atual só tem tema claro. Levar o escuro para o app é opcional e não entra na R1 sem o ok dela.
