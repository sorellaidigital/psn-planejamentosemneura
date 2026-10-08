-- psn_pauta_v1 — módulo Pauta (2 portões) do PSN: sugestões do dia, banco de ideias, produção e revisão.
-- Fonte de verdade: docs/UX-HOJE.md (seções 9 e 10) e docs/PLANO-CENTRAL.md (seções 2, 2b e 3).
-- Partes aplicadas em separado (apply_migration): psn_pauta_v1_tabelas, psn_pauta_v1_seguranca,
-- psn_pauta_v1_rpc, psn_ig_horarios_v1. O app (anon, sem login) só lê e muda status/comentário/horário;
-- conteúdo e produção só pelas RPCs com o segredo psn_ig_rotina do Vault (ou service role).

-- ============================================================ 1. TABELAS (psn_pauta_v1_tabelas)

-- Uma linha por sugestão/pauta. Um formato por pauta. Status: ideia > sugerida > aprovada_producao >
-- em_producao > para_revisar > ajustar <-> para_revisar > aprovado > postado; descartado = Lixeira.
create table if not exists public.psn_pauta (
  id uuid primary key default gen_random_uuid(),
  data date,                                   -- dia da vaga/sugestão; null = ideia sem data
  formato text not null check (formato in ('estatico','reels')),
  ordem smallint check (ordem between 1 and 3), -- posição da sugestão dentro do dia/formato
  status text not null check (status in ('ideia','sugerida','aprovada_producao','em_producao',
    'para_revisar','ajustar','aprovado','postado','descartado')),
  slug text,
  tema text not null check (char_length(tema) <= 400),
  gancho text,
  angulo text,
  estrutura text,
  roteiro_resumo jsonb,                        -- bullets do que cada slide diz
  urgencia text check (urgencia ~ '^U(0[1-9]|10)$'),
  linha text check (linha ~ '^L[1-5]$'),
  degrau text check (degrau ~ '^D[0-4]$'),
  por_que jsonb,                               -- [{tipo, texto}]
  fontes text,
  confirmar text,                              -- "Precisa de você" ([Duda: …])
  valida_ate date,                             -- prazo de pautas de notícia
  legenda text,
  reels jsonb,                                 -- roteiro do Reels em blocos cena/fala
  cenas jsonb,                                 -- [{t, c, f}] (UX-HOJE 10.1; sugestão e produzido)
  dur text,                                    -- duração estimada do Reels ("~36 s")
  deck jsonb,
  slides jsonb,                                -- [{n, path}]
  avisos text,
  comentario text check (comentario is null or char_length(comentario) <= 2000),
  comentario_em timestamptz,
  ajuste_pre text check (ajuste_pre is null or char_length(ajuste_pre) <= 1000),
  agendado_para timestamptz,                   -- editável pela Duda
  horario_sugerido timestamptz,                -- calculado pela rotina (permite saber se agendado_para foi editado)
  ig_midia_id text references public.psn_ig_midia(id) on delete set null,
  postado_em timestamptz,
  postado_origem text check (postado_origem in ('auto','manual')),
  decidido_em timestamptz,                     -- portão 1 (Produzir, Banco ou Lixeira)
  aprovado_producao_em timestamptz,
  em_producao_em timestamptz,
  produzido_em timestamptz,
  revisado_em timestamptz,                     -- portão 2
  descartado_em timestamptz,
  refaz_de uuid references public.psn_pauta(id) on delete set null,
  notion_url text,
  origem text not null default 'rotina' check (origem in ('rotina','notion','manual')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists psn_pauta_data_formato_idx on public.psn_pauta (data, formato);
create index if not exists psn_pauta_status_idx on public.psn_pauta (status);
-- Uma sugestão aberta por vaga (dia/formato/ordem): garante a idempotência de psn_pauta_sugerir.
-- Só vale para 'sugerida': depois de escolhida, a vaga pode ser reproposta sem conflito.
create unique index if not exists psn_pauta_vaga_sugerida_uq on public.psn_pauta (data, formato, ordem)
  where status = 'sugerida' and origem = 'rotina';
-- Dedup do backfill do Notion.
create unique index if not exists psn_pauta_notion_url_uq on public.psn_pauta (notion_url)
  where notion_url is not null;

-- 1 linha por dia: resumo da manhã, métricas usadas, radar e se a Duda já abriu o app.
create table if not exists public.psn_pauta_dia (
  data date primary key,
  rotina_status text check (rotina_status in ('ok','parcial','falhou','erro')),
  gerado_em timestamptz,
  sinal text,                                  -- "ontem no Instagram"
  resumo text,
  metricas jsonb,
  metricas_fonte text,
  radar jsonb,
  avisos text,
  visto_em timestamptz,                        -- anon grava uma vez por dia
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================ 2. HORÁRIOS (psn_ig_horarios_v1)

-- Melhores horários do público (alimenta o Calendário). Padrão psn_ig_*: anon só lê.
create table if not exists public.psn_ig_horarios (
  dia_semana smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  hora smallint not null check (hora between 0 and 23),
  valor numeric,
  fonte text not null check (fonte in ('online_followers','historico')),
  calculado_em timestamptz,
  primary key (fonte, dia_semana, hora)
);
alter table public.psn_ig_horarios enable row level security;
drop policy if exists psn_ig_horarios_leitura on public.psn_ig_horarios;
create policy psn_ig_horarios_leitura on public.psn_ig_horarios for select to anon, authenticated using (true);
revoke all on public.psn_ig_horarios from anon, authenticated;
grant select on public.psn_ig_horarios to anon, authenticated;

-- ============================================================ 3. SEGURANÇA (psn_pauta_v1_seguranca)

-- atualizado_em automático (função própria, search_path fixo).
create or replace function public.psn_pauta_touch() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists psn_pauta_touch on public.psn_pauta;
create trigger psn_pauta_touch before update on public.psn_pauta
  for each row execute function public.psn_pauta_touch();
drop trigger if exists psn_pauta_dia_touch on public.psn_pauta_dia;
create trigger psn_pauta_dia_touch before update on public.psn_pauta_dia
  for each row execute function public.psn_pauta_touch();

-- RLS e grants: anon/authenticated leem tudo e só atualizam colunas de revisão.
alter table public.psn_pauta enable row level security;
alter table public.psn_pauta_dia enable row level security;
drop policy if exists psn_pauta_leitura on public.psn_pauta;
create policy psn_pauta_leitura on public.psn_pauta for select to anon, authenticated using (true);
drop policy if exists psn_pauta_atualiza on public.psn_pauta;
-- A restrição real é a coluna (grant) + o trigger de transição; a policy só abre a linha.
create policy psn_pauta_atualiza on public.psn_pauta for update to anon, authenticated using (true) with check (true);
drop policy if exists psn_pauta_dia_leitura on public.psn_pauta_dia;
create policy psn_pauta_dia_leitura on public.psn_pauta_dia for select to anon, authenticated using (true);
drop policy if exists psn_pauta_dia_atualiza on public.psn_pauta_dia;
create policy psn_pauta_dia_atualiza on public.psn_pauta_dia for update to anon, authenticated using (true) with check (true);

revoke all on public.psn_pauta from anon, authenticated;
revoke all on public.psn_pauta_dia from anon, authenticated;
grant select on public.psn_pauta, public.psn_pauta_dia to anon, authenticated;
-- UX-HOJE 9.3: além das colunas pedidas, aprovado_producao_em e data (só ao produzir para uma vaga; o trigger confere).
grant update (status, comentario, comentario_em, ajuste_pre, agendado_para, decidido_em, revisado_em,
  descartado_em, postado_em, postado_origem, aprovado_producao_em, data)
  on public.psn_pauta to anon, authenticated;
grant update (visto_em) on public.psn_pauta_dia to anon, authenticated;

-- Transições permitidas ao app (anon/authenticated). Service role, postgres e as RPCs security definer
-- (current_user = dono da função) não passam por aqui.
create or replace function public.psn_pauta_transicao() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare par text;
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
    if new.postado_em is distinct from old.postado_em or new.postado_origem is distinct from old.postado_origem then
      raise exception 'postado_em só muda ao marcar como postado' using errcode = '42501';
    end if;
  end if;
  -- data só muda ao mandar produzir (vaga escolhida)
  if new.data is distinct from old.data
     and not (new.status = 'aprovada_producao' and old.status is distinct from 'aprovada_producao') then
    raise exception 'A data só muda ao produzir para uma vaga' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists psn_pauta_transicao on public.psn_pauta;
create trigger psn_pauta_transicao before update on public.psn_pauta
  for each row execute function public.psn_pauta_transicao();

-- visto_em: uma vez por dia (se já existe, o valor antigo é mantido).
create or replace function public.psn_pauta_dia_guarda() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user in ('anon','authenticated') and old.visto_em is not null then
    new.visto_em := old.visto_em;
  end if;
  return new;
end $$;
drop trigger if exists psn_pauta_dia_guarda on public.psn_pauta_dia;
create trigger psn_pauta_dia_guarda before update on public.psn_pauta_dia
  for each row execute function public.psn_pauta_dia_guarda();

-- Funções de trigger não precisam ser chamáveis pela API.
revoke execute on function public.psn_pauta_touch(), public.psn_pauta_transicao(), public.psn_pauta_dia_guarda()
  from public, anon, authenticated;

-- ============================================================ 4. RPCs DA ROTINA (psn_pauta_v1_rpc)

-- Confere o segredo do Vault (mesmo jeito de psn_ig_gravar_analise). Só as RPCs chamam; ninguém mais executa.
create or replace function public.psn_pauta_conferir_segredo(segredo text) returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if segredo is null or not exists (select 1 from vault.decrypted_secrets
      where name = 'psn_ig_rotina' and decrypted_secret = segredo) then
    raise exception 'segredo inválido' using errcode = '42501';
  end if;
end $$;
revoke all on function public.psn_pauta_conferir_segredo(text) from public, anon, authenticated;

-- Sugestões da manhã. Datas: hoje-1 a hoje+1 (America/Sao_Paulo) ou jan/1900 (teste).
-- Antes de gravar, 'sugerida' de dias anteriores vai para 'ideia'. Reexecução atualiza a mesma vaga
-- (dia/formato/ordem). Elemento com "id" de uma 'ideia' a repropõe (ideia -> sugerida).
create or replace function public.psn_pauta_sugerir(segredo text, p_data date, p_dia jsonb, p_sugestoes jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  e jsonb; v_id uuid; v_fmt text; v_ord smallint; v_mov int;
  v_criadas uuid[] := '{}'; v_atual uuid[] := '{}';
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
      if not found then raise exception 'id % não está no banco de ideias', v_id; end if;
    else
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
                            'movidas_para_ideia', v_mov);
end $$;
revoke all on function public.psn_pauta_sugerir(text, date, jsonb, jsonb) from public;
grant execute on function public.psn_pauta_sugerir(text, date, jsonb, jsonb) to anon, authenticated, service_role;

-- Produção: iniciar (aprovada_producao|ajustar -> em_producao), entregar (em_producao -> para_revisar),
-- falhou (em_producao -> aprovada_producao, com avisos).
create or replace function public.psn_pauta_producao(segredo text, p_id uuid, p_acao text, p_payload jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare r psn_pauta; pl jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  perform public.psn_pauta_conferir_segredo(segredo);
  if length(pl::text) > 3000000 then raise exception 'payload grande demais'; end if;
  select * into r from psn_pauta where id = p_id for update;
  if not found then raise exception 'pauta não encontrada'; end if;
  if p_acao = 'iniciar' then
    if r.status not in ('aprovada_producao','ajustar') then
      raise exception 'iniciar exige aprovada_producao ou ajustar (status atual: %)', r.status;
    end if;
    update psn_pauta set status = 'em_producao', em_producao_em = now() where id = p_id;
  elsif p_acao = 'entregar' then
    if r.status <> 'em_producao' then
      raise exception 'entregar exige em_producao (status atual: %)', r.status;
    end if;
    update psn_pauta set status = 'para_revisar', produzido_em = now(),
      legenda = coalesce(pl->>'legenda', legenda),
      reels = coalesce(nullif(pl->'reels', 'null'::jsonb), reels),
      cenas = coalesce(nullif(pl->'cenas', 'null'::jsonb), cenas),
      deck = coalesce(nullif(pl->'deck', 'null'::jsonb), deck),
      slides = coalesce(nullif(pl->'slides', 'null'::jsonb), slides),
      avisos = coalesce(pl->>'avisos', avisos), slug = coalesce(pl->>'slug', slug),
      dur = coalesce(pl->>'dur', dur),
      horario_sugerido = coalesce((pl->>'horario_sugerido')::timestamptz, horario_sugerido),
      agendado_para = coalesce(agendado_para, (pl->>'horario_sugerido')::timestamptz)
    where id = p_id;
  elsif p_acao = 'falhou' then
    if r.status <> 'em_producao' then
      raise exception 'falhou exige em_producao (status atual: %)', r.status;
    end if;
    update psn_pauta set status = 'aprovada_producao', avisos = coalesce(pl->>'avisos', avisos) where id = p_id;
  else
    raise exception 'ação inválida: % (use iniciar, entregar ou falhou)', p_acao;
  end if;
  return (select jsonb_build_object('id', id, 'status', status) from psn_pauta where id = p_id);
end $$;
revoke all on function public.psn_pauta_producao(text, uuid, text, jsonb) from public;
grant execute on function public.psn_pauta_producao(text, uuid, text, jsonb) to anon, authenticated, service_role;

-- Fila de produção: sem RPC. A fila (status aprovada_producao ou ajustar) é lida por select anon em psn_pauta
-- (o conteúdo já é público para o app); a rotina só precisa do segredo para escrever.

-- Backfill do Notion: origem='notion', qualquer status, sem restrição de datas, dedup por notion_url.
-- Cada linha é lida como psn_pauta (colunas ausentes ficam nulas); id e origem são ignorados/forçados.
create or replace function public.psn_pauta_importar(segredo text, p_linhas jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare l jsonb; r psn_pauta; v_novas int := 0; v_puladas int := 0;
begin
  perform public.psn_pauta_conferir_segredo(segredo);
  if p_linhas is null or jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > 200
     or length(p_linhas::text) > 5000000 then
    raise exception 'linhas inválidas ou grandes demais';
  end if;
  for l in select value from jsonb_array_elements(p_linhas) loop
    r := jsonb_populate_record(null::psn_pauta, l - 'id');
    if r.notion_url is not null and exists (select 1 from psn_pauta where notion_url = r.notion_url) then
      v_puladas := v_puladas + 1;
      continue;
    end if;
    insert into psn_pauta (data, formato, ordem, status, slug, tema, gancho, angulo, estrutura, roteiro_resumo,
      urgencia, linha, degrau, por_que, fontes, confirmar, valida_ate, legenda, reels, cenas, dur, deck, slides,
      avisos, comentario, comentario_em, ajuste_pre, agendado_para, horario_sugerido, postado_em, postado_origem,
      decidido_em, aprovado_producao_em, em_producao_em, produzido_em, revisado_em, descartado_em,
      notion_url, origem, criado_em)
    values (r.data, r.formato, r.ordem, r.status, r.slug, r.tema, r.gancho, r.angulo, r.estrutura, r.roteiro_resumo,
      r.urgencia, r.linha, r.degrau, r.por_que, r.fontes, r.confirmar, r.valida_ate, r.legenda, r.reels, r.cenas,
      r.dur, r.deck, r.slides, r.avisos, r.comentario, r.comentario_em, r.ajuste_pre, r.agendado_para,
      r.horario_sugerido, r.postado_em, r.postado_origem, r.decidido_em, r.aprovado_producao_em, r.em_producao_em,
      r.produzido_em, r.revisado_em, r.descartado_em, r.notion_url, 'notion', coalesce(r.criado_em, now()));
    v_novas := v_novas + 1;
  end loop;
  return jsonb_build_object('importadas', v_novas, 'puladas_duplicadas', v_puladas);
end $$;
revoke all on function public.psn_pauta_importar(text, jsonb) from public;
grant execute on function public.psn_pauta_importar(text, jsonb) to anon, authenticated, service_role;
