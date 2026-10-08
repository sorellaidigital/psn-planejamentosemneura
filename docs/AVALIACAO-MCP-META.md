# Avaliação: MCP oficial da Meta × coletor `psn-ig-sync` (08/10/2026)

Pesquisa e avaliação. Nada foi implementado: tabelas, rotinas e app ficaram como estavam.

## Conclusão

A Meta **não tem MCP oficial para Instagram orgânico**: nenhuma ferramenta de insights de conta, posts, stories ou
público. Os MCPs oficiais são de **anúncios**, de **ferramentas de desenvolvedor** e de **WhatsApp**. A atualização
de setembro/2026 é toda de anúncios e WhatsApp. Para as abas Stories e Público, o caminho é estender o `psn-ig-sync`
(a Graph API já entrega esses dados). O MCP de anúncios só serve se a Duda impulsionar ou anunciar, e nesse caso só
em sessão interativa, com regra de leitura apenas, nunca numa rotina.

## 1. O que a Meta oferece (fontes oficiais)

Fonte principal: a página oficial dos MCPs da Meta, https://developers.facebook.com/documentation/mcp (e o índice
`/documentation/mcp/llms.txt`). Ela se apresenta como "servidores MCP remotos oficiais para integrar recursos de
Facebook, Instagram, WhatsApp e Meta Ads", mas lista só **três servidores**: Meta Ads MCP, Meta Social Technologies
MCP e WhatsApp Business Tools MCP. **Nenhum é de Instagram** (nem de Páginas ou Threads): o Instagram aparece só na
frase de abertura. Regras comuns descritas na página:
- OAuth com escopo **Read** ou **Manage** por app, ajustável e revogável em Configurações do Facebook → Business
  Integrations;
- clientes validados: Claude Desktop, Claude Code, ChatGPT (web), Codex (app e CLI), Cursor (app e CLI); outros
  "em breve" e por enquanto sem suporte;
- segurança: o agente pode fazer qualquer chamada que o escopo permite, inclusive sob instruções escondidas em
  conteúdo não confiável (payloads, documentos, páginas, saídas de ferramentas). A Meta recomenda **não dar escopo
  de escrita/Manage a agente que processa conteúdo não confiável**, manter Read por padrão, separar apps de
  desenvolvimento e produção e revisar os servidores conectados a cada poucos meses.

| Servidor | Endereço | O que expõe | Autenticação | Situação |
|---|---|---|---|---|
| **Ads MCP** | `https://mcp.facebook.com/ads` (hospedado pela Meta, HTTP) | Relatórios de anúncios (`ads_get_ad_entities` com filtros, quebras e período; tendência, anomalia, benchmarks de leilão e de setor, nota de oportunidade); criar, editar e apagar campanhas, conjuntos e anúncios; públicos personalizados; catálogos; sinais/datasets; testes A/B e de lift; log de atividade; busca na Central de Ajuda | OAuth do Facebook Login for Business (o cliente MCP abre a tela) ou token de usuário como Bearer. Escopos: `ads_mcp_management`, `ads_read`, `ads_management`, `catalog_management`, `business_management`, `pages_show_list`, `instagram_basic`. App próprio da Meta opcional | Beta aberto desde 29/04/2026; desde 16/07 qualquer app conecta; liberação de ferramentas gradual |
| **Meta Social Technologies MCP** (antigo Developer Tools MCP) | `https://mcp.facebook.com/devtools` | 11 ferramentas de gestão do app: configuração, App Review, compliance, uso e limites da API, changelog e depreciações, webhooks, busca na documentação. **Não lê dados** do Instagram | OAuth da conta de desenvolvedor, escopo Read ou Manage por app | Beta, liberação gradual |
| **WhatsApp Business Tools MCP** | ver documentação | Configuração de WhatsApp Business (números, templates, webhooks, envio de teste) | OAuth do Facebook Login for Business | Anunciado em 15/09/2026, para desenvolvimento e teste |

Os dois endpoints `mcp.facebook.com` responderam **401** sem autorização em 08/10/2026 (no ar e protegidos por OAuth).

**Atualização de setembro/2026:**
- 15/09: Partnership Ads chegando ao Ads MCP (criar anúncios de parceria e gerenciar permissões de criadores pelo
  agente), com liberação "até o fim de 2026";
- 15/09: WhatsApp Business Tools MCP;
- 22/09: as **regras do agente** (o que o agente pode fazer em cada conta de anúncio ou catálogo) passaram a ser
  configuráveis em lote pela Marketing API. Antes, só uma a uma no Business Suite (painel criado em agosto, que
  veio com todas as ações liberadas, orçamento incluído).

