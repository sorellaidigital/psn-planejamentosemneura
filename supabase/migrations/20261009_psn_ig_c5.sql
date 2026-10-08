-- psn_ig_c5 — rotinas "Métricas do Dia" e "Pauta do Dia" lendo e gravando no PSN.
-- Leitura: psn_ig_resumo_dia (anon pode executar; só lê tabelas que anon já lê).
-- Escrita: psn_ig_gravar_analise, que só grava com o segredo psn_ig_rotina do Vault.
-- O segredo fica na variável PSN_ROTINA_SEGREDO do ambiente "Instagram" das rotinas.

-- Segredo gerado no próprio banco (ninguém vê o valor no chat). Aplicado uma vez:
-- select vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'psn_ig_rotina',
--   'segredo das rotinas Métricas do Dia / Pauta do Dia para gravar em psn_ig_analise');

-- Resumo do dia para as rotinas. p_data = dia local (America/Sao_Paulo) da rotina.
-- Seguidores: snapshot do dia (ou o último até ele) contra o snapshot anterior.
-- Conta: métricas do último dia completo (p_data - 1); a linha de p_data ainda é parcial às 05:23.
-- Posts: os 10 últimos publicados até o fim de p_data, com o último valor de cada métrica.
create or replace function public.psn_ig_resumo_dia(p_data date default null) returns jsonb
language sql stable security invoker set search_path = public, pg_temp as $$
with d as (
  select coalesce(p_data, (now() at time zone 'America/Sao_Paulo')::date) as dia
), snap as (
  select s.data, s.seguidores from psn_ig_conta_snapshot s, d
  where s.data <= d.dia and s.seguidores is not null order by s.data desc limit 2
), hoje as (select * from snap order by data desc limit 1),
   antes as (select * from snap order by data asc limit 1),
seg as (
  select jsonb_build_object(
    'data', h.data, 'seguidores', h.seguidores,
    'data_anterior', case when a.data < h.data then a.data end,
    'seguidores_anterior', case when a.data < h.data then a.seguidores end,
    'ganhos', case when a.data < h.data then h.seguidores - a.seguidores end,
    'dias_entre', case when a.data < h.data then h.data - a.data end,
    'ganhos_por_dia', case when a.data < h.data
      then round((h.seguidores - a.seguidores)::numeric / (h.data - a.data), 1) end) as j
  from hoje h left join antes a on true
), conta as (
  select jsonb_build_object('data', d.dia - 1,
    'metricas', coalesce((select jsonb_object_agg(c.metrica, c.valor) from psn_ig_conta_diaria c
                          where c.data = d.dia - 1), '{}'::jsonb)) as j
  from d
), posts as (
  select m.id, m.permalink, m.publicado_em,
    case when m.tipo_produto = 'REELS' then 'REELS'
         when m.tipo = 'CAROUSEL_ALBUM' then 'CARROSSEL'
         when m.tipo = 'IMAGE' then 'FOTO' else coalesce(m.tipo, '?') end as formato,
    left(coalesce(m.legenda, ''), 80) as legenda_inicio,
    m.insights_indisponivel,
    (select jsonb_object_agg(a.metrica, a.valor) from psn_ig_midia_atual a where a.midia_id = m.id) as met
  from psn_ig_midia m, d
  where m.publicado_em < ((d.dia + 1)::timestamp at time zone 'America/Sao_Paulo')
  order by m.publicado_em desc limit 10
), p as (
  select *, coalesce((met->>'saved')::numeric, 0) + coalesce((met->>'shares')::numeric, 0) as salv_comp,
         (met->>'reach')::numeric as alcance
  from posts
), sync as (
  select s.iniciado_em, s.finalizado_em, s.status from psn_ig_sync s
  where s.tipo <> 'importacao' order by s.iniciado_em desc limit 1
)
select jsonb_build_object(
  'dia', (select dia from d),
  'seguidores', (select j from seg),
  'conta_dia_anterior', (select j from conta),
  'posts', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'permalink', permalink, 'formato', formato,
      'data', (publicado_em at time zone 'America/Sao_Paulo')::date,
      'legenda_inicio', legenda_inicio, 'alcance', alcance,
      'salvos', (met->>'saved')::numeric, 'compartilhamentos', (met->>'shares')::numeric,
      'comentarios', (met->>'comments')::numeric, 'curtidas', (met->>'likes')::numeric,
      'views', (met->>'views')::numeric, 'salvos_mais_compart', salv_comp,
      'insights_indisponivel', insights_indisponivel) order by publicado_em desc) from p), '[]'::jsonb),
  'melhor_post', (select jsonb_build_object('permalink', permalink, 'formato', formato,
      'legenda_inicio', legenda_inicio, 'salvos_mais_compart', salv_comp, 'alcance', alcance)
    from p where met is not null order by salv_comp desc, alcance desc nulls last limit 1),
  'medias_por_formato', coalesce((select jsonb_object_agg(formato, j) from (
      select formato, jsonb_build_object('posts', count(*),
        'salvos_mais_compart', round(avg(salv_comp), 1), 'alcance', round(avg(alcance), 0)) as j
      from p where met is not null group by formato) x), '{}'::jsonb),
  'totais_10_posts', (select jsonb_build_object(
      'salvos', sum((met->>'saved')::numeric), 'compartilhamentos', sum((met->>'shares')::numeric),
      'comentarios', sum((met->>'comments')::numeric)) from p),
  'ultima_coleta', (select jsonb_build_object('iniciado_em', iniciado_em, 'finalizado_em', finalizado_em,
      'status', status) from sync),
  'avisos', to_jsonb(array_remove(array[
    case when not exists (select 1 from sync) then 'Nenhuma coleta registrada em psn_ig_sync.' end,
    case when (select status from sync) <> 'ok' then 'Última coleta do PSN não terminou ok: ' || (select status from sync) || '.' end,
    case when (select finalizado_em from sync) < now() - interval '6 hours'
      then 'Última coleta do PSN tem mais de 6 h.' end,
    case when (select j->>'data_anterior' from seg) is null then 'Sem snapshot anterior de seguidores: sem variação.' end,
    case when (select j->'metricas' from conta) = '{}'::jsonb then 'Sem métricas de conta do dia anterior.' end,
    'Métricas dos posts são o último valor coletado (acumulado), não do dia.'
  ], null))
);
$$;
revoke all on function public.psn_ig_resumo_dia(date) from public;
grant execute on function public.psn_ig_resumo_dia(date) to anon, authenticated, service_role;

