# 06 — Renovações automáticas

## Objetivo

O módulo Renovações deixa de ser digitado: renovações feitas e receita vêm do Guru e do Asaas;
alunas a renovar vêm das compras da Plataforma 12 meses antes (D8).

## Regras

- **Renovações feitas no mês** = Guru `kind = renovacao` confirmadas no mês (aprovado/completo,
  líquido de reembolso) + Asaas contratos de link `kind = renovacao` com parcela 1 paga e
  `dateCreated` no mês. Receita = Σ bruto (Guru `gross`, Asaas total do contrato).
- **Alunas a renovar no mês M** = compradoras distintas (por CPF, senão e-mail) de
  `kind = plataforma` pagas em M−12 (Guru confirmado ou Asaas parcela 1 paga), excluindo reembolsadas.
- **Taxa** = renovações / a renovar. Meta de taxa continua em `goals.renewal_rate_goal`.
- Renovação é por aluna: se a mesma aluna renovar duas vezes no mês, conta 1 na taxa e tudo na receita.

## Modelo de dados

A tabela `renewals` passa a ter `auto boolean`, `students_to_renew_auto`, `renewals_auto`,
`renewal_revenue_auto`, `computed_at`. Os campos manuais continuam como ajuste (override) e a
tela mostra automático × manual lado a lado. View `v_renewals_monthly` faz o cálculo.

## Tela

- Coluna "Automático" ao lado de cada campo, botão "Usar automático" por linha e para o ano.
- Lista de alunas a renovar do mês (nome, compra original, valor, renovou? data) com busca.
- Alerta: aluna renovou sem constar na base (compra original fora da janela ou em outro nome).

## Critérios de aceite

- Mês com dados importados (ex.: set/2026): renovações e receita batem com a soma manual das
  vendas `renovacao` do extrato.
- Aluna que comprou em set/2025 aparece em "a renovar" de set/2026.
- Testes unitários da dedupe por CPF/e-mail e da janela M−12 (virada de ano).