**Custo:** a Meta não publica preço. Está gratuito durante o beta. **Limites:** a documentação do MCP não fixa
limites próprios; valem os da Marketing API (rate limiting por conta de anúncio).

**O que não existe em MCP oficial:** insights orgânicos de conta, de mídia, de stories e demografia do público. Os
"Instagram MCP" que aparecem nas buscas são de terceiros (embrulham a mesma Graph API com o token da pessoa).
Fora do MCP, a Meta tem análise de insights do Instagram dentro dos próprios produtos (Meta AI para pequenas empresas,
19/08; assistente do Edits no Meta One), sem integração externa.

## 2. MCP × coletor atual

| | Ads MCP | `psn-ig-sync` |
|---|---|---|
| Conta orgânica (alcance, views, interações, seguidores) | Não | Sim, diário, 28 dias de janela + histórico importado desde 03/06 |
| Posts e Reels (métricas por mídia) | Não | Sim, snapshot a cada execução, degradação automática de métricas |
| Stories | Não | Não (fora da v1) |
| Demografia do público | Não (só segmentação/quebras de anúncio) | Não (fora da v1) |
| Anúncios/impulsionamentos | Sim (leitura e escrita) | Não |
| Histórico | Não guarda; consulta na hora | No banco, idempotente |
| Agendamento | Não; precisa de sessão aberta | pg_cron a cada 4h, sem sessão |
| Token | Token de usuário do OAuth, dentro do cliente MCP | Token de página nos segredos da Edge Function; saúde diária; vence o acesso em 04/01/2027 |

O MCP entrega só o que o coletor não toca (anúncios). Stories e Público continuam sem fonte nos dois.

**Stories e Público pela Graph API (sem MCP):**
- **Stories:** `/{ig-user-id}/stories` lista os ativos; os insights de cada story (views, reach, replies, shares,
  total_interactions, follows, profile_visits, navigation) só existem **enquanto o story está no ar (24h)**. Consulta
  ad hoc perde tudo o que expirou; precisa de coleta agendada gravando no banco, que é o que o coletor já faz.
  Com cron a cada 4h, o último retrato de cada story fica até 4h antes de expirar.
- **Público:** métricas `follower_demographics` e `engaged_audience_demographics` na conta, com `breakdown`
  (`age`, `gender`, `city`, `country`) e `timeframe`. Snapshot diário ou semanal basta.
- **Visitas ao perfil** (pendência 5 do ESTADO.md) entra na mesma rodada.

Os nomes de métrica acima precisam ser conferidos contra a v25 numa execução de teste; a degradação do coletor já
cobre métrica rejeitada.

## 3. Formas de integração

### (a) Conector MCP para consulta ad hoc

- **Esforço:** baixo. Adicionar `https://mcp.facebook.com/ads` como conector personalizado no claude.ai, fazer o
  OAuth e configurar a regra da conta de anúncio como leitura apenas (Business Settings → Integrations → Ads MCP Server).
- **Ganho:** só se houver anúncio ou impulsionamento. Sem conta de anúncio ativa, não há nada para ler.
- **Riscos:**
  - escopo amplo: `ads_management` e `business_management` permitem mexer em orçamento, campanhas e no portfólio;
    o painel de regras veio com tudo liberado;
  - **rotina que lê texto de terceiros** (Pauta do Dia lê referências, legendas e comentários): um texto injetado
    pode levar o agente a criar ou alterar anúncio e gastar dinheiro. Mesma razão pela qual as rotinas não têm o
    conector do Supabase, e é exatamente o caso que a página oficial dos MCPs manda evitar. Não dar este conector a
    rotina nenhuma;
  - o token fica no cliente MCP (fora do nosso controle de saúde) e é de usuário, não de página;
  - há relatos de terceiros de timeout de 30 s no Claude Code CLI (funcionando no claude.ai web).
- **O que muda no app:** nada.

### (b) MCP como fonte para tabelas novas

- **Stories e Público:** impossível; o MCP não tem esses dados.
- **Anúncios no PSN:** possível em tese, mas MCP é interface para agente, não para ETL: exige sessão, OAuth
  interativo e um modelo no meio, sem garantia de formato. Se a Duda quiser anúncios no app, o certo é o
  `psn-ig-sync` (ou uma função irmã) chamar a Marketing API (`/act_{id}/insights`) com um token que tenha `ads_read`,
  gravando em `psn_ig_anuncio_*` com as mesmas regras (anon lê, service role escreve).
- **Esforço (via coletor, não via MCP):** médio. Migração, etapa nova no coletor, aba no app, escopo novo no token
  (reautorizar o app da Meta, o que pode coincidir com a renovação de 04/01/2027).
