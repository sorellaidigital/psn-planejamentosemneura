# insta-ops

## O que é

v0 do mecanismo "referências → padrões → pautas → carrossel" para Instagram. Hoje só o primeiro elo existe: salvar posts como notas de referência num vault do Obsidian, prontas para virar padrão de conteúdo depois. O resto do mecanismo (analisar padrões, gerar pauta, montar carrossel) ainda não existe.

## Requisitos

- Claude Code 2.1 ou superior (plugins com `userConfig`).
- Extensão Claude in Chrome conectada e logada no Instagram, para a captura automática (`/insta-ops:ref-ig <url>`).
- Um vault do Obsidian, com uma pasta local acessível pelo Claude Code.

## Instalar

```bash
claude plugin marketplace add sorellaidigital/mecanismo-inst
claude plugin install insta-ops@sorellai
/plugin configure insta-ops
```

O `configure` pede o caminho da pasta raiz do vault (`vault_dir`). Sem isso configurado, a skill pergunta o caminho a cada execução.

## Usar

```
/insta-ops:ref-ig <url>
/insta-ops:ref-ig <url1> <url2> <url3>
/insta-ops:ref-ig --manual
```

Aceita um ou vários links de `instagram.com/p/...` ou `instagram.com/reel/...` na mesma chamada. Com `--manual`, funciona sem o Chrome: você cola legenda, autor e prints dos slides.

## O que a nota contém

- Legenda e texto dos slides, verbatim.
- @ do autor, formato, data, curtidas e comentários (contagem).
- Gancho, tipo de gancho, estrutura do carrossel, CTA e palavra-chave.
- Seção de análise: por que funciona e o que reaproveitar como padrão.
- Por que você salvou aquele post.

Fica em `<vault>/Referências Instagram/<autor>/<id>.md`, com as imagens em `_anexos/<id>/` e um índice em `_Índice.md`.

## O que não faz

- Não publica nada no Instagram.
- Não baixa posts salvos em lote.
- Não usa Instaloader nem nenhuma automação de scraping em massa.
- Não guarda dado de terceiro além do @ público do autor do post (sem nome de exibição, bio, e-mail, seguidores ou handle de quem comentou).

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
