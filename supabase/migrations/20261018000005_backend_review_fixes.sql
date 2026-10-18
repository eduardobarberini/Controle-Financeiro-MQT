-- Correções da revisão do backend.

-- -----------------------------------------------------------------------------
-- 1. invoke_edge_function sai do schema public (que o PostgREST expõe como RPC)
--    para um schema privado, só aceita as funções conhecidas e nunca pode ser
--    chamada por anon/authenticated.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;

drop function if exists public.invoke_edge_function(text, jsonb);

create or replace function private.invoke_edge_function(fn text, body jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  key text;
begin
  if fn not in ('guru-sync', 'asaas-sync', 'meta-sync') then
    raise exception 'invoke_edge_function: função não permitida: %', fn;
  end if;

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

revoke all on function private.invoke_edge_function(text, jsonb) from public, anon, authenticated;

-- Reagenda os jobs apontando para o schema privado.
select cron.unschedule(jobname) from cron.job
  where jobname in ('meta-sync-4h', 'meta-sync-weekly-35d', 'guru-sync-6h', 'asaas-sync-6h');

select cron.schedule('meta-sync-4h', '10 */4 * * *',
  $cron$ select private.invoke_edge_function('meta-sync', '{"days": 7}'::jsonb) $cron$);
select cron.schedule('meta-sync-weekly-35d', '40 6 * * 1',
  $cron$ select private.invoke_edge_function('meta-sync', '{"days": 35, "trigger": "backfill"}'::jsonb) $cron$);
select cron.schedule('guru-sync-6h', '20 */6 * * *',
  $cron$ select private.invoke_edge_function('guru-sync', '{"days": 7}'::jsonb) $cron$);
select cron.schedule('asaas-sync-6h', '30 */6 * * *',
  $cron$ select private.invoke_edge_function('asaas-sync', '{"days": 7}'::jsonb) $cron$);

-- -----------------------------------------------------------------------------
-- 2. Watchdog: execução que ficou "running" por mais de 15 min (função morta
--    por limite de tempo) é marcada como erro para não travar a tela.
-- -----------------------------------------------------------------------------
select cron.schedule('sync-runs-watchdog', '*/10 * * * *', $cron$
  update public.sync_runs
     set status = 'error', error = 'Tempo limite excedido (watchdog)', finished_at = now()
   where status = 'running' and started_at < now() - interval '15 minutes';
  update public.integration_settings s
     set last_sync_status = 'error', last_error = 'Tempo limite excedido (watchdog)'
   where s.last_sync_status = 'running'
$cron$);

-- Índice alinhado à consulta da tela (histórico por usuário, mais recentes primeiro).
create index if not exists sync_runs_user_started_idx on public.sync_runs (user_id, started_at desc);

-- -----------------------------------------------------------------------------
-- 3. Visão mensal: reembolsos do Guru no mês do estorno (canceled_at), vendas
--    brutas mantidas no mês da confirmação; Asaas: recebido = pagou, estornos
--    no mês do estorno a partir de raw->'refunds'.
-- -----------------------------------------------------------------------------
create or replace view public.v_monthly_integrations
with (security_invoker = true)
as
with guru_sales as (
  select
    user_id,
    extract(year from (confirmed_at at time zone 'America/Sao_Paulo'))::int as year,
    extract(month from (confirmed_at at time zone 'America/Sao_Paulo'))::int as month,
    count(*) as guru_sales,
    coalesce(sum(gross), 0) as guru_gross,
    coalesce(sum(net), 0) as guru_net
  from public.guru_transactions
  where confirmed_at is not null
    and status in ('approved', 'completed', 'refunded', 'chargeback')
  group by 1, 2, 3
),
guru_refunds as (
  select
    user_id,
    extract(year from (canceled_at at time zone 'America/Sao_Paulo'))::int as year,
    extract(month from (canceled_at at time zone 'America/Sao_Paulo'))::int as month,
    count(*) as guru_refund_count,
    coalesce(sum(gross), 0) as guru_refunded
  from public.guru_transactions
  where canceled_at is not null and status in ('refunded', 'chargeback')
  group by 1, 2, 3
),
asaas_paid as (
  select
    user_id,
    extract(year from payment_date)::int as year,
    extract(month from payment_date)::int as month,
    count(*) as asaas_paid_count,
    coalesce(sum(value), 0) as asaas_received,
    coalesce(sum(net_value), 0) as asaas_net
  from public.asaas_payments
  where payment_date is not null and deleted = false
  group by 1, 2, 3
),
asaas_refunds as (
  select
    p.user_id,
    extract(year from (r->>'dateCreated')::date)::int as year,
    extract(month from (r->>'dateCreated')::date)::int as month,
    coalesce(sum((r->>'value')::numeric), 0) as asaas_refunded
  from public.asaas_payments p
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(p.raw->'refunds') = 'array' then p.raw->'refunds' else '[]'::jsonb end
  ) as r
  where p.deleted = false
    and upper(coalesce(r->>'status', '')) = 'DONE'
    and (r->>'dateCreated') ~ '^\d{4}-\d{2}-\d{2}'
  group by 1, 2, 3
),
meta as (
  select
    user_id,
    extract(year from date)::int as year,
    extract(month from date)::int as month,
    coalesce(sum(spend), 0) as meta_spend,
    coalesce(sum(impressions), 0) as meta_impressions,
    coalesce(sum(link_clicks), 0) as meta_link_clicks,
    coalesce(sum(leads), 0) as meta_leads,
    coalesce(sum(purchases), 0) as meta_purchases,
    coalesce(sum(purchase_value), 0) as meta_purchase_value
  from public.meta_ad_insights
  group by 1, 2, 3
),
keys as (
  select user_id, year, month from guru_sales
  union select user_id, year, month from guru_refunds
  union select user_id, year, month from asaas_paid
  union select user_id, year, month from asaas_refunds
  union select user_id, year, month from meta
)
select
  k.user_id,
  k.year,
  k.month,
  coalesce(g.guru_sales, 0) as guru_sales,
  coalesce(g.guru_gross, 0) as guru_gross,
  coalesce(g.guru_net, 0) as guru_net,
  coalesce(gr.guru_refund_count, 0) as guru_refund_count,
  coalesce(gr.guru_refunded, 0) as guru_refunded,
  coalesce(a.asaas_paid_count, 0) as asaas_paid_count,
  coalesce(a.asaas_received, 0) as asaas_received,
  coalesce(a.asaas_net, 0) as asaas_net,
  coalesce(ar.asaas_refunded, 0) as asaas_refunded,
  coalesce(m.meta_spend, 0) as meta_spend,
  coalesce(m.meta_impressions, 0) as meta_impressions,
  coalesce(m.meta_link_clicks, 0) as meta_link_clicks,
  coalesce(m.meta_leads, 0) as meta_leads,
  coalesce(m.meta_purchases, 0) as meta_purchases,
  coalesce(m.meta_purchase_value, 0) as meta_purchase_value
from keys k
left join guru_sales g on g.user_id = k.user_id and g.year = k.year and g.month = k.month
left join guru_refunds gr on gr.user_id = k.user_id and gr.year = k.year and gr.month = k.month
left join asaas_paid a on a.user_id = k.user_id and a.year = k.year and a.month = k.month
left join asaas_refunds ar on ar.user_id = k.user_id and ar.year = k.year and ar.month = k.month
left join meta m on m.user_id = k.user_id and m.year = k.year and m.month = k.month;
