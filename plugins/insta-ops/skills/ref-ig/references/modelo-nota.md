# Modelo da nota de referência (contrato)

Uma nota por post. Caminho: `<vault>/Referências Instagram/<autor>/<id>.md`, onde `<autor>` é o @ com arroba (ex.: `@amandadinizmkt`) e `<id>` é `ig-<shortcode>` (shortcode = o trecho da URL depois de `/p/` ou `/reel/`). Imagens em `<vault>/Referências Instagram/_anexos/<id>/NN.jpg` (NN com dois dígitos, na ordem dos slides).

## Regras

1. **Verbatim.** Legenda e texto dos slides são copiados como estão. Sem paráfrase, sem corrigir ortografia, sem resumir. Emojis mantidos.
2. **Só o @ público do autor.** Nada de nome de exibição, bio, e-mail, número de seguidores, nem handles de quem comentou. Comentários entram só como contagem em `comentarios`.
3. **Dedupe por `id`.** Localizar com Glob `<vault>/Referências Instagram/**/<id>.md`. Se a nota já existe: não reescrever nenhum campo ou seção que não esteja vazio (`""`, `null`, `[]` ou seção só com placeholder); preencher só os vazios e gravar `atualizado_em`.
4. **O que não conseguiu capturar vai na seção `## Não capturado`** no formato `item: motivo`. Nunca inventar métrica, data ou texto de slide.
5. **Análise separa esqueleto de tema.** Em `## Análise`, descrever gancho, estrutura, CTA e o que reaproveitar como padrão reutilizável em qualquer nicho; nunca sugerir copiar o tema literal do post.
6. **Frontmatter é YAML válido.** Strings com `:`, `#`, aspas ou emoji vão entre aspas duplas (aspas internas escapadas com `\"`). `null` para desconhecido. Datas `AAAA-MM-DD` no fuso America/Sao_Paulo. Métricas sempre inteiro: valor exato quando disponível; se só houver abreviado ("1,6 mil", "1.6K"), gravar o inteiro aproximado (1600) e registrar `curtidas: aproximado da tela (1,6 mil)` em Não capturado.
7. **Assinatura impressa no slide** (nome de exibição, cargo, logo em texto) não entra no bloco de texto; registrar uma vez em Não capturado como `assinatura_slides: nome de exibição omitido (regra 2)`.
8. **Texto do slide = o que o autor escreveu.** Texto de interface de prints e fotos embutidos (menus, títulos de outros posts, mensagens de app) fica fora do bloco `text` e é citado só na linha `_Visual:_`. Quebras de linha de diagramação são juntadas; só a quebra entre blocos de texto separados é mantida.

## Template

```markdown
---
tipo: referencia-instagram
id: ig-XXXXXXXXXXX
url: https://www.instagram.com/p/XXXXXXXXXXX/
autor: "@handle"
formato: carrossel            # carrossel | reel | imagem
n_slides: 8                   # 1 para imagem; reel = 1 (capa)
data_publicacao: 2026-08-22   # ou null
salvo_em: 2026-09-26
atualizado_em: null
fonte: chrome                 # chrome | manual
curtidas: 1598                # ou null
comentarios: 1955             # ou null
views: null                   # reels, quando visível
gancho: "texto da capa ou primeira linha da legenda"
tipo_gancho: promessa-pessoal # promessa-pessoal | pergunta | contradicao | lista | erro-comum | bastidor | dado | outro
estrutura: "capa → dor → promessa → passo 1 → passo 2 → passo 3 → pra-quem-serve → cta"   # só a sequência; o nome do esqueleto vai no bullet Estrutura
cta: "comenta \"saves\" aqui embaixo que eu te mando no seu direct"   # verbatim do último slide; se ele não pede ação, a frase de pedido da legenda
tipo_cta: comente-palavra     # comente-palavra | salve | compartilhe | siga | link-bio | nenhum
palavra_chave: "saves"        # se tipo_cta = comente-palavra; senão null
por_que_salvei: ""
tags:
  - instagram/referencia
  - formato/carrossel
  - gancho/promessa-pessoal
  - cta/comente-palavra
---
# {{gancho}}

**Autor:** [@handle](https://www.instagram.com/handle/) · **Post:** [abrir]({{url}}) · **Formato:** carrossel, 8 slides · **Publicado:** 2026-08-22 · **Curtidas:** 1.598 · **Comentários:** 1.955

(omitir o par `· **Publicado:** …`, `· **Curtidas:** …` ou `· **Comentários:** …` quando o campo for `null`; números com ponto de milhar)

## Legenda (verbatim)

```text
<legenda completa, com hashtags e quebras de linha originais>
```

## Slides

### 1 · capa
![[Referências Instagram/_anexos/ig-XXXXXXXXXXX/01.jpg]]
```text
<texto que o autor escreveu no slide, verbatim, na ordem de leitura; sem assinatura; sem texto de interface de prints embutidos (regras 7 e 8)>
```
_Visual:_ <1 linha: o que é a imagem de fundo/print; sem interpretar>

### 2 · dor
![[Referências Instagram/_anexos/ig-XXXXXXXXXXX/02.jpg]]
```text
...
```
_Visual:_ ...

(repetir até o último slide; a etiqueta depois do número é a função do slide: capa | dor | promessa | passo | prova | lista | pra-quem-serve | cta | outro)

## Análise

> "texto do slide 1"

O que esse slide faz com quem lê (1 frase).

---

> "texto do slide 2"

(1 frase)

---

(um bloco por slide, na ordem; depois os 6 bullets)

- **Gancho:** o que a capa promete e por que segura o scroll (1 a 2 linhas).
- **Estrutura:** nome do esqueleto + sequência (ex.: `tutorial-3-passos-com-print`: capa → dor → promessa → passo 1 → passo 2 → passo 3 → pra-quem-serve → cta).
- **Desenvolvimento:** como cada bloco entrega (1 linha por bloco relevante).
- **CTA:** mecânica e o que a pessoa ganha ao agir.
- **Por que funciona:** 2 a 3 linhas, apontando o que carrega o post (tema, familiaridade, conflito, curiosidade ou aha, nessa ordem de peso).
- **O que reaproveitar:** 2 a 4 itens, cada um como padrão aplicável em qualquer nicho. Nunca o tema literal.

## Não capturado

- nada
```

## Reel

Para reel, `n_slides: 1`, a seção `## Slides` tem só `### 1 · capa` com a imagem de capa e o texto visível nela, e `## Não capturado` inclui `audio: transcrição não feita no v0`.

## Post manual (sem Chrome)

`fonte: manual`. Métricas e data que a pessoa não informou ficam `null` e entram em `## Não capturado`. Prints entregues como arquivo (caminho) são copiados com `cp` para `_anexos/<id>/NN.<extensão original>`. Print colado direto no chat, sem arquivo: transcrever a partir dele, não criar o embed `![[...]]` e registrar `imagem_NN: colada no chat, sem arquivo`.
