-- psn_mecanismo_v2 — separa ideia de post de conteúdo para consumo.
-- Só adições: tipo de canal 'utilidade', marcações de foco/série na ideia e o resultado de utilidade.

-- Pasta de consumo: canal de ideias com tipo 'utilidade'.
alter table public.psn_criadores drop constraint if exists psn_criadores_tipo_conteudo_check;
alter table public.psn_criadores add constraint psn_criadores_tipo_conteudo_check
  check (tipo_conteudo in ('reels','estatico','utilidade'));

-- O que chamou atenção na referência (ideia de post) e nome da série.
alter table public.psn_ideias
  add column if not exists foco text[],
  add column if not exists serie text;

alter table public.psn_ideias drop constraint if exists psn_ideias_foco_check;
alter table public.psn_ideias add constraint psn_ideias_foco_check
  check (foco is null or foco <@ array['conteudo','formato','gancho','serie']::text[]);

-- Resultado de utilidade: {tema, resumo, pontos[], como_aplicar}.
alter table public.psn_referencias
  add column if not exists aprendizado jsonb;
