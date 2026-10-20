import { describe, expect, it } from 'vitest'
import { mapTransaction } from './guru.ts'
import { mapPayment, parseInstallment } from './asaas.ts'

const USER = '00000000-0000-0000-0000-000000000001'

describe('mapTransaction (Guru)', () => {
  const rest = {
    id: 'a2f75fff-7634-47e5-8d1e-d4ce26b37dc2',
    status: 'approved',
    is_order_bump: 0,
    dates: {
      confirmed_at: 1791833646,
      ordered_at: 1791833511,
      updated_at: 1791833812,
      canceled_at: null,
    },
    product: {
      id: '1775008367',
      internal_id: 'a16fa288-6d0a-4dae-9e08-23fafa641808',
      name: 'Desafio Desincha Barriga (S4) - AppMax',
      offer: { id: 'o1', name: 'Desafio Desincha Barriga (R$ 29,90)' },
    },
    payment: {
      gross: 29.9,
      net: 29.9,
      total: 29.9,
      method: 'credit_card',
      marketplace_name: 'appmaxgw',
    },
    trackings: {
      utm_source: 'fb',
      pptc: { checkout_name: 'Comercial - Maju - R$ 297 - Desafio Pago' },
    },
    infrastructure: { ip: '45.6.199.242', user_agent: 'Mozilla/5.0' },
  }

  it('extrai o nome do checkout (REST: trackings.pptc)', () => {
    const row = mapTransaction(rest, USER)!
    expect(row.checkout_name).toBe('Comercial - Maju - R$ 297 - Desafio Pago')
    expect(row.product_id).toBe('1775008367')
    expect(row.confirmed_at).toBe('2026-10-12T19:34:06.000Z')
  })

  it('extrai o nome do checkout do webhook (source.pptc)', () => {
    const { trackings: _t, ...webhook } = rest
    const row = mapTransaction(
      { ...webhook, source: { pptc: { checkout_name: 'Comercial - Marlene - R$ 197' } } },
      USER,
    )!
    expect(row.checkout_name).toBe('Comercial - Marlene - R$ 197')
  })

  it('guarda o raw sem os dados de infraestrutura (IP, navegador)', () => {
    const raw = mapTransaction(rest, USER)!.raw as Record<string, unknown>
    expect(raw.infrastructure).toBeUndefined()
    expect(raw.trackings).toEqual(rest.trackings)
    expect(rest.infrastructure).toBeDefined() // não altera o objeto original
  })
})

describe('parseInstallment (Asaas)', () => {
  it('lê "Parcela X de Y" da descrição', () => {
    expect(
      parseInstallment({ description: 'Parcela 1 de 3. Plataforma', installment: 'i1' }),
    ).toEqual({
      number: 1,
      count: 3,
    })
    expect(
      parseInstallment({ description: 'Parcela 12 de 12. Acesso anual', installment: 'i1' }),
    ).toEqual({ number: 12, count: 12 })
  })

  it('prefere o installmentNumber da API ao da descrição', () => {
    expect(
      parseInstallment({ description: 'Parcela 1 de 3.', installment: 'i1', installmentNumber: 2 }),
    ).toEqual({ number: 2, count: 3 })
  })

  it('cobrança sem parcelamento é 1 de 1; parcelada sem descrição fica sem total', () => {
    expect(
      parseInstallment({ description: 'Mensalidade Academia das Mães', installment: null }),
    ).toEqual({
      number: null,
      count: 1,
    })
    expect(
      parseInstallment({ description: null, installment: 'i1', installmentNumber: 1 }),
    ).toEqual({
      number: 1,
      count: null,
    })
  })
})

describe('mapPayment (Asaas)', () => {
  it('guarda o link de pagamento e as parcelas', () => {
    const row = mapPayment(
      {
        id: 'pay_1',
        paymentLink: 'l23csz0h6ntcjadx',
        installment: 'f05149cc',
        description: 'Parcela 1 de 3.',
        value: 104,
        status: 'RECEIVED',
        dateCreated: '2026-08-13',
      },
      USER,
    )!
    expect(row).toMatchObject({
      payment_link_id: 'l23csz0h6ntcjadx',
      installment_number: 1,
      installment_count: 3,
      value: 104,
      asaas_created_at: '2026-08-13',
    })
  })
})
