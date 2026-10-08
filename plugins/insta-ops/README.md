# insta-ops

## O que é

v0.2 do mecanismo "referências → padrões → pautas → carrossel" para Instagram e TikTok. O primeiro elo funciona de ponta a ponta: no celular a pessoa salva uma ideia (link + por que chamou a atenção) no app "Planejamento sem Neura"; no PC, `/insta-ops:fila` processa a fila, captura e analisa cada post, e o resultado aparece na ficha da ideia no app. O resto do mecanismo (consolidar padrões, gerar pauta, montar carrossel) ainda não existe.

## Fluxo

1. **Celular:** salvar a ideia no app Planejamento sem Neura (ou pelo Atalho do iPhone, documentado em `app/ATALHO-IPHONE.md`) — um canal com finalidade "ideias", um link de Instagram ou TikTok, e uma linha de "por que isso chamou sua atenção". A ideia entra automaticamente na fila (`mec_status: pendente`).
2. **PC:** rodar `/insta-ops:fila`. A skill lista a fila, captura cada post (Chrome ou manual para Instagram; oEmbed, com Chrome opcional, para TikTok), analisa (gancho, estrutura, CTA, slide a slide, o que reaproveitar no contexto do canal) e grava tudo no Supabase.
3. **App:** a análise aparece na ficha da ideia, com as imagens dos slides.

Também dá para colar um link solto direto no chat (`/insta-ops:ref-ig <url>`), fora da fila: a skill cria a ideia no canal certo e processa na hora.

## Três usos

A ideia salva no app cai num de três usos, conforme o canal e as marcações:

1. **Ideia de post com foco:** canal de ideias comum (`reels` ou `estatico`). Na ideia, `foco` diz o que chamou a atenção: `conteudo`, `formato`, `gancho`, `serie` (vários permitidos, ou nenhum).
2. **Série:** foco `serie` mais o nome da série (`serie`). A análise diz como o post entra na série e sugere o próximo episódio.
3. **Utilidade:** canal com tipo `utilidade`, uma pasta de conteúdo que você CONSOME para aprender e aplicar (lista de ganchos, post de estratégia ou planejamento). Não é pauta de post.

### Como a análise muda

A análise base (gancho, estrutura, CTA, slide a slide, o que reaproveitar) é sempre preenchida nas ideias de post. O foco acrescenta profundidade:

- `conteudo` → `analise.pauta`: tema, ângulo, argumentos e uma pauta adaptada ao nicho do canal.
- `formato` → `analise.formato_visual`: diagramação, capa, hierarquia de texto, paleta, recursos, ritmo e "como replicar" numerado, olhando cada imagem. Nunca copia o tema.
- `gancho` → gancho e CTA mais detalhados, mais `analise.variacoes_gancho` (3 variações para o nicho).
- `serie` → `analise.serie`: encaixe na série e próximo episódio sugerido.
- Utilidade → preenche `aprendizado` (`tema`, `resumo`, `pontos`, `como_aplicar`) em vez de `o_que_reaproveitar`. Listas (ex.: ganchos) são copiadas verbatim, um item por ponto.

Sugestão de rotina: rodar `/insta-ops:fila` uma vez por semana.

## Requisitos

- Claude Code 2.1 ou superior (plugins com `userConfig`).
- Um projeto Supabase com as tabelas do app Planejamento sem Neura e as migrações `psn_mecanismo_v1` e `psn_mecanismo_v2` aplicadas.
- Extensão Claude in Chrome conectada e logada no Instagram, para a captura automática de posts do Instagram. TikTok funciona em qualquer sessão, com ou sem Chrome (via oEmbed).

## Instalar

No terminal:

```bash
claude plugin marketplace add sorellaidigital/psn-planejamentosemneura
claude plugin install insta-ops@sorellai
```

A partir de um clone local, troque a primeira linha por `claude plugin marketplace add ./psn-planejamentosemneura`.

Dentro do Claude Code, configure a URL e a chave do mesmo projeto Supabase do app:

