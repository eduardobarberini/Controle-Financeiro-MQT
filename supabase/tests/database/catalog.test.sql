-- Classificação do catálogo (spec 01) com os nomes reais da spec 00.
-- Rodar: npx supabase test db
begin;
select plan(41);

-- Produtos do Guru pelo nome ------------------------------------------------
select is(public.suggest_guru_product_kind('Desafio Desincha Barriga (S1) - AppMax'), 'ingresso', 'ingresso S1 AppMax');
select is(public.suggest_guru_product_kind('Desafio Desincha Barriga (S4) - Pagar.me'), 'ingresso', 'ingresso S4 Pagar.me');
select is(public.suggest_guru_product_kind('Desafio Desincha Barriga (S2) - MaxApp'), 'ingresso', 'ingresso S2 MaxApp');
select is(public.suggest_guru_product_kind('Cardápio Detox - AppMax'), 'bump', 'bump Cardápio Detox');
select is(public.suggest_guru_product_kind('Cardapio Detox'), 'bump', 'bump sem acento');
select is(public.suggest_guru_product_kind('Plataforma Mães Que Treinam (Renovação 1 ano) - Pagar.me'), 'renovacao', 'renovação');
select is(public.suggest_guru_product_kind('Plataforma MQT - Renovação'), 'renovacao', 'renovação MQT');
select is(public.suggest_guru_product_kind('Plataforma Mães Que Treinam - AppMax'), 'plataforma', 'plataforma AppMax');
select is(public.suggest_guru_product_kind('Mães Que Treinam'), 'plataforma', 'Mães Que Treinam');
select is(public.suggest_guru_product_kind('Mães Que Treinam (Anual)'), 'plataforma', 'Mães Que Treinam (Anual)');
select is(public.suggest_guru_product_kind('Projeto Mãe Sem Barriga (Assinatura Anual)'), 'plataforma', 'Projeto Mãe Sem Barriga');
select is(public.suggest_guru_product_kind('Top 50 Receitas Seca Barriga'), 'outro', 'oferta avulsa');
select is(public.suggest_guru_product_kind(null), 'outro', 'sem nome');

-- Tipo da venda do Guru -------------------------------------------------------
select is(public.guru_transaction_kind('ingresso', false, 'credit_card'), 'ingresso', 'ingresso normal');
select is(public.guru_transaction_kind('ingresso', true, 'credit_card'), 'outro', 'ingresso como order bump não conta');
select is(public.guru_transaction_kind('plataforma', false, 'free'), 'ignorar', 'oferta grátis ignorada');
select is(public.guru_transaction_kind(null, false, 'pix'), 'outro', 'sem produto');

-- Links do Asaas ----------------------------------------------------------------
select is(public.suggest_asaas_kind('Plataforma Mães Que Treinam (MZ)'), 'plataforma', 'link padrão MZ');
select is(public.suggest_asaas_kind('Plataforma Mães Que Treinam (RENOVAÇÃO - MZ)'), 'renovacao', 'link renovação');
select is(public.suggest_asaas_kind('Oferta Especial 8 Anos Mães Que Treinam (MJ)'), 'plataforma', 'oferta com Mães Que Treinam');
select is(public.suggest_asaas_kind('Parcela 12 de 12. Acesso anual a plataforma Mães Que Treinam'), 'plataforma', 'descrição sem link');
select is(public.suggest_asaas_kind('Mentoria Premium MQT (MJ)'), 'outro', 'mentoria');
select ok(public.is_standard_platform_link('Plataforma Mães Que Treinam (MJ)'), 'link padrão reconhecido');
select ok(not public.is_standard_platform_link('Plataforma Mães Que Treinam (com 45% desconto) - MJ'), 'link com desconto não é padrão');
select ok(public.is_company_link_name('Plataforma Mães Que Treinam (MQT)'), 'link da empresa (MQT)');
select ok(public.is_company_link_name('Oferta Mês Consumidor - MQT'), 'link da empresa - MQT');
select ok(not public.is_company_link_name('Plataforma Mães Que Treinam (MZ)'), 'link de vendedora não é da empresa');

-- Vendedoras e gatilhos (usuário de teste; tudo é desfeito no rollback) --------
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'teste-catalogo@mqt.local');
select public.ensure_business_defaults('00000000-0000-0000-0000-0000000000aa');

select is(
  (select name from public.sellers where id = public.match_seller('00000000-0000-0000-0000-0000000000aa', 'Comercial - Maju - R$ 297 - Desafio Pago', 'guru')),
  'Maju', 'checkout comercial da Maju');
