-- psn_ig_v1_cron — agendamento do coletor psn-ig-sync (aplicado em 08/10/2026).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Segredo do cron gerado no próprio banco (ninguém vê o valor).
-- select vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'psn_ig_cron',
--   'segredo do cron que chama a Edge Function psn-ig-sync');

-- A Edge Function confere o header x-psn-cron por aqui; só o service role executa.
create or replace function public.psn_ig_cron_ok(segredo text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'psn_ig_cron' and decrypted_secret = segredo);
$$;
revoke all on function public.psn_ig_cron_ok(text) from public, anon, authenticated;
grant execute on function public.psn_ig_cron_ok(text) to service_role;

-- A cada 4h no minuto 5 (UTC): 01:05, 05:05, 09:05… em Brasília. A de 05:05 antecede a rotina Métricas do Dia (05:23).
select cron.schedule('psn-ig-sync', '5 */4 * * *', $$
  select net.http_post(
    url := 'https://hvmmkwafzeqbjpusdmin.supabase.co/functions/v1/psn-ig-sync',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-psn-cron',(select decrypted_secret from vault.decrypted_secrets where name='psn_ig_cron')),
    body := '{"tipo":"cron"}'::jsonb,
    timeout_milliseconds := 150000
  );
$$);
