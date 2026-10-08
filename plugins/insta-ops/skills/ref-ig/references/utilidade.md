# Utilidade (conteúdo para consumir, não ideia de post)

Vale quando o canal da ideia tem `tipo_conteudo = utilidade`: a referência é algo que a pessoa CONSOME para aprender e aplicar (ex.: um carrossel com lista de ganchos, um post de estratégia ou planejamento). Não é pauta nem modelo de post a imitar.

A captura é a mesma (`protocolo-chrome.md`, `protocolo-tiktok.md` ou modo manual). Muda a análise.

## Regras

1. **Nunca inventar.** Mesmas regras de `analise.md` (campo ausente vira `null` e entra em `nao_capturado`).
2. **Verbatim em lista.** Se o post é uma lista (ganchos, ferramentas, passos, prompts), cada item é copiado como está, um por item de `pontos`. Sem paráfrase, sem juntar itens.
3. **`como_aplicar` é concreto e no contexto do canal.** Use o `handle`, o `nicho` e o `por_que` da ideia. Nada de conselho genérico.
4. **Sem travessão e sem frases de transição de IA.**

## Campos do post (continuam)

Preencher como em `analise.md`, porque ainda descrevem o post: `gancho`, `tipo_gancho`, `estrutura`, `cta`, `tipo_cta`, `palavra_chave`, `slides` (texto verbatim), `legenda`, `formato`, `tags`.

`tags`: 1 a 3, e uma delas é o `tema` do aprendizado.

## `aprendizado`

Objeto em `psn_referencias.aprendizado`:

- **`tema`:** uma palavra minúscula, sem acento. Ex.: `ganchos`, `estrategia`, `planejamento`, `copy`, `ferramentas`, `posicionamento`. Reutilizar um tema já gravado quando servir (`GET psn_referencias?select=aprendizado->>tema`).
- **`resumo`:** 2 a 3 frases do que o post ensina.
- **`pontos`:** array de strings. Post em lista: cada item verbatim, na ordem. Senão: pontos-chave destilados, uma frase cada.
- **`como_aplicar`:** como o canal @handle (nicho) usaria isso, considerando o `por_que` da ideia, em passos ou exemplos concretos.

## `analise`

- `analise.o_que_reaproveitar`: string vazia `""`.
- `analise.por_que_funciona`: opcional.
- Demais chaves de `analise` (`gancho`, `estrutura`, `desenvolvimento`, `cta`, `por_slide`): opcionais; preencher só o que ajudar a entender o post. Nenhuma chave de foco (`pauta`, `formato_visual`, `variacoes_gancho`, `serie`).