- **O que muda no app:** aba Anúncios (não prevista no ESTADO.md).

### (c) Não usar

- **Esforço:** zero. Recomendado para o orgânico, que é o que o PSN mede hoje.
- **O que muda:** nada; Stories e Público vêm do coletor estendido.

## 4. Disponibilidade nesta conta (08/10/2026)

- `ListConnectors` com "meta", "instagram", "facebook": nenhum conector instalado.
- `SearchMcpRegistry`: o diretório não tem conector oficial da Meta (só terceiros de anúncios: Windsor.ai,
  Supermetrics, Adspirer etc.). O Ads MCP só entra como conector personalizado pela URL.
- Teste de leitura: não foi possível (sem conector e sem OAuth). Só a sondagem sem credencial, que deu 401.

## Plano em camadas

1. **Agora:** nada muda. Terminar o C6 (paralelo até 15/10 e ok da Duda).
2. **Próxima rodada, módulo Stories/Público pelo coletor:**
   - migração `psn_ig_story` (+ insights por captura) e `psn_ig_publico` (data, tipo, breakdown, chave, valor),
     mesmas políticas das `psn_ig_*`;
   - etapas novas no `psn-ig-sync`: stories ativos a cada execução; demografia 1x por dia; `profile_views` na conta;
     testes offline como os atuais;
   - abas Stories e Público no app;
   - conferir os nomes de métrica na v25 antes (uma execução manual com `detalhe` das removidas).
3. **Só se a Duda anunciar ou impulsionar:** decidir entre (a) Ads MCP no claude.ai, em sessão interativa, regra
   de leitura apenas, sem rotina; e/ou (b) anúncios no PSN via Marketing API no coletor.
4. **Opcional, baixo risco:** Meta Social Technologies MCP (escopo Read) em sessão interativa para manutenção do
   coletor: changelog e depreciações da Graph API, uso e limites do app. Não lê dados de ninguém.
5. **Acompanhar:** reavaliar se a Meta lançar MCP de Instagram orgânico (a página `developers.facebook.com/documentation/mcp`
   lista os servidores).

## Fontes

- **Página oficial dos MCPs da Meta (fonte principal):** https://developers.facebook.com/documentation/mcp ; índice: https://developers.facebook.com/documentation/mcp/llms.txt ; Ads MCP no índice: https://developers.facebook.com/documentation/mcp/ads-mcp-server.md
- Ads MCP, visão geral: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview
- Ads MCP, primeiros passos (escopos, OAuth, token): https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started.md
- Ads MCP, ferramentas de relatório: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-comprehensive-reporting.md
- Anúncio do Ads MCP para desenvolvedores (16/07, atualizado em 22/09): https://developers.facebook.com/blog/post/2026/07/16/meta-ads-mcp-server/
- Meta Ads AI Connectors (29/04, beta aberto): https://www.facebook.com/business/news/meta-ads-ai-connectors
- IAB Global Creator Week (15/09, Partnership Ads no MCP): https://www.facebook.com/business/news/iab-global-creator-week-making-it-easier-for-businesses-to-partner-with-creators
- Meta Social Technologies MCP: https://developers.facebook.com/documentation/mcp/devtools-mcp
- WhatsApp Business Tools MCP (15/09): https://developers.facebook.com/blog/post/2026/09/15/whatsapp-business-messaging-mcp-ai-agent/
- Graph API e Marketing API v26.0 (29/07): https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/
- Meta One (setembro, assistente do Edits): https://about.fb.com/news/2026/09/introducing-meta-one-subscription-service-more-features-ai/
- Terceiros (só como indício, não confirmados pela Meta): painel de regras de agosto e timeout no CLI,
  https://admakeai.com/blog/meta-ads-updates-september-2026 ; resumo de setembro, https://adsuploader.com/blog/meta-ads-updates

Nota:
- A documentação do MCP não diz "GA" nem traz preço ou limites próprios; "gratuito no beta" vem de terceiros e do
  silêncio da Meta sobre cobrança.
- A Graph API v26.0 saiu em 29/07; o coletor está na v25.0. A v26 não mudou métricas orgânicas no anúncio
  (só removeu o posicionamento Explore de anúncios). A data de fim da v25 não foi publicada; o
  `devtools_api_changelog` do Social Technologies MCP é um jeito de acompanhar.
- Os conectores Metricool e Porter Metrics estão nesta sessão (terceiros, com análise de Instagram). Não foram
  testados: não são da Meta e duplicariam o coletor com mais um token de terceiro.
