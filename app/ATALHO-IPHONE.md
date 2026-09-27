# Atalho do iPhone: Compartilhar → Salvar ideia

Com este Atalho, no Instagram ou no TikTok você toca em **Compartilhar → Salvar ideia**, e o app abre com o link já preenchido. Aí é só escrever a ideia e o motivo e salvar.

## Montar (uma vez só, uns 2 minutos)

1. Abra o app **Atalhos** e toque em **+** para criar um atalho novo.
2. Toque no nome no topo e renomeie para **Salvar ideia**.
3. Toque no ícone **ⓘ** (Detalhes) e ative **Mostrar na Folha de Compartilhamento**. Em **Tipos da Folha de Compartilhamento**, deixe marcados só **URLs** e **Texto**. Toque em **OK**.
4. No topo aparece o bloco "Receber **Qualquer** de Folha de Compartilhamento". Em "Se não houver entrada", escolha **Obter Área de Transferência**. Assim o atalho também funciona quando você copia o link e roda o atalho direto.
5. Adicione a ação **Codificar URL** (busque por "codificar"). A entrada deve ser **Entrada do Atalho**.
6. Adicione a ação **Texto** e escreva exatamente:
   `https://planejamento-sem-neura.netlify.app/#/capturar?ref=`
   Logo depois do `=`, sem espaço, toque em **Variáveis** e escolha **URL Codificada**.
7. Adicione a ação **Abrir URLs**. A entrada deve ser o **Texto** do passo anterior.
8. Toque em **OK** para salvar.

## Usar

1. No post ou vídeo, toque em **Compartilhar**. No Instagram é o avião de papel; no TikTok, a seta.
2. Role a linha de apps até o fim e toque em **Mais**, depois em **Salvar ideia**. Se não aparecer, toque em **Copiar link** e rode o atalho pela tela de início ou pelo widget.
3. O app abre com o link preenchido e o canal de ideias sugerido: TikTok ou Reels vão para o canal de reels; post do Instagram vai para o canal estático. Confira o canal, escreva a ideia e **por que chamou atenção**, e toque em **Salvar ideia**.

A ideia entra como **Pendente** no canal de ideias. No PC, `/insta-ops:fila` processa a fila, e a análise aparece na ficha da ideia.

## Notas

- O atalho abre o Safari, não o ícone do app na tela inicial. Os dados são os mesmos, porque tudo fica no Supabase.
- Se o Instagram ou o TikTok compartilhar texto junto com o link, o app extrai só o primeiro link.
- Sem internet, a ideia fica guardada no aparelho e sobe sozinha quando a conexão voltar. Isso vale para o navegador onde você salvou; se foi pelo Safari do atalho, é ao abrir o app no Safari.
- É preciso ter pelo menos um canal com finalidade **Ideias**. Se não houver, o app abre o formulário de novo canal já com Ideias marcado.
