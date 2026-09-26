# Análise do post (referência a partir da legenda + slides transcritos)

## Regras que valem aqui (adaptadas da Sofia)

1. **Nunca inventar.** Se um slide não foi transcrito ou uma métrica não apareceu, o campo fica `null` e o item vai para `## Não capturado`. Nunca preencher com suposição.
2. **Honestidade na análise.** Não elogiar gancho ou estrutura fraca só para preencher a nota. Se o post é fraco em algum ponto, dizer isso em `## Análise`.
3. **Princípios acima de técnica.** Um post com tema fraco e técnica perfeita carrega menos que um post com tema forte e técnica simples. Ao descrever "por que funciona", aponte o que está carregando o post: tema, familiaridade, conflito, curiosidade ou aha (nessa ordem de peso).
4. **Regra 6 — nunca copiar tema.** Copiar princípios, estrutura e gatilhos, nunca o tema literal. O esqueleto é reutilizável, a roupagem deve ser nova. Isso vale para as frases de análise e para os 6 bullets, sobretudo "O que reaproveitar"; as citações `> "..."` são verbatim por definição.

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

## `tags`

Convenção, sempre nesta ordem:

```yaml
tags:
  - instagram/referencia
  - formato/<carrossel|reel|imagem>
  - gancho/<tipo_gancho>
  - cta/<tipo_cta>
  - <tema1>
  - <tema2>   # opcional
  - <tema3>   # opcional
```

As tags de tema (1 a 3) são palavras minúsculas, sem acento, que descrevem o assunto do post (ex.: `ia`, `produtividade`, `marketing`). Antes de escolher, rode Grep por `^  - [a-z]+$` nas notas de `Referências Instagram/` e reutilize uma tag existente quando servir. O campo `estrutura` do frontmatter leva só a sequência; o nome do esqueleto vai no bullet **Estrutura**.

## Seção `## Análise` da nota

### Passo 1 — slide a slide, formato Sofia

Adapte o formato da Sofia de "frase a frase" para "slide a slide": um bloco por slide, com o texto do slide entre `> "..."` e uma frase curta do que aquele slide faz (não o que ele diz, o que ele faz com quem lê).

```markdown
> "transformei os meus salvos do instagram em memória pro claude"

Promessa pessoal + resultado concreto: quem lê pensa "eu também tenho esse problema".

---

> "a gente salva mil coisas... e nunca mais acha"

Nomeia uma dor que quem lê reconhece na hora.

---
```

Regras: um bloco por slide, nunca agrupar. A citação é a linha de título do slide (o maior texto), não o slide inteiro. Máximo 1 frase de análise por slide. `---` entre blocos.

### Passo 2 — os 6 bullets do modelo

Depois dos blocos slide a slide, feche com os 6 bullets exigidos por `modelo-nota.md`:

- **Gancho:** o que a capa promete e por que segura o scroll (1 a 2 linhas).
- **Estrutura:** nome do esqueleto + sequência.
- **Desenvolvimento:** como cada bloco relevante entrega (1 linha por bloco).
- **CTA:** mecânica e o que a pessoa ganha ao agir.
- **Por que funciona:** 2 a 3 linhas, apontando o elemento que carrega o post (tema, familiaridade, conflito, curiosidade ou aha), na ordem de peso da hierarquia.
- **O que reaproveitar:** 2 a 4 itens, cada um como padrão aplicável em qualquer nicho. Nunca o tema literal do post original.
