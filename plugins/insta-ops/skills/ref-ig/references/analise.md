# Análise do post (referência a partir da legenda + slides transcritos)

## Regras que valem aqui (adaptadas da Sofia)

1. **Nunca inventar.** Se um slide não foi transcrito ou uma métrica não apareceu, o campo fica `null` e o item vai para `nao_capturado`. Nunca preencher com suposição.
2. **Honestidade na análise.** Não elogiar gancho ou estrutura fraca só para preencher a referência. Se o post é fraco em algum ponto, dizer isso em `analise`.
3. **Princípios acima de técnica.** Um post com tema fraco e técnica perfeita carrega menos que um post com tema forte e técnica simples. Ao descrever "por que funciona", aponte o que está carregando o post: tema, familiaridade, conflito, curiosidade ou aha (nessa ordem de peso).
4. **Regra 6 — nunca copiar tema.** Copiar princípios, estrutura e gatilhos, nunca o tema literal. O esqueleto é reutilizável, a roupagem deve ser nova. Isso vale para as frases de análise e para os campos de `analise`, sobretudo `o_que_reaproveitar`; as citações verbatim de slide/legenda ficam como estão.
5. **`o_que_reaproveitar` é sempre no contexto do canal.** Use o `handle`, `nicho` e `tipo_conteudo` (`reels` ou `estatico`) do canal da ideia (vindos de `psn_criadores`), mais o `por_que` que a pessoa escreveu ao salvar a ideia, para dizer como AQUELE canal adaptaria o padrão. Nunca uma recomendação genérica "para qualquer nicho".

## `gancho`

Linha de título da capa (o maior texto do slide 1), verbatim, sem subtítulo nem assinatura. Se o post é imagem única sem texto sobreposto, use a primeira linha da legenda.

## `tipo_gancho`

Classifique em um dos 8 tipos do modelo:

| tipo | exemplo |
|---|---|
| promessa-pessoal | "transformei os meus salvos do instagram em memória pro claude" |
| pergunta | "você sabia que 90% das pessoas fazem isso errado?" |
| contradicao | "pare de estudar 8h por dia (faça isso em vez disso)" |
| lista | "5 erros que todo mundo comete ao começar" |
| erro-comum | "o erro que te impede de crescer no instagram" |
| bastidor | "como é por dentro o meu processo de criação" |
| dado | "82% dos posts que salvamos a gente nunca mais acha" |
| outro | quando nenhum dos anteriores encaixa |

## `estrutura`

Nomeie a função de cada slide usando as etiquetas do modelo (`capa | dor | promessa | passo | prova | lista | pra-quem-serve | cta | outro`) e escreva a sequência com `→`.

Esqueletos comuns (use um destes nomes quando encaixar, ou nomeie um novo do mesmo jeito):

- `tutorial-3-passos-com-print`: capa → dor → promessa → passo 1 → passo 2 → passo 3 → pra-quem-serve → cta
- `lista-de-erros`: capa → dor → erro 1 → erro 2 → erro 3 → reframe → cta
- `antes-depois`: capa → antes → depois → o que mudou → cta
- `contradicao-e-reframe`: capa → crença comum → contradição → reframe → prova → cta
- `historia-com-moral`: capa → contexto → virada → moral → cta
- `lista-simples`: capa → item 1 → item 2 → item 3 → ... → cta

## `cta` / `tipo_cta` / `palavra_chave`

`cta`: texto verbatim do pedido de ação do último slide. Se o último slide não pede ação, a frase de pedido da legenda. Uma fonte só.

`tipo_cta`: `comente-palavra | salve | compartilhe | siga | link-bio | nenhum`.

`palavra_chave`: se `tipo_cta = comente-palavra`, a palavra exata pedida (ex.: `"saves"`); senão `null`.

## `formato`

`carrossel | reel | imagem | video`. TikTok é sempre `video` (não existe carrossel de TikTok neste v0.1). Instagram usa `carrossel`, `reel` ou `imagem`.

## `tags`

Só tags de tema, 1 a 3, palavras minúsculas, sem acento, descrevendo o assunto do post (ex.: `ia`, `produtividade`, `marketing`). Nada de prefixo `formato/...`, `gancho/...` ou `cta/...` — esses agora são as próprias colunas `formato`, `tipo_gancho` e `tipo_cta`. Antes de escolher, consulte `psn_referencias.tags` já gravadas (via GET com `select=tags`) e reutilize uma tag existente quando servir. O campo `estrutura` leva só a sequência; o nome do esqueleto vai no campo `estrutura` de `analise` (bullet **Estrutura**).

## Seção `analise` da referência

### Passo 1 — slide a slide, formato Sofia, vira `analise.por_slide`

Adapte o formato da Sofia de "frase a frase" para "slide a slide": uma frase curta por slide, do que aquele slide faz (não o que ele diz, o que ele faz com quem lê). Cada frase é um item do array `por_slide`, na ordem dos slides — não repita o texto do slide na frase, ele já está em `slides[i].texto`.

Exemplo (2 slides):

```json
"por_slide": [
  "Promessa pessoal + resultado concreto: quem lê pensa \"eu também tenho esse problema\".",
  "Nomeia uma dor que quem lê reconhece na hora."
]
```

Regras: um item por slide, nunca agrupar. Máximo 1 frase por slide.

### Passo 2 — os campos de `analise`

Depois de `por_slide`, preencha os demais campos exigidos por `modelo-referencia.md`:

- **`gancho`:** o que a capa promete e por que segura o scroll (1 a 2 linhas).
- **`estrutura`:** nome do esqueleto + sequência.
- **`desenvolvimento`:** como cada bloco relevante entrega (1 linha por bloco).
- **`cta`:** mecânica e o que a pessoa ganha ao agir.
- **`por_que_funciona`:** 2 a 3 linhas, apontando o elemento que carrega o post (tema, familiaridade, conflito, curiosidade ou aha), na ordem de peso da hierarquia.
- **`o_que_reaproveitar`:** 2 a 4 itens, cada um dizendo como o canal da ideia (handle, nicho, tipo_conteudo) adaptaria esse padrão, considerando o `por_que` da ideia (regra 5 acima). Nunca o tema literal do post original.
