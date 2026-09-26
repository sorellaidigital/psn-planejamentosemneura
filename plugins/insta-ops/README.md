# insta-ops

## O que é

v0 do mecanismo "referências → padrões → pautas → carrossel" para Instagram. Hoje só o primeiro elo existe: salvar posts como notas de referência num vault do Obsidian, prontas para virar padrão de conteúdo depois. O resto do mecanismo (analisar padrões, gerar pauta, montar carrossel) ainda não existe.

## Requisitos

- Claude Code 2.1 ou superior (plugins com `userConfig`).
- Extensão Claude in Chrome conectada e logada no Instagram, para a captura automática (`/insta-ops:ref-ig <url>`).
- Um vault do Obsidian, com uma pasta local acessível pelo Claude Code.

## Instalar

No terminal:

```bash
claude plugin marketplace add sorellaidigital/mecanismo-inst
claude plugin install insta-ops@sorellai
```

A partir de um clone local, troque a primeira linha por `claude plugin marketplace add ./mecanismo-inst`.

Dentro do Claude Code, aponte o vault (a pasta que contém `.obsidian/`):

```
/plugin configure insta-ops
```

Sem `vault_dir` configurado, a skill pergunta o caminho a cada execução. Na primeira captura, o Claude Code vai pedir permissão para as ferramentas do Chrome e para `curl`, `cp` e `mkdir`; isso é esperado.

## Usar

```
/insta-ops:ref-ig <url>
/insta-ops:ref-ig <url1> <url2> <url3>
/insta-ops:ref-ig --manual
```

Aceita um ou vários links de `instagram.com/p/...` ou `instagram.com/reel/...` na mesma chamada.

Com `--manual`, funciona sem o Chrome. A skill pede, numa mensagem só: URL, @ do autor, legenda colada, formato, os prints dos slides como arquivos (arraste cada arquivo para o terminal, que cola o caminho) ou o texto de cada um, o que você souber de data, curtidas e comentários, e por que salvou.

## O que a nota contém

- Legenda e texto dos slides, verbatim.
- @ do autor, formato, data, curtidas e comentários (contagem).
- Gancho, tipo de gancho, estrutura do carrossel, CTA e palavra-chave.
- Seção de análise: por que funciona e o que reaproveitar como padrão.
- Por que você salvou aquele post.

Fica em `<vault>/Referências Instagram/<autor>/<id>.md`, com as imagens em `_anexos/<id>/` e um índice em `_Índice.md`. O formato completo está em `skills/ref-ig/references/modelo-nota.md`. Esqueleto:

```markdown
---
tipo: referencia-instagram
id: ig-XXXXXXXXXXX
autor: "@handle"
formato: carrossel
gancho: "linha de título da capa"
estrutura: "capa → dor → promessa → passo 1 → passo 2 → passo 3 → pra-quem-serve → cta"
cta: "texto verbatim do pedido de ação"
por_que_salvei: "sua resposta"
tags: [instagram/referencia, formato/carrossel, gancho/promessa-pessoal, cta/comente-palavra]
---
# linha de título da capa
## Legenda (verbatim)
## Slides            (imagem + texto verbatim + 1 linha de visual, por slide)
## Análise           (1 frase por slide + gancho, estrutura, CTA, por que funciona, o que reaproveitar)
## Não capturado
```

## O que não faz

- Não publica nada no Instagram.
- Não baixa posts salvos em lote.
- Não usa Instaloader nem nenhuma automação de scraping em massa.
- Não guarda dado de terceiro além do @ público do autor do post no texto da nota (sem nome de exibição, bio, e-mail, seguidores ou handle de quem comentou). As imagens em `_anexos/` são os slides como publicados e podem mostrar nome, rosto ou posts de outras pessoas; o vault é seu e privado, mas não republique essas imagens.

## Limites conhecidos

- Só roda de ponta a ponta (captura automática) em sessão local com Claude in Chrome.
- Reels são salvos sem transcrição de áudio, só com o texto visível na capa.
- Em sessão cloud, sem Chrome disponível, só funciona no modo manual.

## Roadmap

- v0.1: analisar as notas salvas e consolidar em `Padrões.md`.
- v0.2: configurar o perfil da pessoa (nicho, público, tom) e gerar pautas a partir dos padrões.
- v0.3: montar carrossel em PNG a partir de uma pauta aprovada.
- v0.4: reels com transcrição de áudio e exportação oficial em lote.
- v1: semana de conteúdo orquestrada, com métricas e publicação.

## Licença

MIT.