```
/plugin configure insta-ops
```

- **URL do projeto Supabase**: ex. `https://xxxx.supabase.co`.
- **Chave anon do Supabase**: a chave pública (anon), a mesma usada pelo app.

Sem essas configurações, a skill pergunta os dois valores a cada execução. Na primeira captura, o Claude Code vai pedir permissão para as ferramentas do Chrome e para `curl`, `mktemp`, `cp` e `python3`; isso é esperado.

## Usar

```
/insta-ops:fila
/insta-ops:fila --manual
/insta-ops:fila --limite 5
/insta-ops:fila --canal "@meucanal"
```

Processa a fila de ideias pendentes (ou com erro) dos canais de finalidade "ideias" (inclusive pastas de utilidade), uma por uma, sem parar no primeiro erro. O resumo final separa ideias e utilidades.

```
/insta-ops:ref-ig <url>
/insta-ops:ref-ig --manual
```

Processa um link solto, fora da fila (cria a ideia e processa na hora). Se o canal escolhido não é de utilidade, pergunta em uma linha o foco (opcional) e o nome da série. Aceita um link de `instagram.com/p/...`, `instagram.com/reel/...` ou `tiktok.com/...`.

Com `--manual`, o Instagram funciona sem o Chrome. A skill pede, numa mensagem só: URL, @ do autor, legenda colada, formato, os prints dos slides como arquivos (arraste cada arquivo para o terminal, que cola o caminho) ou o texto de cada um, e o que você souber de data, curtidas e comentários.

## O que a referência contém

Grava em `psn_referencias` (uma por ideia): legenda e texto dos slides verbatim, @ do autor, plataforma, formato, data, curtidas/comentários/views, gancho, tipo de gancho, estrutura do post, CTA, slides com imagem e transcrição, e uma análise (por que funciona, e o que reaproveitar — adaptado ao nicho e ao tipo de conteúdo do canal que salvou a ideia), com as chaves extras do foco ou, em utilidade, o `aprendizado`. O contrato completo, com o exemplo em JSON, está em `skills/ref-ig/references/modelo-referencia.md`.

As imagens dos slides ficam no Storage do Supabase, bucket `psn-referencias`, caminho `<ideia_id>/NN.jpg`.

## O que não faz

- Não publica nada no Instagram ou TikTok.
- Não baixa posts salvos em lote.
- Não usa Instaloader nem nenhuma automação de scraping em massa.
- Não transcreve áudio (reels e vídeos de TikTok são analisados só pela capa e pelo texto visível na tela).
- Não guarda dado de terceiro além do @ público do autor do post (sem nome de exibição, bio, e-mail, seguidores ou handle de quem comentou). As imagens dos slides são as publicadas e podem mostrar nome, rosto ou posts de outras pessoas; o bucket é do seu projeto Supabase, sem autenticação de acesso (RLS aberta), mas não republique essas imagens.

## Limites conhecidos

- Instagram: captura automática só roda com Claude in Chrome numa sessão local; sem Chrome, usa o modo manual.
- TikTok: funciona em qualquer sessão via oEmbed (título, autor, capa); com Chrome, complementa com curtidas/comentários/views.
- Sem transcrição de áudio.
- Acesso ao Supabase é aberto (RLS `true`/sem login), igual ao resto do app — não é uma API pública, mas também não tem autenticação própria.

## Roadmap

- v0.1: fila conectada ao app, Instagram + TikTok, sem Obsidian. ✓
- v0.2: foco por ideia (conteúdo, formato, gancho, série) e pasta de utilidades com `aprendizado`. ✓
- v0.3: consolidar `psn_referencias` em padrões (via SQL sobre o próprio Supabase).
- v0.4: gerar pautas a partir dos padrões e do perfil de cada canal.
- v0.5: montar carrossel em PNG a partir de uma pauta aprovada.
- v0.6: transcrição de áudio para reels e TikTok.
- v1: semana de conteúdo orquestrada, com métricas e publicação.

## Licença

MIT.
