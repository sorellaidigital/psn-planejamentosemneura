# Protocolo de captura do TikTok

Use quando `plataforma = tiktok`. Funciona em qualquer sessão (não precisa de Chrome), com fonte `oembed`; se `mcp__claude-in-chrome__*` estiver disponível, complementa com métricas e vira fonte `chrome`.

## 1. Resolver o link final

Links de TikTok compartilhados costumam vir curtos (`vt.tiktok.com/...` ou `vm.tiktok.com/...`). Seguir os redirects sem baixar o corpo:

```bash
curl -sIL -o /dev/null -w '%{url_effective}' "<url>"
```

O resultado é a URL final, no formato `https://www.tiktok.com/@<usuario>/video/<videoid>`. Extrair `<videoid>` (só dígitos) e `<usuario>`. `post_id = tt-<videoid>`.

Se o redirect não resolver em 2 tentativas, parar e registrar `{"item":"url","motivo":"não foi possível resolver o link curto"}`; a referência vai para `mec_status = erro`.

## 2. oEmbed (sempre)

```bash
curl -sS "https://www.tiktok.com/oembed?url=https://www.tiktok.com/@<usuario>/video/<videoid>"
```

Do JSON retornado:
- `title` → `legenda` (é a legenda/caption do vídeo, verbatim).
- `author_unique_id` (ou `author_name` se aquele faltar) → `autor` = `"@<valor>"`.
- `thumbnail_url` → baixar imediatamente para um diretório temporário (`mktemp -d`) como `01.jpg` (`curl -L -sS -o "<tmp>/01.jpg" "<thumbnail_url>"`), depois enviar por upload ao Storage e gravar `imagem_path`.
- `html` não é usado (é embed, não texto).

Se o oEmbed falhar (404, vídeo removido ou privado): parar, `mec_status = erro`, motivo `"tiktok: oembed indisponível (vídeo privado, removido ou indisponível)"`.

Com só o oEmbed: `fonte: oembed`, `formato: video`, `n_slides: 1`, `curtidas`, `comentarios` e `views` ficam `null` (registrar em `nao_capturado`: `{"item":"curtidas","motivo":"oembed não traz métricas"}`, idem comentarios e views).

## 3. Chrome (se disponível) — complementa

Se `mcp__claude-in-chrome__*` estiver carregado (mesma checagem de `protocolo-chrome.md`): abrir `https://www.tiktok.com/@<usuario>/video/<videoid>` em aba nova, esperar carregar (`get_page_text`, máx. 3 tentativas com 2s de espera), e ler de `document.body.innerText` os números de curtidas, comentários e visualizações (procurar os padrões de contagem perto dos ícones de ação; TikTok normalmente expõe `strong[data-e2e="like-count"]`, `strong[data-e2e="comment-count"]`, `strong[data-e2e="video-views"]` — usar `javascript_tool` com esses seletores, com fallback para o texto puro se o `data-e2e` mudar). Converter abreviações ("1.2M", "834.5K") para inteiro aproximado e registrar em `nao_capturado` como no Instagram (regra 6 de `modelo-referencia.md`).

Também capturar texto na tela (overlay de texto do vídeo, se houver) via `get_page_text` ou screenshot (`computer`), e somar ao `texto` do slide único.

Se o Chrome responder: `fonte: chrome` (substitui `oembed`). Se falhar ou não estiver disponível: seguir só com o resultado do passo 2, `fonte: oembed`, sem tentar de novo.

Não abrir comentários individuais, não abrir perfil, não curtir, não seguir.

## 4. Áudio

Áudio não é transcrito neste v0.1. Sempre registrar em `nao_capturado`: `{"item":"audio","motivo":"transcrição não feita no v0.1"}`.

## 5. Data de publicação

O id do vídeo do TikTok codifica o timestamp Unix (segundos) nos 32 bits mais altos. Calcular:

```bash
python3 -c "print(<videoid> >> 32)"
```

Converter o timestamp Unix resultante para data em America/Sao_Paulo (`AAAA-MM-DD`) e gravar em `data_publicacao`. Se o cálculo falhar ou o id não for só dígitos, `data_publicacao: null` e registrar `{"item":"data_publicacao","motivo":"não derivada do id do vídeo"}`.

## Saída esperada

`post_id`, `url` (a URL final resolvida, sem parâmetros de rastreio), `autor`, `plataforma: tiktok`, `formato: video`, `n_slides: 1`, `data_publicacao`, `fonte`, `curtidas`/`comentarios`/`views`, `legenda`, um item em `slides` (`n:1`, `funcao:"capa"`, `texto`, `visual`, `imagem_path`), e `nao_capturado` com pelo menos o item de áudio.

Campos de análise (`gancho`, `tipo_gancho`, `estrutura`, `cta`, `tipo_cta`, `palavra_chave`, `tags`, `analise`) seguem `analise.md`, igual ao Instagram.
