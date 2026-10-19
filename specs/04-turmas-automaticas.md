# 04 — Turmas automáticas (Lançamento Pago)

## Objetivo

Cada semana vira uma turma criada e preenchida pelo sistema a partir do Guru, Asaas e Meta.
O Eduardo só digita o que não existe nas fontes: aulas (presentes ao vivo, espectadores
únicos) e debriefing. Tudo que hoje é digitado na tela de Lançamento Pago passa a ser calculado.

## Modelo de dados

```sql
alter table public.paid_launches
  add column start_date date,                 -- domingo D (chave da turma)
  add column auto boolean not null default false,
  add column auto_locked_at timestamptz,      -- depois de travada, o sync não recalcula
  add column computed jsonb,                  -- último cálculo automático (auditoria)
  add column computed_at timestamptz;
create unique index paid_launches_user_start_uidx on paid_launches (user_id, start_date) where start_date is not null;
```

`daily_data`, `commercial_sales`, `upsell_platform` continuam existindo e passam a ser
**preenchidos pelo cálculo**; `class_sessions` e `debriefing` seguem manuais. Campos manuais
são preservados em cada recálculo (merge por chave).

## Cálculo (função `compute_launch(user_id, start_date)` em SQL ou Edge `launch-compute`)

Janelas (spec 00): captação seg D−6..dom D; plataforma qui D+4..qua D+10; primeira hora qui D+4 8h–10h.

1. **Diário (Seg..Dom)**: por dia BRT de `confirmed_at`: investimento = Σ `meta_ad_insights.spend`
   da conta; ingressos = quantidade e valor de `kind = ingresso` (status aprovado/completo,
   líquido de reembolsos); bumps = idem `bump`.
2. **Plataforma diário (Primeira Hora, Qui..Qua)**: Guru `kind = plataforma` por dia e por método
   (cartão/PIX = `credit_card`/`pix`); Asaas contratos com parcela 1 paga, `dateCreated` no dia,
   coluna "boleto parcelado" (billing_type `BOLETO`/`PIX` do Asaas). Primeira Hora = Guru qui 8h–10h.
3. **Comercial**: por vendedora (`seller_id`): quantidade e valor de plataforma Guru (cartão/PIX) e
   Asaas (parcelado), já líquidos de reembolso. `commission_rate` da vendedora.
4. **Consolidado**: fórmulas da spec 00 com `business_settings`.
5. Grava em `paid_launches` (merge) e em `computed`; marca `computed_at`.

Gatilhos: ao final de cada sync (Guru/Asaas/Meta) recalcula as turmas cujas janelas tocam
os dias sincronizados; botão "Recalcular" na tela; nunca recalcula turma travada.

Criação automática: ao sincronizar, para cada domingo D com ≥ 1 ingresso em D−6..D e sem
turma, cria `paid_launches` com `start_date = D`, `batch = "S{n} · dd/mm"` (n = rotação pelo
nome do produto mais vendido na semana), `auto = true`.

## Tela

- Seletor de turma por data (domingo), com badge "Automática" / "Travada" / "Manual (antiga)".
- Campos calculados ficam somente leitura com ícone de fonte (Guru/Asaas/Meta) e tooltip
  "última sincronização às hh:mm". Campos manuais continuam editáveis.
- Linha "Primeira Hora" com rótulo "recorte da quinta, 8h–10h, não soma no total" (D2).
- Resultado consolidado mostra bruto, reembolsado e líquido (D5); comissão só plataforma (D3).
- "% Vendas Vindas Comercial" = plataforma comercial / plataforma total.
- Alertas: ingresso com valor ≠ `ticket_price`; vendas `outro` na semana (produto não classificado);
  gasto Meta zerado num dia com vendas.
- Botão "Travar turma" (congela os números; usado após o debriefing).

## Migração das turmas antigas

Turmas digitadas no Skip (se forem recriadas) ficam `auto = false` e não são recalculadas.

## Critérios de aceite

- Turma de 9/8/2026 recalculada bate com `relatorio.mjs` em ingressos, bumps e plataforma Guru
  (quantidades), e com o fechamento comercial em valores de plataforma por vendedora.
- Reembolso recebido via webhook depois da turma fechada → turma não travada recalcula e o
  histórico de `computed` mostra a diferença.
- Testes unitários das janelas (domingo, fuso −3, primeira hora) e das fórmulas com dados sintéticos.
