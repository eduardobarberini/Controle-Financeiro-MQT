# 00 — Regras de negócio e glossário

Consolidado dos scripts em `MQT - IA/ferramentas` e das decisões do Eduardo. Onde os scripts
divergiam, está marcada a decisão (D1…) e a data.

## Esteira

Tráfego (só o Desafio roda anúncio) → quiz → **Desafio Desincha Barriga** (R$ 29,90, 7 dias no
WhatsApp, turmas semanais) → **order bump** Cardápio Detox (R$ 19,90) → **Plataforma Mães Que
Treinam** (anual; R$ 697 cheio, R$ 297/257 para quem fez o Desafio; à vista no Guru ou
parcelado em até 3x PIX/boleto no Asaas) → **renovação** (R$ 197/257) → ofertas pontuais.

## Fontes de dados

| Fonte | O que traz | Identidade |
|-------|-----------|------------|
| Guru (API v2 + webhook) | Vendas à vista de tudo (ingresso, bump, plataforma, renovação), reembolsos, chargebacks, assinaturas | `transaction.id` (uuid) |
| Asaas (API v3 + webhook) | Cobranças parceladas (parcela a parcela), links de pagamento, clientes | `payment.id`; contrato = `installment` |
| Meta Ads (API v26) | Gasto, impressões, cliques, compras por campanha e dia | `campaign_id` + `date` |
| Gastos Fixos (manual) | Custos da empresa | — |

Gateways atrás do Guru: `appmaxgw` (AppMax) e `pagarme2` (Pagar.me). O Guru não expõe a
taxa do gateway por venda de forma confiável; `payment.net` é informativo.

## Classificação de produtos (Guru)

Por nome do item (`items[0].name`, sem acento, minúsculo), nesta ordem:

| Tipo | Regra | Exemplos reais |
|------|-------|----------------|
| `ingresso` | contém `desafio desincha` e `is_order_bump` falso | "Desafio Desincha Barriga (S1) - AppMax", "(S4) - Pagar.me" |
| `bump` | contém `detox` ou `cardapio` | "Cardápio Detox - AppMax" (19,90; avulso 17,90) |
| `renovacao` | contém `renovac` | "Plataforma Mães Que Treinam (Renovação 1 ano)" (197/257) |
| `plataforma` | contém `plataforma`, ou `^maes que treinam( \(|$)`, ou `projeto mae sem barriga` | "Plataforma Mães Que Treinam - AppMax" (297/257/697) |
| `outro` | resto | — |

O sistema guarda a classificação por **produto** (id do Guru) na tabela `guru_products` e
sugere pelo nome; o usuário pode corrigir na tela (spec 01). Vendas com `method = free`
(ofertas "Teste", valor 0) são ignoradas nos totais.

S1…S4 no nome do ingresso é só a rotação de checkout; **não** define a turma (D10).

## Turma (Lançamento Pago)

- **Turma = domingo D** em que começa (largada dom 20h). Nome: `S{n} · dd/mm` ou "Turma de 9 de agosto".
- **Ingressos, bumps e tráfego**: confirmados entre **seg D−6 e dom D**, por dia (`confirmed_at` em BRT).
- **Plataforma (upsell)**: vendas entre **qui D+4 e qua D+10** (D1: valor real pago, só quando pago).
  Guru: `confirmed_at` no período, valor `payment.gross`. Asaas: **parcela 1 paga**
  (`RECEIVED|CONFIRMED|RECEIVED_IN_CASH`) com `dateCreated` no período, valor = total do contrato
  (valor de tabela da oferta do link; "Parcela 1 de 3" × valor da parcela).
- **Primeira hora**: vendas Guru de plataforma na **qui D+4 das 8h às 10h** (BRT). É um recorte
  da quinta, já contado no dia; serve para medir força de abertura (D2). Não soma no total.
- **Comercial na turma**: vendas de plataforma com `trackings.pptc.checkout_name` casando
  `^comercial\s*-\s*(maju|marlene)\b` (Guru) ou link do Asaas com `(MJ)`/`- MJ`/`(MAJU)` e `(MZ)`/`- MZ`/`(MARLENE)`.
  Comissão na turma: **5% só sobre plataforma**, líquida de reembolsos (D3). Renovação fica
  no módulo Renovações (D4).
- **Reembolsos**: abatem faturamento, imposto, lucro e ROAS (D5). Faturamento bruto e
  reembolsado aparecem como linhas informativas.
- **Aulas** (presentes ao vivo, espectadores únicos) e **debriefing** continuam manuais.

### Resultado consolidado da turma

```
fat_ingressos   = Σ gross ingressos (D−6..D) − Σ gross reembolsados
fat_bumps       = idem bumps
fat_plataforma  = Σ plataforma Guru (D+4..D+10, líquido de reembolso) + Σ Asaas parcela 1 paga (total contrato)
faturamento     = fat_ingressos + fat_bumps + fat_plataforma
investimento    = Σ gasto Meta (D−6..D)
imposto_trafego = investimento × tx_imposto_meta        (padrão 12,15%)
imposto_vendas  = faturamento × tx_imposto_vendas        (padrão 7,50%)
comissao        = fat_plataforma_comercial × 5%
custo_api       = custo fixo de WhatsApp/API da turma    (padrão R$ 490) + R$ 0,50 × ingressos (D6: configurável)
lucro_liquido   = faturamento − investimento − imposto_trafego − imposto_vendas − comissao − custo_api
margem          = lucro_liquido / faturamento
roas            = faturamento / investimento ; roas_front = (fat_ingressos + fat_bumps) / investimento
cac             = investimento / qtd_ingressos ; attach = qtd_bumps / qtd_ingressos
conv_plataforma = qtd_plataforma / qtd_ingressos
% comercial     = qtd_plataforma_comercial / qtd_plataforma      (D3: só plataforma nos dois lados)
veredito        = margem ≥ 22% forte · ≥ 16% saudável · ≥ 10% apertada · senão vermelho
```

