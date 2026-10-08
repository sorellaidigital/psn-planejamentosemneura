# Modelo da referência (contrato)

Uma referência por ideia. Grava em `psn_referencias`, upsert por `ideia_id` (`on_conflict=ideia_id`). Imagens em Supabase Storage, bucket `psn-referencias`, caminho `<ideia_id>/NN.jpg` (NN com dois dígitos, na ordem dos slides). `slides[].imagem_path` guarda esse caminho relativo, nunca a URL pública completa.

## Regras

1. **Verbatim.** Legenda e texto dos slides são copiados como estão. Sem paráfrase, sem corrigir ortografia, sem resumir. Emojis mantidos.
2. **Só o @ público do autor.** Nada de nome de exibição, bio, e-mail, número de seguidores, nem handles de quem comentou. Comentários entram só como contagem em `comentarios`.
3. **Upsert por `ideia_id`.** Uma referência por ideia (constraint única no banco). Reprocessar uma ideia substitui a referência inteira; não faz merge de campo a campo.
4. **O que não conseguiu capturar vai em `nao_capturado`**, lista de `{item, motivo}`. Nunca inventar métrica, data ou texto de slide.
5. **Análise separa esqueleto de tema.** Em `analise`, descrever gancho, estrutura, CTA e o que reaproveitar como padrão reutilizável; nunca sugerir copiar o tema literal do post.
6. **Métricas sempre inteiro ou `null`.** Nunca string. Valor exato quando disponível; se só houver abreviado ("1,6 mil", "1.6K"), gravar o inteiro aproximado (1600) e registrar em `nao_capturado`: `{"item":"curtidas","motivo":"aproximado da tela (1,6 mil)"}`.
7. **Datas** em `AAAA-MM-DD`, fuso America/Sao_Paulo, ou `null`.
8. **Assinatura impressa no slide** (nome de exibição, cargo, logo em texto) não entra no texto do slide; registrar uma vez em `nao_capturado` como `{"item":"assinatura_slides","motivo":"nome de exibição omitido (regra 2)"}`.
9. **Texto do slide = o que o autor escreveu.** Texto de interface de prints e fotos embutidos (menus, títulos de outros posts, mensagens de app) fica fora de `texto` e é citado só em `visual`. Quebras de linha de diagramação são juntadas; só a quebra entre blocos de texto separados é mantida.
10. **`o_que_reaproveitar` é sempre para o contexto do canal** (ideias de post; em utilidade fica `""`). Use o `handle`, o `nicho` e o `tipo_conteudo` (reels ou estatico) do canal da ideia, mais o `por_que` que a pessoa escreveu ao salvar — descreva como ESSE canal adaptaria o padrão, nunca uma recomendação genérica.

## Valores válidos (iguais aos checks do banco)

- `plataforma`: `instagram | tiktok | outro`
- `formato`: `carrossel | reel | imagem | video` (TikTok sempre `video`)
- `fonte`: `chrome | manual | oembed`
- `tipo_gancho`: `promessa-pessoal | pergunta | contradicao | lista | erro-comum | bastidor | dado | outro`
- `tipo_cta`: `comente-palavra | salve | compartilhe | siga | link-bio | nenhum`
- `foco` (na ideia, `psn_ideias.foco text[]`): subconjunto de `conteudo | formato | gancho | serie`; `serie` (`psn_ideias.serie`) é o nome da série. Definem quais chaves extras entram em `analise`.
- `tipo_conteudo` do canal: `reels | estatico | utilidade`. `utilidade` = pasta de conteúdo para consumir; preenche `aprendizado` (ver `utilidade.md`).
- `slides[].funcao`: `capa | dor | promessa | passo | prova | lista | pra-quem-serve | cta | outro`

## Campos

