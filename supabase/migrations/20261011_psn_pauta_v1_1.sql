-- psn_pauta_v1_1 — correções da revisão da R1 (antes do deploy). Aplicada em 2 partes (apply_migration):
-- psn_pauta_v1_1_sugerir e psn_pauta_v1_1_transicao. Não mexe em dados.
--
-- 1. psn_pauta_sugerir (idempotência da rotina rodando 2x no mesmo dia):
--    a) vaga (dia/formato/ordem) que a Duda JÁ DECIDIU hoje (linha da rotina criada ou decidida desde a véspera
--       e fora de 'sugerida') não recebe sugestão nova: antes, a 2ª execução recriava as 3 sugestões que ela já
--       tinha mandado para produção/banco/lixeira (duplicata no banco e no Hoje). Volta em "puladas".
--    b) "id" que não está mais em ideia/sugerida (ex.: ela escolheu entre as execuções) é pulado e listado em
--       "puladas", em vez de abortar o envio inteiro.
--    c) repropor por "id" numa vaga ocupada por outra 'sugerida' da rotina (2ª execução mudou de ideia) manda
--       a ocupante para o banco ('ideia'), em vez de estourar o índice único e abortar o envio.
-- 2. psn_pauta_transicao (app sem login):
--    a) postado_em/postado_origem só mudam na transição para 'postado' (antes dava para gravar postado_em e
--       postado_origem='auto' junto de outra transição, ex.: para_revisar > aprovado).
--    b) ao produzir para uma vaga, a data fica entre ontem e hoje+90 (BRT), em vez de qualquer data.

