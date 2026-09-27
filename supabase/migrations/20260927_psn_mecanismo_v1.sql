-- psn_mecanismo_v1 — liga o app Planejamento sem Neura ao mecanismo insta-ops.
-- Só adições: colunas novas, trigger, tabela psn_referencias e bucket de imagens.

-- Canais: finalidade (ideias alimenta o mecanismo; produção mantém o funil), nicho e tipo de conteúdo.
alter table public.psn_criadores
  add column if not exists finalidade text not null default 'producao'
    check (finalidade in ('producao','ideias')),
  add column if not exists nicho text,
  add column if not exists tipo_conteudo text
    check (tipo_conteudo in ('reels','estatico'));

-- Ideias: motivo, plataforma e estado no mecanismo.
alter table public.psn_ideias
  add column if not exists por_que text,
  add column if not exists plataforma text
    check (plataforma in ('instagram','tiktok','outro')),
  add column if not exists mec_status text
    check (mec_status in ('pendente','processando','processada','erro','descartada')),
  add column if not exists mec_erro text,
  add column if not exists mec_processado_em timestamptz;

create index if not exists psn_ideias_mec_status_idx
  on public.psn_ideias (mec_status) where mec_status is not null;

-- Plataforma derivada da URL; em canal de ideias, link novo ou trocado entra na fila.
create or replace function public.psn_ideia_mecanismo() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  fin text;
  ref text := btrim(coalesce(new.referencia, ''));
begin
  new.plataforma := case
    when ref = '' then null
    when ref ~* '^(https?://)?([a-z0-9-]+\.)*(instagram\.com|instagr\.am)(/|$)' then 'instagram'
    when ref ~* '^(https?://)?([a-z0-9-]+\.)*tiktok\.com(/|$)' then 'tiktok'
    else 'outro'
  end;

  select finalidade into fin from public.psn_criadores where id = new.criador_id;
  if fin = 'ideias' and ref <> ''
     and (tg_op = 'INSERT' or new.referencia is distinct from old.referencia) then
    new.mec_status := 'pendente';
    new.mec_erro := null;
  end if;
  return new;
end $$;

drop trigger if exists psn_ideias_mecanismo on public.psn_ideias;
create trigger psn_ideias_mecanismo
  before insert or update of referencia, criador_id on public.psn_ideias
  for each row execute function public.psn_ideia_mecanismo();

-- Resultado do processamento: 1 referência por ideia.
create table if not exists public.psn_referencias (
  id uuid primary key default gen_random_uuid(),
  ideia_id uuid not null unique references public.psn_ideias(id) on delete cascade,
  post_id text,
  url text not null,
  autor text,
  plataforma text check (plataforma in ('instagram','tiktok','outro')),
  formato text check (formato in ('carrossel','reel','imagem','video')),
  n_slides integer,
  data_publicacao date,
  fonte text check (fonte in ('chrome','manual','oembed')),
  curtidas bigint,
  comentarios bigint,
  views bigint,
  legenda text,
  gancho text,
  tipo_gancho text check (tipo_gancho in
    ('promessa-pessoal','pergunta','contradicao','lista','erro-comum','bastidor','dado','outro')),
  estrutura text,
  cta text,
  tipo_cta text check (tipo_cta in
    ('comente-palavra','salve','compartilhe','siga','link-bio','nenhum')),
  palavra_chave text,
  tags text[] not null default '{}',
  slides jsonb not null default '[]'::jsonb,
  analise jsonb not null default '{}'::jsonb,
  nao_capturado jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists psn_referencias_touch on public.psn_referencias;
create trigger psn_referencias_touch before update on public.psn_referencias
  for each row execute function public.psn_touch();

-- Mesmo modelo de acesso das demais tabelas psn_ (sem login, política aberta).
alter table public.psn_referencias enable row level security;
drop policy if exists psn_referencias_all on public.psn_referencias;
create policy psn_referencias_all on public.psn_referencias
  for all using (true) with check (true);
grant select, insert, update, delete on public.psn_referencias to anon, authenticated;

-- Imagens dos slides: bucket público, caminho <ideia_id>/NN.jpg.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('psn-referencias', 'psn-referencias', true, 10485760,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists psn_referencias_obj_select on storage.objects;
drop policy if exists psn_referencias_obj_insert on storage.objects;
drop policy if exists psn_referencias_obj_update on storage.objects;
drop policy if exists psn_referencias_obj_delete on storage.objects;
create policy psn_referencias_obj_select on storage.objects for select
  to anon, authenticated using (bucket_id = 'psn-referencias');
create policy psn_referencias_obj_insert on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'psn-referencias');
create policy psn_referencias_obj_update on storage.objects for update
  to anon, authenticated using (bucket_id = 'psn-referencias') with check (bucket_id = 'psn-referencias');
create policy psn_referencias_obj_delete on storage.objects for delete
  to anon, authenticated using (bucket_id = 'psn-referencias');
