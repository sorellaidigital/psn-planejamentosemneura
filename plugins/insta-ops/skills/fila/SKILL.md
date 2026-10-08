---
name: fila
description: |
  Processa a fila de ideias salvas no app Planejamento sem Neura: lista as ideias pendentes ou com erro em canais de finalidade 'ideias', captura e analisa cada post (Instagram ou TikTok) usando o mesmo procedimento de ref-ig, e grava o resultado no Supabase para aparecer na ficha da ideia. Use quando a pessoa disser "processar a fila", "processar ideias salvas", "rodar o mecanismo", "roda as referências pendentes", "tem ideia nova pra processar?". Roda no PC (usa Chrome local para Instagram quando disponível; TikTok funciona em qualquer sessão via oEmbed).
argument-hint: "[--manual] [--limite N] [--canal <nome|@handle>]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(mkdir *), Bash(mktemp *), Bash(ls *), Bash(cp *), Bash(curl *), Bash(file *), Bash(python3 *), ToolSearch, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__tabs_close_mcp
---

# fila: processar a fila de ideias salvas

Lê as ideias pendentes do app Planejamento sem Neura e processa cada uma com o mesmo procedimento de `/insta-ops:ref-ig`, item a item, sem parar no primeiro erro.

## 0. Config

`supabase_url` = `${user_config.supabase_url}`, `supabase_anon_key` = `${user_config.supabase_anon_key}`.

Se algum vier vazio, ou aparecer literalmente como `${user_config.supabase_url}` / `${user_config.supabase_anon_key}`, pergunte em uma linha os dois valores e diga que dá para fixar com `/plugin configure insta-ops`.

Headers em toda chamada REST: `apikey: <supabase_anon_key>`, `Authorization: Bearer <supabase_anon_key>`.

## 1. Opções

Ler `$ARGUMENTS`:

- `--manual`: força modo manual para todo item do Instagram (não tenta Chrome).
- `--limite N`: processa no máximo N ideias (padrão: todas as pendentes).
- `--canal <nome|@handle>`: só ideias do canal cujo `nome` ou `handle` bate (case-insensitive, substring).

## 2. Listar a fila

```
GET {supabase_url}/rest/v1/psn_ideias?select=id,titulo,referencia,por_que,foco,serie,plataforma,mec_status,criado_em,criador:psn_criadores!inner(id,nome,handle,nicho,tipo_conteudo,finalidade)&criador.finalidade=eq.ideias&mec_status=in.(pendente,erro,processando)&order=criado_em.asc
```

Ideias em `processando` só aparecem aqui se uma execução anterior foi interrompida no meio; entram na fila de novo como se fossem `pendente`.

Se `--canal` foi passado, filtrar o resultado localmente por `nome` ou `handle`. Aplicar `--limite` cortando a lista (mantendo a ordem).

Se a lista vier vazia: avisar "fila vazia, nada pra processar" e parar.

Mostrar uma tabela compacta antes de começar:

| canal | tipo | título | plataforma | status | foco | por que |
|---|---|---|---|---|---|---|
| @handle | ideia ou utilidade | título (truncado a 40) | instagram | pendente | foco (e série) ou "—" | por_que (truncado a 40) ou "—" |

`tipo` = `utilidade` se `criador.tipo_conteudo = utilidade`, senão `ideia`. Utilidade não tem foco: mostrar "—".

## 3. Checar Chrome

Rodar uma vez, antes do loop: `ToolSearch` com `select:mcp__claude-in-chrome__tabs_context_mcp`. Se não vier nenhuma ferramenta e `--manual` não foi passado, avisar que o Chrome não está disponível nesta sessão: itens de TikTok seguem normalmente (oEmbed), itens de Instagram serão pulados (ficam `pendente`) a menos que a pessoa peça `--manual` ou rode isso no PC com Chrome. Perguntar se ela quer continuar assim, mudar para `--manual` agora, ou parar.

## 4. Processar cada ideia

Para cada ideia da lista, na ordem:

1. Se `plataforma = instagram` e Chrome indisponível e `--manual` não foi pedido: pular (deixar `pendente`), anotar no resumo final, ir para a próxima.
2. Executar o procedimento de `/insta-ops:ref-ig` (seções 2 a 6 daquela skill, que já começa marcando `processando`: captura, modo manual se aplicável, análise, upload de imagens, upsert em `psn_referencias`, e o PATCH final de `processada` ou `erro`) usando `ideia_id = id`, `referencia`, `plataforma`, `por_que`, `foco`, `serie` e os dados do `criador` (handle, nicho, tipo_conteudo) já obtidos na listagem — não repetir a consulta. Passe `--manual` adiante se foi pedido nesta chamada de `fila`.
3. Continuar para a próxima ideia independentemente do resultado (sucesso, erro ou pulada). Nunca parar a fila inteira por causa de uma ideia.

## 5. Resumo final

Responder com:

- Quantas processadas com sucesso, em duas listas separadas: **ideias** (autor, formato e foco de cada uma, uma linha) e **utilidades** (autor e `tema` do aprendizado, uma linha).
- Quantas com erro, motivo curto de cada uma.
- Quantas puladas (Instagram sem Chrome), com a sugestão de rodar no PC ou com `--manual`.
- Itens relevantes de `nao_capturado` que apareceram (agrupado, sem repetir por post).

Nada de resumo longo. Direto ao ponto.

## Regras

1. **Nunca travar a fila.** Erro em uma ideia não impede as seguintes.
2. **Sempre marcar `processando` antes de tentar**, para o app poder mostrar que está em andamento.
3. **Reaproveitar dados já lidos.** Não repetir consultas ao canal ou à ideia dentro do mesmo processamento; use o que veio na listagem do passo 2.
4. Demais regras de captura e análise são as de `skills/ref-ig/SKILL.md` (skill `/insta-ops:ref-ig`) e suas referências (`protocolo-chrome.md`, `protocolo-tiktok.md`, `analise.md`, `utilidade.md`, `modelo-referencia.md`) — não duplicar aqui, seguir aqueles arquivos.