-- ============================================================ 1. psn_pauta_v1_1_sugerir
create or replace function public.psn_pauta_sugerir(segredo text, p_data date, p_dia jsonb, p_sugestoes jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  desde timestamptz := ((p_data - 1)::timestamp at time zone 'America/Sao_Paulo');
  e jsonb; v_id uuid; v_fmt text; v_ord smallint; v_mov int;
  v_criadas uuid[] := '{}'; v_atual uuid[] := '{}'; v_pul jsonb := '[]'::jsonb;
begin
  perform public.psn_pauta_conferir_segredo(segredo);
  if p_data is null or not (p_data between hoje - 1 and hoje + 1
                            or p_data between date '1900-01-01' and date '1900-01-31') then
    raise exception 'data fora do intervalo permitido';
  end if;
  if p_sugestoes is null or jsonb_typeof(p_sugestoes) <> 'array' or jsonb_array_length(p_sugestoes) > 12
     or length(p_sugestoes::text) > 400000 then
    raise exception 'sugestões inválidas ou grandes demais';
  end if;
  if p_dia is not null and (jsonb_typeof(p_dia) <> 'object' or length(p_dia::text) > 100000) then
    raise exception 'dia inválido ou grande demais';
  end if;

  update psn_pauta set status = 'ideia' where status = 'sugerida' and data < p_data;
  get diagnostics v_mov = row_count;

  if p_dia is not null then
    insert into psn_pauta_dia as d (data, rotina_status, gerado_em, sinal, resumo, metricas, metricas_fonte, radar, avisos)
    values (p_data, coalesce(p_dia->>'rotina_status', 'ok'), now(), p_dia->>'sinal', p_dia->>'resumo',
            nullif(p_dia->'metricas', 'null'::jsonb), p_dia->>'metricas_fonte',
            nullif(p_dia->'radar', 'null'::jsonb), p_dia->>'avisos')
    on conflict (data) do update set rotina_status = excluded.rotina_status, gerado_em = now(),
      sinal = excluded.sinal, resumo = excluded.resumo, metricas = excluded.metricas,
      metricas_fonte = excluded.metricas_fonte, radar = excluded.radar, avisos = excluded.avisos;
  end if;

  for e in select value from jsonb_array_elements(p_sugestoes) loop
    v_fmt := e->>'formato';
    v_ord := nullif(e->>'ordem', '')::smallint;
    v_id := nullif(e->>'id', '')::uuid;
    if v_id is not null then
      perform 1 from psn_pauta where id = v_id and status in ('ideia','sugerida') for update;
      if not found then
        v_pul := v_pul || jsonb_build_object('id', v_id, 'motivo', 'não está mais no banco de ideias');
        continue;
      end if;
      -- outra sugestão da rotina ocupando a mesma vaga hoje vai para o banco (não se perde)
      update psn_pauta set status = 'ideia'
        where id <> v_id and data = p_data and status = 'sugerida' and origem = 'rotina'
          and formato = coalesce(v_fmt, (select formato from psn_pauta where id = v_id))
          and ordem = coalesce(v_ord, (select ordem from psn_pauta where id = v_id));
    else
      if exists (select 1 from psn_pauta
                 where data = p_data and formato = v_fmt and ordem = v_ord and origem = 'rotina'
                   and status <> 'sugerida' and (criado_em >= desde or decidido_em >= desde)) then
        v_pul := v_pul || jsonb_build_object('formato', v_fmt, 'ordem', v_ord, 'motivo', 'vaga já decidida');
        continue;
      end if;
      select id into v_id from psn_pauta
        where data = p_data and formato = v_fmt and ordem = v_ord and status = 'sugerida' and origem = 'rotina'
        for update;
    end if;
    if v_id is null then
      insert into psn_pauta (data, formato, ordem, status, tema, gancho, angulo, estrutura, roteiro_resumo,
        urgencia, linha, degrau, por_que, fontes, confirmar, valida_ate, reels, cenas, dur,
        horario_sugerido, agendado_para, origem)
      values (p_data, v_fmt, v_ord, 'sugerida', e->>'tema', e->>'gancho', e->>'angulo', e->>'estrutura',
        nullif(e->'roteiro_resumo', 'null'::jsonb), e->>'urgencia', e->>'linha', e->>'degrau',
        nullif(e->'por_que', 'null'::jsonb), e->>'fontes', e->>'confirmar', (e->>'valida_ate')::date,
        nullif(e->'reels', 'null'::jsonb), nullif(e->'cenas', 'null'::jsonb), e->>'dur',
        (e->>'horario_sugerido')::timestamptz, (e->>'horario_sugerido')::timestamptz, 'rotina')
      returning id into v_id;
      v_criadas := v_criadas || v_id;
    else
      update psn_pauta set status = 'sugerida', data = p_data, formato = coalesce(v_fmt, formato),
        ordem = coalesce(v_ord, ordem), tema = coalesce(e->>'tema', tema), gancho = coalesce(e->>'gancho', gancho),
        angulo = coalesce(e->>'angulo', angulo), estrutura = coalesce(e->>'estrutura', estrutura),
        roteiro_resumo = coalesce(nullif(e->'roteiro_resumo', 'null'::jsonb), roteiro_resumo),
        urgencia = coalesce(e->>'urgencia', urgencia), linha = coalesce(e->>'linha', linha),
        degrau = coalesce(e->>'degrau', degrau),
        por_que = coalesce(nullif(e->'por_que', 'null'::jsonb), por_que),
        fontes = coalesce(e->>'fontes', fontes), confirmar = coalesce(e->>'confirmar', confirmar),
        valida_ate = coalesce((e->>'valida_ate')::date, valida_ate),
        reels = coalesce(nullif(e->'reels', 'null'::jsonb), reels),
        cenas = coalesce(nullif(e->'cenas', 'null'::jsonb), cenas), dur = coalesce(e->>'dur', dur),
        horario_sugerido = coalesce((e->>'horario_sugerido')::timestamptz, horario_sugerido),
        agendado_para = coalesce(agendado_para, (e->>'horario_sugerido')::timestamptz)
      where id = v_id;
      v_atual := v_atual || v_id;
    end if;
  end loop;
  return jsonb_build_object('data', p_data, 'criadas', to_jsonb(v_criadas), 'atualizadas', to_jsonb(v_atual),
                            'puladas', v_pul, 'movidas_para_ideia', v_mov);
end $$;
revoke all on function public.psn_pauta_sugerir(text, date, jsonb, jsonb) from public;
grant execute on function public.psn_pauta_sugerir(text, date, jsonb, jsonb) to anon, authenticated, service_role;

-- ============================================================ 2. psn_pauta_v1_1_transicao
create or replace function public.psn_pauta_transicao() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare par text; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if current_user not in ('anon','authenticated') then
    return new;
  end if;
  if new.status is distinct from old.status then
    par := old.status || '>' || new.status;
    if par <> all (array[
      'sugerida>aprovada_producao','sugerida>ideia','sugerida>descartado',
      'ideia>aprovada_producao','ideia>descartado','descartado>ideia','aprovada_producao>ideia',
      'para_revisar>aprovado','para_revisar>ajustar','para_revisar>descartado','aprovado>descartado',
      'aprovado>postado']) then
      raise exception 'Transição de status não permitida: % para %', old.status, new.status
        using errcode = '42501';
    end if;
    if new.status = 'ajustar' and nullif(btrim(coalesce(new.comentario, '')), '') is null then
      raise exception 'Ajustar exige um comentário' using errcode = '42501';
    end if;
    if new.status = 'aprovada_producao' then
      new.aprovado_producao_em := coalesce(new.aprovado_producao_em, now());
      new.decidido_em := coalesce(new.decidido_em, now());
    end if;
    if new.status = 'postado' then
      new.postado_origem := 'manual';
      new.postado_em := coalesce(new.postado_em, now());
    end if;
  else
    if old.status in ('postado','descartado') and new.agendado_para is distinct from old.agendado_para then
      raise exception 'Pauta % não aceita novo horário', old.status using errcode = '42501';
    end if;
  end if;
  if new.status is distinct from 'postado'
     and (new.postado_em is distinct from old.postado_em or new.postado_origem is distinct from old.postado_origem) then
    raise exception 'postado_em só muda ao marcar como postado' using errcode = '42501';
  end if;
  -- data só muda ao mandar produzir (vaga escolhida), de ontem até hoje+90
  if new.data is distinct from old.data then
    if not (new.status = 'aprovada_producao' and old.status is distinct from 'aprovada_producao') then
      raise exception 'A data só muda ao produzir para uma vaga' using errcode = '42501';
    end if;
    if new.data is null or new.data not between hoje - 1 and hoje + 90 then
      raise exception 'Data da vaga fora do intervalo (ontem a 90 dias)' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.psn_pauta_transicao() from public, anon, authenticated;
