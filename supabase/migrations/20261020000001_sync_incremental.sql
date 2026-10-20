-- =============================================================================
-- Spec 03 — Sincronização incremental. As Edge Functions gravam página a
-- página, guardam o ponto de parada em integration_settings.sync_state e uma
-- trava impede duas invocações do mesmo provedor ao mesmo tempo. O cron passa
-- a chamar a cada 15 min; a função decide se continua, começa ou não faz nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Estado de retomada e trava. Fora de `config` porque a tela regrava o
--    config inteiro ao salvar a conta de anúncios.
-- -----------------------------------------------------------------------------
alter table public.integration_settings
  add column sync_state jsonb not null default '{}'::jsonb,
  add column sync_locked_until timestamptz;

comment on column public.integration_settings.sync_state is
  'Plano em andamento (passos, cursor), últimos dias sincronizados por campo e bloqueios (spec 03).';

-- Pega a trava do provedor se estiver livre (ou vencida). Cria a linha da
-- integração quando ainda não existe.
create or replace function public.sync_try_lock(
  p_user_id uuid,
  p_provider public.integration_provider,
  p_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  insert into public.integration_settings (user_id, provider)
  values (p_user_id, p_provider)
  on conflict (user_id, provider) do nothing;

  update public.integration_settings
     set sync_locked_until = now() + make_interval(secs => greatest(p_seconds, 30))
   where user_id = p_user_id
     and provider = p_provider
     and (sync_locked_until is null or sync_locked_until < now())
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.sync_try_lock(uuid, public.integration_provider, integer) from public, anon, authenticated;
grant execute on function public.sync_try_lock(uuid, public.integration_provider, integer) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Guru: nunca regredir uma transação. Sync, webhook e importador podem
--    trazer a mesma transação fora de ordem; versão com dates.updated_at mais
--    antigo que a gravada é descartada (o nome com "a_" roda antes da
--    classificação).
-- -----------------------------------------------------------------------------
create or replace function public.guru_transactions_keep_newest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.guru_updated_at is not null
     and old.guru_updated_at is not null
     and new.guru_updated_at < old.guru_updated_at then
    return null;
  end if;
  return new;
end;
$$;

create trigger guru_transactions_a_keep_newest
  before update on public.guru_transactions
  for each row execute function public.guru_transactions_keep_newest();

-- -----------------------------------------------------------------------------
-- 3. Agendamento: a cada 15 min, defasado por provedor. Intervalo entre
--    rodadas novas (60 min Guru/Asaas, 4 h Meta, 35 dias da Meta semanal)
--    fica na função; chamadas sem trabalho não gravam sync_runs.
-- -----------------------------------------------------------------------------
select cron.unschedule(jobname)
  from cron.job
 where jobname in ('meta-sync-4h', 'meta-sync-weekly-35d', 'guru-sync-6h', 'asaas-sync-6h');

select cron.schedule('guru-sync-15min', '*/15 * * * *',
  $cron$ select private.invoke_edge_function('guru-sync', '{}'::jsonb) $cron$);
select cron.schedule('asaas-sync-15min', '5-59/15 * * * *',
  $cron$ select private.invoke_edge_function('asaas-sync', '{}'::jsonb) $cron$);
select cron.schedule('meta-sync-15min', '10-59/15 * * * *',
  $cron$ select private.invoke_edge_function('meta-sync', '{}'::jsonb) $cron$);

-- -----------------------------------------------------------------------------
-- 4. Watchdog: só marca a integração como erro quando não sobrou execução
--    em andamento (antes marcava também a que estava rodando naquele momento)
--    e libera a trava de quem morreu.
-- -----------------------------------------------------------------------------
select cron.unschedule('sync-runs-watchdog');
select cron.schedule('sync-runs-watchdog', '*/10 * * * *', $cron$
  update public.sync_runs
     set status = 'error', error = 'Tempo limite excedido (watchdog)', finished_at = now()
   where status = 'running' and started_at < now() - interval '15 minutes';
  update public.integration_settings s
     set last_sync_status = 'error', last_error = 'Tempo limite excedido (watchdog)'
   where s.last_sync_status = 'running'
     and not exists (
       select 1 from public.sync_runs r
        where r.user_id = s.user_id and r.provider = s.provider and r.status = 'running'
     );
  update public.integration_settings
     set sync_locked_until = null
   where sync_locked_until < now();
$cron$);
