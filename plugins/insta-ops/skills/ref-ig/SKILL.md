---
name: ref-ig
description: |
  Processa um post do Instagram ou TikTok como referência: captura (Chrome, manual ou oEmbed conforme a plataforma), analisa gancho/estrutura/CTA/slides, envia as imagens para o Supabase Storage e grava o resultado em psn_referencias. Use quando a pessoa colar um link solto de instagram.com/p/, /reel/ ou tiktok.com, ou disser "salva esse post", "guarda essa referência", "adiciona no meu banco de referências", "esse post é bom, anota". Também é chamada item a item por /insta-ops:fila ao processar a fila de ideias. Funciona sem Chrome no modo manual (Instagram) ou por oEmbed (TikTok).
argument-hint: "<url> [<url> ...] | --manual"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(mkdir *), Bash(mktemp *), Bash(ls *), Bash(cp *), Bash(curl *), Bash(file *), Bash(python3 *), ToolSearch, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__tabs_close_mcp
---

# ref-ig: processar um post como referência

Transforma um post do Instagram ou TikTok em uma referência gravada em `psn_referencias`: legenda e slides verbatim, gancho, estrutura, CTA e uma análise no contexto do canal que salvou a ideia.

Não publica nada, não analisa o perfil do autor, não guarda dado de terceiro além do @ público de quem publicou o post.

## 0. Config

`supabase_url` = `${user_config.supabase_url}`, `supabase_anon_key` = `${user_config.supabase_anon_key}`.

Se algum vier vazio, ou aparecer literalmente como `${user_config.supabase_url}` / `${user_config.supabase_anon_key}`, pergunte em uma linha os dois valores (a mesma URL e chave anon do app Planejamento sem Neura) e diga que dá para fixar com `/plugin configure insta-ops`. Use só nesta execução.

Toda chamada REST leva os headers `apikey: <supabase_anon_key>` e `Authorization: Bearer <supabase_anon_key>`.

## 1. Entrada

Esta skill é chamada de dois jeitos:

**a) Com uma ideia já identificada** (chamada por `/insta-ops:fila`, que passa `ideia_id`, `referencia`, `plataforma`, `por_que` e os dados do canal). Pule para a seção 2.

**b) Com uma URL solta** (`$ARGUMENTS`), colada pela pessoa fora da fila. Nesse caso:

1. Extrair a URL de `$ARGUMENTS`. Determinar `plataforma` pela mesma regra do banco: contém `instagram.com`/`instagr.am` → `instagram`; contém `tiktok.com` → `tiktok`; senão → `outro`.
2. Se `plataforma = outro`: avisar que só Instagram e TikTok são suportados e parar.
3. Verificar duplicidade: comparar a URL (por shortcode do Instagram ou id de vídeo do TikTok, não a string exata) com ideias existentes. `GET {supabase_url}/rest/v1/psn_ideias?select=id,referencia,criador:psn_criadores!inner(finalidade)&criador.finalidade=eq.ideias&referencia=ilike.*<trecho-do-shortcode-ou-id>*`. Se achar uma ideia com esse post e ela já tem `psn_referencias` (`GET {supabase_url}/rest/v1/psn_referencias?ideia_id=eq.<id>&select=id`), avisar a pessoa que já existe e oferecer reprocessar (voltar a `mec_status: pendente` e seguir) em vez de criar de novo.
4. Sem duplicidade: `GET {supabase_url}/rest/v1/psn_criadores?finalidade=eq.ideias&select=id,nome,handle,nicho,tipo_conteudo`. Se vazio, avisar que não há canal de ideias configurado no app e parar. Se houver só um, use-o. Se houver mais de um, pergunte em uma linha qual canal (liste nome/handle das opções).
5. Se `por_que` não foi dado junto com a URL, pergunte uma vez, em uma linha: "por que isso chamou sua atenção?". Se a pessoa não responder ou disser "depois", siga com `por_que: null`.
6. `POST {supabase_url}/rest/v1/psn_ideias` com `Prefer: return=representation`, corpo `{"criador_id": <id>, "titulo": <título curto derivado da legenda ou do link>, "referencia": <url>, "por_que": <resposta ou null>}`. O trigger do banco preenche `plataforma` e `mec_status: pendente`. Guardar o `id` retornado como `ideia_id`.

A partir daqui, o fluxo é o mesmo dos dois casos: você tem `ideia_id`, `referencia`, `plataforma`, `por_que` e os dados do canal (`handle`, `nicho`, `tipo_conteudo`) — busque os dados do canal se ainda não os tiver (`GET {supabase_url}/rest/v1/psn_ideias?id=eq.<ideia_id>&select=referencia,por_que,plataforma,criador:psn_criadores(handle,nicho,tipo_conteudo)`).

## 2. Marcar processando

`PATCH {supabase_url}/rest/v1/psn_ideias?id=eq.<ideia_id>` com `Prefer: return=minimal`, corpo `{"mec_status":"processando"}`.

Qualquer falha a partir daqui (captura, análise, upload, upsert) leva à seção 6 (erro), nunca deixa a ideia parada em `processando`.

## 3. Captura