| campo | tipo | observação |
|---|---|---|
| `ideia_id` | uuid | chave do upsert |
| `post_id` | text | `ig-<shortcode>` ou `tt-<videoid>` |
| `url` | text | canônica, sem parâmetros de rastreio (utm, `?igsh=`, etc.) |
| `autor` | text | `"@handle"` |
| `plataforma` | text | ver valores válidos |
| `formato` | text | ver valores válidos |
| `n_slides` | integer | 1 para imagem/reel/video |
| `data_publicacao` | date ou null | |
| `fonte` | text | ver valores válidos |
| `curtidas`, `comentarios`, `views` | integer ou null | nunca string |
| `legenda` | text | verbatim |
| `gancho` | text | linha de título da capa, verbatim |
| `tipo_gancho` | text | ver valores válidos |
| `estrutura` | text | sequência com `→`, ex. `"capa → dor → promessa → passo 1 → passo 2 → passo 3 → pra-quem-serve → cta"` |
| `cta` | text | verbatim do pedido de ação |
| `tipo_cta` | text | ver valores válidos |
| `palavra_chave` | text ou null | só se `tipo_cta = comente-palavra` |
| `tags` | text[] | 1 a 3 tags de tema, minúsculas, sem acento (ex.: `["ia","produtividade"]`). Só tema — nada de `formato/...`, `gancho/...` ou `cta/...`, que agora são colunas |
| `slides` | jsonb[] | ver abaixo |
| `analise` | jsonb | ver abaixo |
| `aprendizado` | jsonb ou null | só utilidade: `{tema, resumo, pontos[], como_aplicar}`. Ideias de post: omitir ou `null` |
| `nao_capturado` | jsonb[] | lista de `{item, motivo}` |

### `slides[i]`

```json
{ "n": 1, "funcao": "capa", "texto": "texto verbatim do slide", "visual": "1 linha: o que é a imagem de fundo, sem interpretar", "imagem_path": "<ideia_id>/01.jpg" }
```

Para reel/video: `n_slides: 1`, um único item com `n: 1`, `funcao: "capa"`, a imagem de capa e o texto visível nela (se houver).

### `analise`

```json
{
  "gancho": "o que a capa promete e por que segura o scroll (1 a 2 linhas)",
  "estrutura": "nome do esqueleto + sequência, ex.: tutorial-3-passos-com-print: capa → dor → promessa → passo 1 → passo 2 → passo 3 → pra-quem-serve → cta",
  "desenvolvimento": "como cada bloco relevante entrega (1 linha por bloco)",
  "cta": "mecânica do CTA e o que a pessoa ganha ao agir",
  "por_que_funciona": "2 a 3 linhas, apontando o que carrega o post: tema, familiaridade, conflito, curiosidade ou aha, nessa ordem de peso",
  "o_que_reaproveitar": "2 a 4 itens (uma string, um por linha ou separados por ' | '), cada um dizendo como o canal @handle (nicho, tipo_conteudo) adaptaria esse padrão, considerando o por_que da ideia. Nunca o tema literal do post original",
  "por_slide": ["1 frase sobre o que o slide 1 faz com quem lê", "1 frase sobre o slide 2", "..."]
}
```

Chaves extras, só conforme o `foco` da ideia (ver "Foco marcado" em `analise.md`):

| chave | foco | tipo | conteúdo |
|---|---|---|---|
| `pauta` | `conteudo` | string | tema, ângulo, argumentos e pauta adaptada ao nicho/@ do canal (parágrafo curto) |
| `formato_visual` | `formato` | string | diagramação, capa, hierarquia de texto, paleta, recursos, ritmo, e "como replicar" numerado (sem copiar o tema) |
| `variacoes_gancho` | `gancho` | array de 3 strings | variações do gancho para o nicho do canal |
| `serie` | `serie` | string | como o post se encaixa na série (`ideia.serie`) e o próximo episódio sugerido |

### `aprendizado` (utilidade)

