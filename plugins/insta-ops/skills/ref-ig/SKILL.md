---
name: ref-ig
description: |
  Salva um post do Instagram como nota de referência no vault do Obsidian: abre o post no Claude in Chrome, copia legenda e slides verbatim, baixa as imagens, extrai gancho, estrutura e CTA, pergunta por que a pessoa salvou e atualiza o índice. Use sempre que a pessoa colar um link de instagram.com/p/ ou /reel/, ou disser "salva esse post", "guarda essa referência", "adiciona no meu banco de referências", "esse post é bom, anota". Também funciona sem Chrome no modo manual, com legenda e prints colados.
argument-hint: "<url> [<url> ...] | --manual"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(mkdir *), Bash(ls *), Bash(curl *), Bash(file *)
---

# ref-ig: salvar post do Instagram como referência

Transforma um post do Instagram em uma nota de referência no vault do Obsidian, com legenda e slides verbatim, gancho, estrutura e CTA identificados.

Não publica nada, não analisa o perfil do autor, não guarda dado de terceiro além do @ público de quem publicou o post.

## 0. Vault

O valor configurado é `${user_config.vault_dir}`.

Se vazio, pergunte em uma linha o caminho da pasta raiz do vault. Use o caminho recebido só nesta execução e diga que dá para fixar com `/plugin configure insta-ops`.

Pasta de destino: `<vault>/Referências Instagram/`. Se não existir, crie (junto com `<vault>/Referências Instagram/_anexos/`).

## 1. Entrada

Argumentos recebidos: `$ARGUMENTS`.

Extraia todas as URLs no formato `instagram.com/p/<shortcode>` ou `instagram.com/reel/<shortcode>`. Para cada uma, `id = ig-<shortcode>`.

Se `$ARGUMENTS` contém `--manual`, ou se as ferramentas `mcp__claude-in-chrome__*` não estão disponíveis, use o modo manual (seção 3) para cada post.

Se a nota `<id>.md` já existe, avise a pessoa e siga a regra de dedupe do modelo: preencha só o que está vazio, nunca sobrescreva o que a pessoa já editou.

## 2. Captura com Chrome

Siga `${CLAUDE_SKILL_DIR}/references/protocolo-chrome.md` à risca, um post por vez. As ferramentas do Chrome são carregadas por ToolSearch conforme o protocolo; se a chamada não encontrar nenhuma ferramenta `mcp__claude-in-chrome__*`, caia no modo manual e diga por quê.

Ao final da captura de cada post, você deve ter em mãos: @ do autor, legenda completa, formato (carrossel, reel ou imagem), número de slides, texto de cada slide na ordem de leitura, as imagens baixadas, data de publicação, curtidas e comentários (contagem).

## 3. Modo manual

Peça em UMA mensagem: URL do post, @ do autor, legenda colada, formato (carrossel, reel ou imagem), prints dos slides (ou o texto de cada um) e o que a pessoa souber de data de publicação, curtidas e comentários.

Prints colados: leia com Read e copie para `<vault>/Referências Instagram/_anexos/<id>/`, nomeando `NN.jpg` ou `NN.png` conforme o original, na ordem dos slides.

Tudo que a pessoa não informar vai para a seção `## Não capturado` da nota, no formato `item: motivo`.

## 4. Análise

Siga `${CLAUDE_SKILL_DIR}/references/analise.md` para preencher `gancho`, `tipo_gancho`, `estrutura`, `cta`, `tipo_cta`, `palavra_chave`, `tags` e a seção `## Análise`.

Regra dura: descreva o esqueleto (o que é reaproveitável em qualquer nicho), nunca o tema literal do post.

## 5. Gravar a nota

Grave a nota exatamente no formato de `${CLAUDE_SKILL_DIR}/references/modelo-nota.md`, no caminho `<vault>/Referências Instagram/<autor>/<id>.md`.

Frontmatter em YAML válido (`salvo_em` = data de hoje em AAAA-MM-DD; strings com `:`, `#` ou emoji entre aspas duplas). Legenda e slides verbatim, sem paráfrase. Crie a pasta `<autor>/` se não existir.

## 6. Por que salvei

Pergunte UMA vez, em uma linha, para todos os posts da leva: "por que você salvou esse(s)? uma linha por post".

Grave a resposta em `por_que_salvei`. Se a pessoa não responder ou disser "depois", deixe `""` e diga que o índice vai mostrar o campo vazio até ela preencher.

## 7. Índice

Atualize `<vault>/Referências Instagram/_Índice.md` conforme `${CLAUDE_SKILL_DIR}/references/indice.md`.

## 8. Fechar

Feche as abas que você abriu no Chrome.

Responda em 3 a 5 linhas: o que foi salvo (caminho da nota), o que ficou em "Não capturado", e sugira "abra no Obsidian". Nada de resumo longo.

## Regras

1. **Verbatim.** Legenda e texto dos slides são copiados como estão. Sem paráfrase, sem corrigir ortografia, sem resumir. Emojis mantidos.
2. **Só o @ público do autor.** Nada de nome de exibição, bio, e-mail, número de seguidores, nem handles de quem comentou. Comentários entram só como contagem.
3. **Nunca inventar.** Métrica, data ou texto de slide que não foi capturado vira `null` ou entrada em `## Não capturado`, nunca um valor inventado.
4. **Nunca abrir comentários ou bio.** A captura é só do post: legenda, slides, autor (@ e handle), curtidas e comentários (contagem).
5. **Máximo 2 tentativas por falha de ferramenta.** Depois disso, pare e pergunte à pessoa como seguir.
6. **Sem travessão e sem frases de transição de IA** no texto que você escrever na nota (nada de "além disso", "vale destacar", "é importante notar").