- `plataforma = instagram`: siga `${CLAUDE_SKILL_DIR}/references/protocolo-chrome.md` se `mcp__claude-in-chrome__*` estiver disponível e `--manual` não foi pedido; senão siga a seção 4 (modo manual).
- `plataforma = tiktok`: siga `${CLAUDE_SKILL_DIR}/references/protocolo-tiktok.md` (funciona com ou sem Chrome).
- `plataforma = outro`: seção 6, motivo `"plataforma não suportada"`.

Ao final você deve ter: `post_id`, `url` canônica, `autor`, `formato`, `n_slides`, textos dos slides na ordem de leitura, imagens baixadas para um diretório temporário, `data_publicacao`, `curtidas`, `comentarios`, `views` (quando aplicável) e `fonte`.

## 4. Modo manual (só Instagram, sem Chrome)

Peça em UMA mensagem: URL do post, @ do autor, legenda colada, formato (carrossel, reel ou imagem), prints dos slides como arquivos (arrastar cada arquivo para o terminal cola o caminho) ou o texto de cada um, e o que a pessoa souber de data de publicação, curtidas e comentários.

Prints com caminho de arquivo: copie com `cp` para um diretório temporário (`mktemp -d`), na ordem dos slides, nomeando `NN.<extensão original>`, e leia cada um com Read para transcrever. Print colado direto no chat, sem arquivo: transcreva dele, não haverá `imagem_path` para esse slide, e registre `{"item":"imagem_NN","motivo":"colada no chat, sem arquivo"}`.

`fonte: manual`.

## 5. Análise, upload e gravação

1. Siga `${CLAUDE_SKILL_DIR}/references/analise.md` para preencher `gancho`, `tipo_gancho`, `estrutura`, `cta`, `tipo_cta`, `palavra_chave`, `tags` e o objeto `analise` (incluindo `o_que_reaproveitar` no contexto do canal — handle, nicho, tipo_conteudo — e do `por_que` da ideia).
2. Para cada imagem baixada no diretório temporário: descobrir o tipo real com `file --mime-type -b <arquivo>` (a extensão do download não é confiável: o CDN do TikTok entrega PNG em URL de "image" e o do Instagram pode entregar WebP). Aceitar só `image/jpeg`, `image/png` ou `image/webp` (outro tipo = download falhou; registrar em `nao_capturado`). Extensão conforme o tipo (`jpg`, `png`, `webp`). `POST {supabase_url}/storage/v1/object/psn-referencias/<ideia_id>/NN.<ext>` com `Content-Type: <mime>`, header `x-upsert: true`, `--data-binary @<arquivo>`. Gravar em `slides[i].imagem_path` o caminho relativo `<ideia_id>/NN.<ext>`, com a mesma extensão do upload.
3. Montar o JSON completo conforme `${CLAUDE_SKILL_DIR}/references/modelo-referencia.md`, com `ideia_id` no corpo. Escrever em um arquivo temporário com `python3 -c "import json; json.dump(obj, open(path,'w'), ensure_ascii=False)"` (nunca inline no shell: legendas têm aspas e quebras de linha).
4. `POST {supabase_url}/rest/v1/psn_referencias?on_conflict=ideia_id` com headers `Prefer: resolution=merge-duplicates,return=representation`, `Content-Type: application/json`, `--data-binary @<arquivo-temp>`.
5. Se a resposta não for 2xx, ir para a seção 6.
6. Sucesso: `PATCH {supabase_url}/rest/v1/psn_ideias?id=eq.<ideia_id>` com `Prefer: return=minimal`, corpo `{"mec_status":"processada","mec_processado_em":"<agora em ISO 8601, America/Sao_Paulo>","mec_erro":null}`.

## 6. Erro

Qualquer falha (plataforma não suportada, captura impossível, upload falhou, upsert falhou): `PATCH {supabase_url}/rest/v1/psn_ideias?id=eq.<ideia_id>` com `Prefer: return=minimal`, corpo `{"mec_status":"erro","mec_erro":"<motivo curto, uma frase>"}`. Não interromper o processamento de outras ideias por causa de um erro (relevante quando chamada por `/insta-ops:fila`).

## 7. Fechar

Feche as abas que você abriu no Chrome. Apague o diretório temporário de imagens.

Responda em 3 a 5 linhas: o que foi processado (autor, formato), o que ficou em `nao_capturado`, e que a análise já aparece na ficha da ideia no app.

## Regras

1. **Verbatim.** Legenda e texto dos slides são copiados como estão. Sem paráfrase, sem corrigir ortografia, sem resumir. Emojis mantidos.
2. **Só o @ público do autor.** Nada de nome de exibição, bio, e-mail, número de seguidores, nem handles de quem comentou. Comentários entram só como contagem.
3. **Nunca inventar.** Métrica, data ou texto de slide que não foi capturado vira `null` ou entrada em `nao_capturado`, nunca um valor inventado.
4. **Nunca abrir comentários ou bio.** A captura é só do post: legenda, slides, autor (só o @), curtidas, comentários e views (contagem).
5. **Máximo 2 tentativas por falha de ferramenta.** Depois disso, seção 6 (erro) com o motivo, e seguir para o próximo item se estiver numa leva.
6. **Sem travessão e sem frases de transição de IA** no texto que você escrever (nada de "além disso", "vale destacar", "é importante notar"). Travessão dentro de texto verbatim do post fica como está.
7. **JSON sempre por arquivo temporário**, nunca inline no shell, para upsert em `psn_referencias` (legendas contêm aspas e quebras de linha).