```json
{
  "tema": "uma palavra minúscula sem acento (ganchos, estrategia, planejamento, copy, ferramentas, posicionamento)",
  "resumo": "2 a 3 frases do que o post ensina",
  "pontos": ["item verbatim quando o post é lista", "ou ponto-chave destilado"],
  "como_aplicar": "concreto, no contexto do @/nicho do canal e do por_que da ideia"
}
```

## Exemplo completo (carrossel do Instagram)

```json
{
  "ideia_id": "b3f1c2a0-1111-4a2b-9c3d-000000000001",
  "post_id": "ig-DcWMxHfjiUh",
  "url": "https://www.instagram.com/p/DcWMxHfjiUh/",
  "autor": "@amandadinizmkt",
  "plataforma": "instagram",
  "formato": "carrossel",
  "n_slides": 3,
  "data_publicacao": "2026-08-22",
  "fonte": "chrome",
  "curtidas": 1598,
  "comentarios": 1955,
  "views": null,
  "legenda": "transformei os meus salvos do instagram em memória pro claude 🧠\n\n#ia #produtividade",
  "gancho": "transformei os meus salvos do instagram em memória pro claude",
  "tipo_gancho": "promessa-pessoal",
  "estrutura": "capa → dor → cta",
  "cta": "comenta \"saves\" aqui embaixo que eu te mando no seu direct",
  "tipo_cta": "comente-palavra",
  "palavra_chave": "saves",
  "tags": ["ia", "produtividade"],
  "slides": [
    { "n": 1, "funcao": "capa", "texto": "transformei os meus salvos do instagram em memória pro claude", "visual": "print de um app de notas com título em destaque", "imagem_path": "b3f1c2a0-1111-4a2b-9c3d-000000000001/01.jpg" },
    { "n": 2, "funcao": "dor", "texto": "a gente salva mil coisas... e nunca mais acha", "visual": "grade de posts salvos do instagram", "imagem_path": "b3f1c2a0-1111-4a2b-9c3d-000000000001/02.jpg" },
    { "n": 3, "funcao": "cta", "texto": "comenta \"saves\" aqui embaixo que eu te mando no seu direct", "visual": "foto da autora sorrindo, celular na mão", "imagem_path": "b3f1c2a0-1111-4a2b-9c3d-000000000001/03.jpg" }
  ],
  "analise": {
    "gancho": "promessa pessoal com resultado concreto: quem lê pensa \"eu também tenho esse problema\".",
    "estrutura": "promessa-direta-com-cta: capa → dor → cta",
    "desenvolvimento": "a dor no slide 2 nomeia um problema que quem rola o feed reconhece na hora, sem precisar de passo a passo.",
    "cta": "pede um comentário com palavra-chave para liberar o direct; baixo atrito, alta taxa de resposta.",
    "por_que_funciona": "o gancho carrega o post: é uma dor universal de quem usa redes sociais, não específica do nicho de IA. A familiaridade (\"todo mundo já perdeu um post salvo\") é o que segura o scroll.",
    "o_que_reaproveitar": "para @meucanal (nicho fitness, reels): abrir com uma dor universal do público antes de qualquer dica técnica | trocar a promessa por um resultado concreto e pessoal, não genérico | testar CTA de comentar palavra-chave em vez de \"salve este post\", que já está saturado",
    "por_slide": [
      "Promessa pessoal + resultado concreto: quem lê pensa \"eu também tenho esse problema\".",
      "Nomeia uma dor que quem lê reconhece na hora.",
      "Pede ação de baixo atrito com recompensa clara (o direct)."
    ]
  },
  "nao_capturado": [
    { "item": "assinatura_slides", "motivo": "nome de exibição omitido (regra 2)" }
  ]
}
```

## Exemplo completo (utilidade)

Canal `@meucanal` com `tipo_conteudo = utilidade`. Carrossel que lista ganchos. `analise.o_que_reaproveitar` vazio, `aprendizado` preenchido.

