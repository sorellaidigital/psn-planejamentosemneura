-- psn_pauta_r2 — infraestrutura da produção sob demanda (R2). Sem mudança em dados existentes.
-- Aplicada em 3 passos pequenos: bucket, segredo_ok, disparo.

-- ============================================================ 1. bucket psn-pautas
-- PNGs dos slides: <pauta_id>/NN.png. Leitura pública; escrita só service role (Edge Function psn-pauta-upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('psn-pautas', 'psn-pautas', true, 10485760, array['image/png','image/jpeg'])
on conflict (id) do nothing;

drop policy if exists psn_pautas_obj_select on storage.objects;
create policy psn_pautas_obj_select on storage.objects for select
  to anon, authenticated using (bucket_id = 'psn-pautas');
-- Sem policies de insert/update/delete: só o service role escreve.

-- ============================================================ 2. confere o segredo da rotina
create or replace function public.psn_pauta_segredo_ok(segredo text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'psn_ig_rotina' and decrypted_secret = segredo);
$$;
revoke all on function public.psn_pauta_segredo_ok(text) from public, anon, authenticated;
grant execute on function public.psn_pauta_segredo_ok(text) to service_role;

-- ============================================================ 3. registro de disparos da rotina de produção
create table if not exists public.psn_pauta_disparo (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  ids uuid[],
  status text not null check (status in ('disparado','ignorado','erro','nao_configurado')),
  motivo text,
  sessao_url text
);
create index if not exists psn_pauta_disparo_criado_idx on public.psn_pauta_disparo (criado_em desc);

alter table public.psn_pauta_disparo enable row level security;
drop policy if exists psn_pauta_disparo_select on public.psn_pauta_disparo;
create policy psn_pauta_disparo_select on public.psn_pauta_disparo for select to anon, authenticated using (true);
revoke all on public.psn_pauta_disparo from anon, authenticated;
grant select on public.psn_pauta_disparo to anon, authenticated;
