-- Sincronização incremental (spec 03): trava por provedor e transações do
-- Guru que nunca regridem. Rodar: npx supabase test db
begin;
select plan(9);

-- Usuário de teste ------------------------------------------------------------
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000a3', 'sync-test@example.com');

-- Trava ---------------------------------------------------------------------------
select ok(
  public.sync_try_lock('00000000-0000-0000-0000-0000000000a3', 'guru', 60),
  'primeira trava é concedida (e cria a linha da integração)'
);
select ok(
  exists (select 1 from public.integration_settings
           where user_id = '00000000-0000-0000-0000-0000000000a3' and provider = 'guru'),
  'linha da integração criada'
);
select ok(
  not public.sync_try_lock('00000000-0000-0000-0000-0000000000a3', 'guru', 60),
  'segunda trava simultânea é recusada'
);
select ok(
  public.sync_try_lock('00000000-0000-0000-0000-0000000000a3', 'asaas', 60),
  'trava é por provedor'
);
update public.integration_settings
   set sync_locked_until = now() - interval '1 second'
 where user_id = '00000000-0000-0000-0000-0000000000a3' and provider = 'guru';
select ok(
  public.sync_try_lock('00000000-0000-0000-0000-0000000000a3', 'guru', 60),
  'trava vencida pode ser retomada'
);

set local role authenticated;
select throws_ok(
  $$ select public.sync_try_lock('00000000-0000-0000-0000-0000000000a3', 'meta', 60) $$,
  '42501', null, 'usuário logado não chama a trava'
);
reset role;

-- Guru: versão mais antiga não sobrescreve ----------------------------------------
insert into public.guru_transactions (user_id, guru_id, status, guru_updated_at, raw)
values ('00000000-0000-0000-0000-0000000000a3', 'tx-sync-1', 'approved', '2026-10-20 12:00:00+00', '{}');

insert into public.guru_transactions (user_id, guru_id, status, guru_updated_at, raw)
values ('00000000-0000-0000-0000-0000000000a3', 'tx-sync-1', 'waiting_payment', '2026-10-20 11:00:00+00', '{}')
on conflict (guru_id) do update set status = excluded.status, guru_updated_at = excluded.guru_updated_at;
select is(
  (select status from public.guru_transactions where guru_id = 'tx-sync-1'),
  'approved', 'versão mais antiga é descartada'
);

insert into public.guru_transactions (user_id, guru_id, status, guru_updated_at, raw)
values ('00000000-0000-0000-0000-0000000000a3', 'tx-sync-1', 'refunded', '2026-10-21 09:00:00+00', '{}')
on conflict (guru_id) do update set status = excluded.status, guru_updated_at = excluded.guru_updated_at;
select is(
  (select status from public.guru_transactions where guru_id = 'tx-sync-1'),
  'refunded', 'versão mais nova sobrescreve'
);

-- Mesma versão (reclassificação, importador com --forcar) continua gravando.
update public.guru_transactions set status = 'refunded_again' where guru_id = 'tx-sync-1';
select is(
  (select status from public.guru_transactions where guru_id = 'tx-sync-1'),
  'refunded_again', 'atualização sem versão mais antiga passa'
);

select * from finish();
rollback;
