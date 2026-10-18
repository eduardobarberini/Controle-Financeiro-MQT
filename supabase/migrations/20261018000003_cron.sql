-- =============================================================================
-- Agendamento das sincronizações via pg_cron + pg_net.
--
-- As Edge Functions são chamadas por HTTP. A URL base e a service role key
-- ficam no Vault (nunca em texto puro na migration). Depois do deploy, rode
-- uma única vez no SQL Editor do projeto:
--
--   select vault.create_secret('https://SEU-PROJETO.supabase.co/functions/v1', 'edge_functions_url');
--   select vault.create_secret('SUA_SERVICE_ROLE_KEY', 'service_role_key');
--
-- Sem esses segredos a função abaixo apenas registra um aviso e não faz nada.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_edge_function(fn text, body jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  key text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'edge_functions_url' limit 1;
  select decrypted_secret into key
    from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if base_url is null or key is null then
    raise notice 'invoke_edge_function(%): segredos edge_functions_url/service_role_key ausentes no Vault', fn;
    return;
  end if;

  perform net.http_post(
    url := rtrim(base_url, '/') || '/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || key
    ),
    body := body,
    timeout_milliseconds := 150000
  );
end;
$$;

revoke all on function public.invoke_edge_function(text, jsonb) from public;

-- Horários em UTC. 06:xx UTC = 03:xx em Brasília (dia já fechado na conta).
-- Meta: a cada 4 horas (janela de 7 dias, porque conversões são revisadas) +
-- uma passada semanal de 35 dias na segunda-feira.
select cron.schedule(
  'meta-sync-4h',
  '10 */4 * * *',
  $cron$ select public.invoke_edge_function('meta-sync', '{"days": 7}'::jsonb) $cron$
);
select cron.schedule(
  'meta-sync-weekly-35d',
  '40 6 * * 1',
  $cron$ select public.invoke_edge_function('meta-sync', '{"days": 35, "trigger": "backfill"}'::jsonb) $cron$
);

-- Guru e Asaas: webhooks trazem o tempo real; o sync a cada 6 horas concilia.
select cron.schedule(
  'guru-sync-6h',
  '20 */6 * * *',
  $cron$ select public.invoke_edge_function('guru-sync', '{"days": 7}'::jsonb) $cron$
);
select cron.schedule(
  'asaas-sync-6h',
  '30 */6 * * *',
  $cron$ select public.invoke_edge_function('asaas-sync', '{"days": 7}'::jsonb) $cron$
);

-- Limpeza: eventos de webhook com mais de 180 dias e execuções com mais de 1 ano.
select cron.schedule(
  'cleanup-sync-history',
  '0 5 * * 0',
  $cron$
    delete from public.webhook_events where received_at < now() - interval '180 days';
    delete from public.sync_runs where started_at < now() - interval '365 days';
  $cron$
);
