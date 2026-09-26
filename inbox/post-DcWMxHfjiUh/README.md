# Insumo: post DcWMxHfjiUh (@amandadinizmkt)

- Post: https://www.instagram.com/p/DcWMxHfjiUh/ ("transformei os meus salvos do instagram em memória pro claude")
- Coleta: 2026-09-26, ~15:50–16:15 BRT (dump da API às 2026-09-26T19:05:05Z)
- Ferramenta: Claude in Chrome (sessão logada como @sorell.ai) + API web do Instagram chamada de dentro da página; `curl` para o link da bio.
- Regra seguida: texto verbatim, sem paráfrase. O que faltou está marcado como "NÃO CAPTURADO: motivo".

## Índice

| Arquivo | Conteúdo |
|---|---|
| `post.md` | 2a autor/bio/links · 2b legenda verbatim · 2c 8 slides transcritos + alt-text · 2d métricas · 2f recurso |
| `slides/01.png … 08.png` | as 8 imagens originais do carrossel (1080x1350) |
| `comentarios.md` | 2e: 15 selecionados com respostas da autora e marcações + anexo com os 665 comentários lidos |
| `relacionados.md` | 3: 5 posts relacionados (URL, legenda, transcrição, métricas, alt-text) |
| `relacionados/<código>/NN.jpg` | imagens dos posts relacionados (reels: só a capa) |
| `link-bio.md` | 2f: texto das 2 páginas do link da bio (workshop R$ 97 + hub de produtos) |

## O que falhou / limitações

- Slides: salvei as imagens originais baixadas do CDN, não screenshots da tela. É o mesmo conteúdo em resolução maior.
- Comentários: foram lidos 665 dos 1955. A paginação parou aí. As respostas vêm só das 60 primeiras threads que tinham resposta (+2 buscadas à parte).
- Métricas de visualização, compartilhamento e salvamento: NÃO CAPTURADO, porque o Instagram não mostra esses números em posts de terceiros.
- Prompt enviado por DM (o "recurso" do post): NÃO CAPTURADO. Fica nas DMs de @sorell.ai, que comentou "saves" e recebeu a resposta "prontinho, te enviei!". Não abri as DMs porque isso estava fora do escopo.
- Link da bio: o Chrome não deixou navegar até divosdaia.com.br (domínio não permitido). Por isso usei `curl` no HTML público.
- Relacionados: nenhum outro post trata exatamente do mesmo mecanismo. Os 5 escolhidos são os mais próximos, e o critério está em `relacionados.md`.
- Reels relacionados: o áudio não foi transcrito, só a capa (NÃO CAPTURADO).
- Transcrições dos slides feitas por leitura das imagens (modelo com visão). Em textos pequenos de prints dentro dos slides pode haver erro pontual.
- Repositório: `origin/claude/determined-albattani-dq7m06` não existia (repo remoto vazio). A branch foi criada localmente, e este é o primeiro commit.