Divergência resolvida: `turma.mjs` usa 297 fixo, conta Asaas por criação e estima 25% de
inadimplência. O sistema usa valor real e só pago (D1), então a estimativa de inadimplência
sai do resultado; a inadimplência real aparece no módulo Comercial/Asaas.

## Comercial (fechamento mensal)

- Vendedoras: Maju (`MJ`, fixo R$ 1.500) e Marlene (`MZ`, fixo R$ 1.200). Comissão 5%.
- Entra tudo que passou pelo link da vendedora: plataforma, renovação, ofertas. `Comercial - MQT`
  é link da empresa (sem comissão).
- Janela do mês: Guru por `confirmed_at`; Asaas por `dateCreated` da parcela 1, **contando só
  quando a parcela 1 está paga**; se pagar no mês seguinte, entra no mês seguinte.
- Base da comissão: valor bruto (Guru `gross`; Asaas valor de tabela do link quando o link é o
  padrão "Plataforma Mães Que Treinam (MJ)" = 297; senão total do contrato), **líquido de
  reembolsos** (Guru `refunded|chargeback|dispute`; Asaas `REFUNDED|REFUND_REQUESTED` ou `refunds[]`).
  Reembolso entra no mês da venda original.
- A pagar = fixo + 5% × líquido. Ticket médio = bruto / quantidade.
- Ajustes manuais com motivo (excluir cobrança dupla Guru+Asaas, incluir venda dividida,
  contrato truncado) ficam no banco e o mês pode ser fechado/travado (D7).
- Inadimplência (parcelas 2/3 vencidas) não é descontada da comissão.

## Renovações

- Renovações feitas = vendas `renovacao` no Guru + contratos Asaas com link "RENOVAÇÃO" (parcela 1 paga).
- Alunas a renovar no mês = compradoras da plataforma (Guru pago ou Asaas parcela 1 paga)
  **12 meses antes** (D8). Taxa = renovações / a renovar.

## Mensal / anual (DRE)

- Receita por competência = Guru confirmado no mês (líquido de reembolsos do mês do estorno)
  + Asaas parcelas pagas no mês (`payment_date`). Visão de caixa opcional (spec 08).
- Investimento = gasto Meta do mês (toda a conta: só o Desafio anuncia).
- Impostos por alíquota sobre tráfego e sobre receita (editáveis nas metas).
- Comissões = resultado do fechamento comercial do mês.
- Custos fixos = ocorrências dos Gastos Fixos no mês.

## Configurações de negócio (`business_settings`)

Uma linha por usuário, editável em Configurações → Negócio:

| Chave | Padrão | Uso |
|-------|--------|-----|
| `tax_meta_rate` | 12,15 | imposto sobre tráfego |
| `sales_tax_rate` | 7,50 | imposto sobre faturamento |
| `commission_rate` | 5,00 | comissão comercial |
| `api_cost_per_launch` | 490 | custo fixo de API/WhatsApp por turma |
| `whatsapp_cost_per_ticket` | 0,50 | custo variável por ingresso |
| `ticket_price` / `bump_price` | 29,90 / 19,90 | referência para alertas |
| `platform_list_price` | 297 | valor de tabela do link padrão do Asaas |
| `launch_window` | ingressos D−6..D; plataforma D+4..D+10; primeira hora qui 8–10h | janelas |
| `meta_ad_account_id` | act_176316426796892 | conta de anúncios |

## Decisões registradas

| # | Decisão | Data |
|---|---------|------|
| D1 | Plataforma na turma: valor real, só quando pago; Asaas pela parcela 1 paga | 19/10/2026 |
| D2 | Primeira hora é recorte da quinta (8h–10h), não soma; deixar explícito na tela | 19/10/2026 |
| D3 | % comercial e comissão da turma consideram só vendas de plataforma | 19/10/2026 |
| D4 | Renovações saem do consolidado da turma; módulo próprio | 19/10/2026 |
| D5 | Faturamento líquido de reembolsos (imposto, lucro e ROAS sobre o líquido) | 19/10/2026 |
| D6 | Constantes de negócio editáveis, não fixas no código | 19/10/2026 |
| D7 | Fechamento comercial com ajustes e trava dentro do sistema | 19/10/2026 |
| D8 | Alunas a renovar = compras da plataforma 12 meses antes | 19/10/2026 |
| D9 | Histórico importado das exportações existentes em `MQT - IA` | 19/10/2026 |
| D10 | S1–S4 no nome do produto não define turma; turma é o domingo | 19/10/2026 |
| D11 | Projeto Supabase próprio, separado do Antifraude | 19/10/2026 |
| D12 | Aba "Gastos" lista ocorrências do mês | 19/10/2026 |
| D13 | Só o Eduardo acessa; site na Vercel; custos manuais via Gastos Fixos | 18/10/2026 |