select is(
  (select name from public.sellers where id = public.match_seller('00000000-0000-0000-0000-0000000000aa', 'Comercial - Marlene - R$ 197 (Renovação 1 ano)', 'guru')),
  'Marlene', 'checkout comercial da Marlene');
select is(public.match_seller('00000000-0000-0000-0000-0000000000aa', 'Comercial - MQT - R$ 297 - Desafio Pago', 'guru'), null, 'checkout da empresa sem vendedora');
select is(
  (select name from public.sellers where id = public.match_seller('00000000-0000-0000-0000-0000000000aa', 'Plataforma Mães Que Treinam (com 45% desconto) - MJ', 'asaas')),
  'Maju', 'link "- MJ"');

select throws_ok(
  $$update public.sellers set guru_patterns = array['(sem fechar'] where code = 'MJ' and user_id = '00000000-0000-0000-0000-0000000000aa'$$,
  null, 'padrão inválido é recusado');

-- Venda do Guru classificada na entrada e produto criado no catálogo.
insert into public.guru_transactions (user_id, guru_id, status, product_id, product_name, payment_method, confirmed_at, raw)
values ('00000000-0000-0000-0000-0000000000aa', 'tx-teste-1', 'approved', 'p-teste-1', 'Plataforma Mães Que Treinam - AppMax',
        'credit_card', '2026-08-14 02:30:00+00',
        '{"trackings": {"pptc": {"checkout_name": "Comercial - Maju - R$ 297 - Desafio Pago"}}}');
select is((select kind from public.guru_transactions where guru_id = 'tx-teste-1'), 'plataforma', 'venda classificada como plataforma');
select is((select s.name from public.guru_transactions t join public.sellers s on s.id = t.seller_id where t.guru_id = 'tx-teste-1'), 'Maju', 'venda atribuída à Maju');
select is((select confirmed_local from public.guru_transactions where guru_id = 'tx-teste-1'), date '2026-08-13', 'dia em BRT (23h30 de 13/8)');
select is((select kind from public.guru_products where guru_product_id = 'p-teste-1'), 'plataforma', 'produto criado com a sugestão');

-- Corrigir o produto reclassifica as vendas dele.
update public.guru_products set kind = 'outro', kind_source = 'manual' where guru_product_id = 'p-teste-1';
select is((select kind from public.guru_transactions where guru_id = 'tx-teste-1'), 'outro', 'mudança do produto propaga para a venda');
update public.guru_products set kind_source = 'auto' where guru_product_id = 'p-teste-1';
select is((select kind from public.guru_transactions where guru_id = 'tx-teste-1'), 'plataforma', 'voltar ao automático propaga para a venda');

-- Cobrança do link padrão da Marlene: plataforma, Marlene, contrato 297.
insert into public.asaas_payment_links (user_id, asaas_link_id, name)
values ('00000000-0000-0000-0000-0000000000aa', 'link-teste-mz', 'Plataforma Mães Que Treinam (MZ)');
insert into public.asaas_payments (user_id, asaas_id, payment_link_id, value, installment_number, installment_count, status)
values ('00000000-0000-0000-0000-0000000000aa', 'pay-teste-1', 'link-teste-mz', 104, 1, 3, 'RECEIVED');
select is(
  (select row(a.kind::text, s.name, a.contract_value)::text from public.asaas_payments a join public.sellers s on s.id = a.seller_id where a.asaas_id = 'pay-teste-1'),
  row('plataforma', 'Marlene', 297.00::numeric(14, 2))::text,
  'cobrança: plataforma / Marlene / 297');

-- Link com desconto: contrato = parcelas × valor; mudar o link propaga.
insert into public.asaas_payment_links (user_id, asaas_link_id, name)
values ('00000000-0000-0000-0000-0000000000aa', 'link-teste-off', 'Promoção Adeus Barriga de Mãe (MJ)');
insert into public.asaas_payments (user_id, asaas_id, payment_link_id, value, installment_number, installment_count, status)
values ('00000000-0000-0000-0000-0000000000aa', 'pay-teste-2', 'link-teste-off', 90, 1, 3, 'RECEIVED');
select is((select contract_value from public.asaas_payments where asaas_id = 'pay-teste-2'), 270.00::numeric(14, 2), 'contrato = 3 × 90');
update public.asaas_payment_links set kind = 'plataforma', kind_source = 'manual' where asaas_link_id = 'link-teste-off';
select is((select kind from public.asaas_payments where asaas_id = 'pay-teste-2'), 'plataforma', 'mudança do link propaga para a cobrança');

select * from finish();
rollback;