-- Gravação da análise do dia pelas rotinas: 1 linha por dia, atualiza se já existir.
create or replace function public.psn_ig_gravar_analise(
  segredo text, p_data date, p_analise text, p_sinal_pauta text,
  p_melhor_post text default null, p_melhor_post_valor numeric default null, p_avisos text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare novo boolean;
begin
  if segredo is null or not exists (select 1 from vault.decrypted_secrets
      where name = 'psn_ig_rotina' and decrypted_secret = segredo) then
    raise exception 'segredo inválido' using errcode = '42501';
  end if;
  -- Só a última semana (reprocessar dia que falhou) ou datas de teste em jan/1900.
  if p_data is null or not (p_data between current_date - 7 and current_date + 1
                            or p_data between date '1900-01-01' and date '1900-01-31') then
    raise exception 'data fora do intervalo permitido';
  end if;
  if length(p_analise) > 4000 or length(p_sinal_pauta) > 1000 or length(p_melhor_post) > 500
     or length(p_avisos) > 4000 then
    raise exception 'texto longo demais';
  end if;
  insert into psn_ig_analise as a (data, analise, sinal_pauta, melhor_post, melhor_post_valor, avisos, origem)
  values (p_data, p_analise, p_sinal_pauta, p_melhor_post, p_melhor_post_valor, p_avisos, 'rotina')
  on conflict (data) do update set analise = excluded.analise, sinal_pauta = excluded.sinal_pauta,
    melhor_post = excluded.melhor_post, melhor_post_valor = excluded.melhor_post_valor,
    avisos = excluded.avisos, origem = excluded.origem, atualizado_em = now()
  returning (xmax = 0) into novo;
  return jsonb_build_object('data', p_data, 'acao', case when novo then 'criada' else 'atualizada' end);
end $$;
revoke all on function public.psn_ig_gravar_analise(text, date, text, text, text, numeric, text) from public;
grant execute on function public.psn_ig_gravar_analise(text, date, text, text, text, numeric, text)
  to anon, authenticated, service_role;
