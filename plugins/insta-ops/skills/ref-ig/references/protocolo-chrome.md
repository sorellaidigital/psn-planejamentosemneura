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
2. **Esperar carregar:** `get_page_text`; se não aparecer o @ do autor nem a legenda, esperar 2 s e repetir (máximo 3 vezes). Se aparecer tela de login, parar (ver tabela abaixo).
3. **Capturar meta** com `javascript_tool` (um único script que devolve JSON):
   - autor: `document.querySelector('article header a[href^="/"]')?.getAttribute('href')` → tirar as barras → `@handle`. Só o handle; nada de nome de exibição.
   - data: `document.querySelector('article time')?.getAttribute('datetime')` → `AAAA-MM-DD`.
   - curtidas e comentários: procurar em `document.body.innerText` os padrões `N curtidas` / `N likes` e `Ver todos os N comentários` / `View all N comments`; converter "1,6 mil"/"1.6K" para número inteiro aproximado e registrar como está. Se não aparecer, `null`.
   - formato: se existir `article video` → reel; se existir botão `button[aria-label="Avançar"], button[aria-label="Next"]` → carrossel; senão → imagem.
4. **Legenda:** clicar em "mais"/"more" se existir (`computer`), depois `get_page_text` ou `javascript_tool` em `article h1, article span[dir="auto"]` para copiar verbatim, com hashtags e quebras de linha originais.
5. **Carrossel, slide a slide:** para cada slide, rodar `javascript_tool`:
   ```js
   [...document.querySelectorAll('article img[srcset]')].map(i=>{const c=i.srcset.split(',').map(s=>s.trim().split(' ')).map(([u,w])=>({u,w:parseInt(w)})).sort((a,b)=>b.w-a.w)[0];return {alt:i.alt,url:c.u,w:c.w}})
   ```
   Isso lista as imagens carregadas (o slide atual e os vizinhos) com a URL de maior largura do `srcset` (normalmente 1080w). Guardar a URL nova que ainda não estava na lista; clicar na seta "Avançar"/"Next" com `computer`; repetir até a seta desaparecer. Contagem de slides = nº de URLs distintas. Fallback se `srcset` não existir: `img.src`; se nem isso, screenshot do slide via `computer` e salvar como `NN.png`.
6. **Reel:** capturar só a capa: `document.querySelector('article video')?.poster` ou a primeira `img` do `article`; legenda como no passo 4. Registrar `audio: transcrição não feita no v0`.
7. **Baixar imagens:** para cada URL, `curl -L -sS -o "<vault>/Referências Instagram/_anexos/<id>/NN.jpg" "<url>"` (a URL tem `&`; sempre entre aspas). As URLs do CDN são públicas e temporárias; baixar na hora. Conferir com `file NN.jpg` que é JPEG/PNG e não HTML. Fallback: screenshots do passo 5.
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
| Imagem não baixa (CDN 404/timeout) | Usar screenshot via `computer`. | `imagem_NN: CDN indisponível` |
| Texto muito pequeno/ilegível | Descrever o máximo legível; registrar. | `texto_NN: ilegível` |
| Extensão sem resposta (2–3 tentativas) | Parar. Avisar a pessoa. | `extensao: sem resposta` |

## Saída esperada

Este protocolo preenche frontmatter de `modelo-nota.md`:
- `tipo`, `id`, `url`, `autor`, `formato`, `n_slides`, `data_publicacao`, `salvo_em`, `fonte: chrome`, `curtidas`, `comentarios`
- Seção `## Legenda (verbatim)` e `## Slides` (cada slide com imagem, texto e visual)

Campos para análise (não preenchidos aqui):
- `gancho`, `tipo_gancho`, `estrutura`, `cta`, `tipo_cta`, `palavra_chave`

Campo para a pessoa:
- `por_que_salvei`, `tags`