```json
{
  "ideia_id": "b3f1c2a0-2222-4a2b-9c3d-000000000002",
  "post_id": "ig-DxEXEMPLO01",
  "url": "https://www.instagram.com/p/DxEXEMPLO01/",
  "autor": "@exemplo.copy",
  "plataforma": "instagram",
  "formato": "carrossel",
  "n_slides": 4,
  "data_publicacao": "2026-09-14",
  "fonte": "manual",
  "curtidas": 5200,
  "comentarios": 310,
  "views": null,
  "legenda": "5 ganchos que eu mais uso. salva pra consultar na hora de escrever 📌",
  "gancho": "5 ganchos que nunca falham",
  "tipo_gancho": "lista",
  "estrutura": "capa → lista → lista → cta",
  "cta": "salva esse post pra usar depois",
  "tipo_cta": "salve",
  "palavra_chave": null,
  "tags": ["ganchos", "copy"],
  "slides": [
    { "n": 1, "funcao": "capa", "texto": "5 ganchos que nunca falham", "visual": "fundo liso com título grande", "imagem_path": "b3f1c2a0-2222-4a2b-9c3d-000000000002/01.jpg" },
    { "n": 2, "funcao": "lista", "texto": "1. O erro que ninguém te conta sobre X\n2. Eu testei X por 30 dias", "visual": "texto sobre fundo liso", "imagem_path": "b3f1c2a0-2222-4a2b-9c3d-000000000002/02.jpg" },
    { "n": 3, "funcao": "lista", "texto": "3. Pare de fazer X (faça Y)\n4. O que ninguém fala sobre X\n5. X em 3 passos", "visual": "texto sobre fundo liso", "imagem_path": "b3f1c2a0-2222-4a2b-9c3d-000000000002/03.jpg" },
    { "n": 4, "funcao": "cta", "texto": "salva esse post pra usar depois", "visual": "fundo liso com texto centralizado", "imagem_path": "b3f1c2a0-2222-4a2b-9c3d-000000000002/04.jpg" }
  ],
  "analise": {
    "gancho": "número + adjetivo absoluto (\"nunca falham\") promete atalho e segura o scroll.",
    "estrutura": "lista-simples: capa → lista → lista → cta",
    "por_que_funciona": "utilidade direta: o post é um banco de consulta, o aha é poder copiar na hora de escrever.",
    "o_que_reaproveitar": "",
    "por_slide": [
      "Promete atalho com número e absoluto.",
      "Entrega os dois primeiros ganchos prontos para copiar.",
      "Completa a lista com mais três ganchos de mecanismos diferentes.",
      "Pede salvar, porque o valor está em consultar depois."
    ]
  },
  "aprendizado": {
    "tema": "ganchos",
    "resumo": "Lista de 5 formatos de gancho reutilizáveis, cada um com um mecanismo diferente: revelação, teste pessoal, contradição, bastidor e passo a passo. Serve como banco de consulta ao escrever capas.",
    "pontos": [
      "O erro que ninguém te conta sobre X",
      "Eu testei X por 30 dias",
      "Pare de fazer X (faça Y)",
      "O que ninguém fala sobre X",
      "X em 3 passos"
    ],
    "como_aplicar": "Para @meucanal (nicho fitness): trocar X por temas do nicho, ex. abrir um carrossel de treino com o formato de teste pessoal, e guardar os cinco formatos como checklist antes de fechar a capa, já que o por_que da ideia era \"ganhar ritmo nas capas\"."
  },
  "nao_capturado": []
}
```

## Reel / TikTok (`video`)

Para `formato: reel` ou `formato: video`, `n_slides: 1`, um único item em `slides` (`n: 1`, `funcao: "capa"`) com a imagem de capa e o texto visível nela, e `nao_capturado` inclui `{"item":"audio","motivo":"transcrição não feita no v0.1"}`.

## Fonte manual ou oembed

`fonte: manual` (Instagram sem Chrome) ou `fonte: oembed` (TikTok via oEmbed). Métricas e data que não vieram da fonte ficam `null` e entram em `nao_capturado`.
