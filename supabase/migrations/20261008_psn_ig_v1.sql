-- psn_ig_v1 — módulo de Métricas do Instagram no PSN.
-- Formato herdado do IG Analytics (server/schema.sql): métricas em linhas (data, metrica, valor)
-- e fotos dos insights por post. O app (anon) só lê; quem grava é o coletor (service role).

create table if not exists public.psn_ig_conta_snapshot (
  data date primary key,                 -- data local America/Sao_Paulo
  seguidores integer,
  seguindo integer,
  n_midias integer,
  capturado_em timestamptz not null default now()
);

create table if not exists public.psn_ig_conta_diaria (
  data date not null,
  metrica text not null,                 -- views, reach, saves, shares, profile_links_taps, follower_count (delta)…
  valor numeric,
  primary key (data, metrica)
);

create table if not exists public.psn_ig_midia (
  id text primary key,                   -- id da mídia na Graph API
  tipo text,                             -- media_type: IMAGE, VIDEO, CAROUSEL_ALBUM
  tipo_produto text,                     -- media_product_type: FEED, REELS
  legenda text,
  permalink text,
  media_url text,
  thumbnail_url text,
  publicado_em timestamptz,
  curtidas integer,
  comentarios integer,
  insights_indisponivel boolean not null default false,
  visto_em timestamptz,
  sincronizado_em timestamptz
);
create index if not exists psn_ig_midia_publicado_idx on public.psn_ig_midia (publicado_em desc);

create table if not exists public.psn_ig_midia_insight (
  midia_id text not null references public.psn_ig_midia(id) on delete cascade,
  capturado_em timestamptz not null,
  metrica text not null,
  valor numeric,
  primary key (midia_id, capturado_em, metrica)
);

-- Último valor de cada métrica por post.
create or replace view public.psn_ig_midia_atual with (security_invoker = true) as
select distinct on (midia_id, metrica) midia_id, metrica, valor, capturado_em
from public.psn_ig_midia_insight
order by midia_id, metrica, capturado_em desc;

-- Análise diária escrita pela rotina "Métricas do Dia" (antes no Notion "Métricas IG").
create table if not exists public.psn_ig_analise (
  data date primary key,
  analise text,
  sinal_pauta text,
  melhor_post text,                      -- permalink
  melhor_post_valor numeric,             -- salvos + compartilhamentos
  avisos text,
  origem text not null default 'rotina',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
-- Sem trigger de atualizado_em: quem grava a análise preenche o campo (o create trigger
-- travava pelo MCP no dia da aplicação e o campo não justifica o trigger).

-- Log de cada coleta.
create table if not exists public.psn_ig_sync (
  id bigserial primary key,
  tipo text not null,                    -- cron, manual, importacao
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  status text not null default 'rodando' check (status in ('rodando','ok','erro')),
  detalhe jsonb
);
create index if not exists psn_ig_sync_iniciado_idx on public.psn_ig_sync (iniciado_em desc);

-- Estado do coletor (métricas aceitas, última coleta completa, saúde do token). Token NÃO fica aqui.
create table if not exists public.psn_ig_config (
  chave text primary key,
  valor jsonb,
  atualizado_em timestamptz not null default now()
);

-- Acesso: leitura aberta (app sem login, decisão de 08/10/2026); escrita só pelo service role.
do $$
declare t text;
begin
  foreach t in array array['psn_ig_conta_snapshot','psn_ig_conta_diaria','psn_ig_midia',
                           'psn_ig_midia_insight','psn_ig_analise','psn_ig_sync','psn_ig_config'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_leitura', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t||'_leitura', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;
grant select on public.psn_ig_midia_atual to anon, authenticated;
revoke usage, select on sequence public.psn_ig_sync_id_seq from anon, authenticated;
