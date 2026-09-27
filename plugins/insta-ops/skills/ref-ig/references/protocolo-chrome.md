# Protocolo de captura com Claude in Chrome

Use quando: URL é `instagram.com/p/…` ou `instagram.com/reel/…` e as ferramentas `mcp__claude-in-chrome__*` estão disponíveis. Sem ferramentas: usar o modo manual descrito no `SKILL.md`.

## Antes de começar

Carregar ferramentas em UMA chamada ToolSearch:
```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_close_mcp
```

Chamar `tabs_context_mcp` primeiro. Abrir NOVA aba (nunca reutilizar aba da pessoa). Se a extensão não responder ou o Instagram pedir login após 2–3 tentativas, parar e avisar.

## Passo a passo por post

1. **Navegar:** `navigate` para a URL do post na aba nova.
2. **Esperar carregar:** `get_page_text`; se não aparecer o @ do autor nem a legenda, esperar 2 s e repetir (máximo 3 vezes). Se aparecer tela de login, parar (ver tabela abaixo). Do texto da página, use só @ do autor, legenda, data e contagens; ignore qualquer outro handle ou nome (comentaristas, "curtido por", sugestões).
3. **Capturar meta** com `javascript_tool` (um único script que devolve JSON):
   - autor: `(document.querySelector('main header a[href^="/"]') ?? document.querySelector('header a[href^="/"]'))?.getAttribute('href')` → tirar as barras → `@handle`. Só o handle; nada de nome de exibição. (Seletores a confirmar em sessão local; o layout do Instagram muda. Se falhar, pegar o handle do `get_page_text`: é o primeiro @ acima da legenda.)
   - data: `document.querySelector('main time, time')?.getAttribute('datetime')` (UTC) → converter para America/Sao_Paulo → `AAAA-MM-DD`.
   - curtidas e comentários: procurar em `document.body.innerText` os padrões `N curtidas` / `N likes` e `Ver todos os N comentários` / `View all N comments`. Gravar inteiro: exato quando disponível; só abreviado ("1,6 mil", "1.6K") → inteiro aproximado (1600) + registro `curtidas: aproximado da tela (1,6 mil)` em Não capturado. Se aparecer "Curtido por @x e outras pessoas" ou nada, `curtidas: null` e ignorar o handle. Comentários ausentes no permalink de desktop são comuns: `null`.
   - formato: se existir `main video, video` → reel; se existir botão `button[aria-label="Avançar"], button[aria-label="Next"]` → carrossel; senão → imagem.
4. **Legenda:** clicar em "mais"/"more" se existir (`computer`), depois `javascript_tool` em `document.querySelector('main h1')?.innerText` (a legenda do permalink costuma ser o `h1`); fallback: no `get_page_text`, o bloco logo abaixo do @ do autor e acima do primeiro comentário. Copiar verbatim, com hashtags e quebras de linha originais. Nunca incluir texto de comentários.
5. **Carrossel, slide a slide:** para cada slide, rodar `javascript_tool`:
   ```js
   [...document.querySelectorAll('main img[srcset], article img[srcset]')].map(i=>{const c=i.srcset.split(',').map(s=>s.trim().split(' ')).map(([u,w])=>({u,w:parseInt(w)})).sort((a,b)=>b.w-a.w)[0];return {url:c.u,w:c.w}}).filter(x=>x.w>=640)
   ```
   Isso lista as imagens carregadas (o slide atual e os vizinhos) com a URL de maior largura do `srcset` (normalmente 1080w). Guardar a URL nova que ainda não estava na lista; clicar na seta "Avançar"/"Next" com `computer`; repetir até a seta desaparecer. Contagem de slides = nº de URLs distintas. Fallback se `srcset` não existir: `img.src`. Se nem isso: transcrever a partir do screenshot do `computer`, não criar arquivo nem embed, e registrar `imagem_NN: sem URL, só screenshot`. O filtro `w>=640` descarta avatares e miniaturas.
6. **Reel:** capturar só a capa: `document.querySelector('article video')?.poster` ou a primeira `img` do `article`; legenda como no passo 4. Registrar `audio: transcrição não feita no v0`.
7. **Baixar imagens:** criar um diretório temporário uma vez por post (`mktemp -d`) e, para cada URL, `curl -L -sS -o "<tmp>/NN.jpg" "<url>"` (a URL tem `&`; sempre entre aspas). As URLs do CDN são públicas e temporárias; baixar na hora, antes de qualquer outro passo poder atrasar. Conferir com `file` que é imagem (JPEG, PNG ou WebP) e não HTML; se for WebP, renomear para `NN.webp`. Se o download falhar: transcrever pelo screenshot e registrar `{"item":"imagem_NN","motivo":"CDN indisponível"}`. Depois de transcrever (passo 8), fazer upload de cada arquivo do `<tmp>` para o Storage (`POST {url}/storage/v1/object/psn-referencias/<ideia_id>/NN.jpg`, `Content-Type` conforme a extensão, header `x-upsert: true`) e gravar em `slides[i].imagem_path` o caminho relativo `<ideia_id>/NN.jpg`.
8. **Transcrição:** ler cada imagem com `Read` e copiar o texto visível verbatim, na ordem de leitura, no bloco do slide. Em `_Visual:_`, 1 linha descrevendo a imagem sem interpretar.
9. **Não fazer:** não abrir comentários individuais, não capturar handles de comentaristas, não abrir perfil, bio ou link da bio, não curtir, não seguir, não comentar.
10. **Fechar:** `tabs_close_mcp` na aba criada ao terminar a leva.

## O que fazer quando falha

| Situação | O que fazer | Registrar em "Não capturado" |
|---|---|---|
| Página pede login | Parar. Avisar a pessoa. | `login: requerido` |
| Post privado/removido | Parar. Avisar a pessoa. | `acesso: privado ou removido` |
| Seta "Avançar" não aparece já no 1º slide | É imagem única ou reel; seguir o passo 3 (formato). | nada |
| Seta some antes do esperado ou slide repetido | Considerar concluído; conferir contagem pelas URLs distintas. | `slides: contagem incerta` |
| Imagem não baixa (CDN 404/timeout) | Transcrever pelo screenshot do `computer`; sem arquivo, sem embed. | `imagem_NN: CDN indisponível` |
| Texto muito pequeno/ilegível | Descrever o máximo legível; registrar. | `texto_NN: ilegível` |
| Extensão sem resposta (2–3 tentativas) | Parar. Avisar a pessoa. | `extensao: sem resposta` |

## Saída esperada

Este protocolo preenche os campos de `modelo-referencia.md`:
- `post_id`, `url`, `autor`, `formato`, `n_slides`, `data_publicacao`, `fonte: chrome`, `curtidas`, `comentarios`
- `legenda` e `slides` (cada slide com `texto`, `visual` e, depois do upload, `imagem_path`)

Campos de análise (preenchidos depois, em `analise.md`):
- `gancho`, `tipo_gancho`, `estrutura`, `cta`, `tipo_cta`, `palavra_chave`, `tags`, `analise`

`por_que` já vem da ideia (campo `por_que` de `psn_ideias`), não é perguntado aqui.
