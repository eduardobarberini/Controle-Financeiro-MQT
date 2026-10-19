# 08 — Mensal e anual automáticos (DRE)

## Objetivo

O Controle Mensal e o Controle Anual deixam de depender de digitação: cada linha do DRE tem uma
fonte, o manual vira ajuste, e o anual acompanha a empresa contra as metas.

## Estrutura do DRE mensal

| Linha | Fonte | Regra |
|------|-------|-------|
| Receita bruta ingressos / bumps / plataforma / renovação / outros | Guru + Asaas | por `kind`; Guru por `confirmed_at` (competência); Asaas parcelas pagas no mês (`payment_date`) |
| (−) Reembolsos e chargebacks | Guru + Asaas | no mês do estorno |
| = Receita líquida | | |
| (−) Investimento em tráfego | Meta | gasto do mês |
| (−) Imposto sobre tráfego | cálculo | investimento × `tax_meta_rate` |
| (−) Imposto sobre vendas | cálculo | receita líquida × `sales_tax_rate` |
| (−) Comissões comerciais | Comercial (spec 05) | fechamento do mês (ou prévia se aberto) |
| (−) Salários fixos do comercial | Comercial | `sellers.fixed_salary` |
| (−) Custos de API/WhatsApp | turmas (spec 04) | Σ `custo_api` das turmas do mês |
| (−) Custos fixos | Gastos Fixos | ocorrências do mês (reais + projeções) |
| (−) Outros variáveis | manual | campo livre (ajuste) |
| = Lucro líquido · margem · ROAS | cálculo | |

Caixa × competência: toggle "Competência" (padrão) / "Caixa". Em caixa, Asaas entra por
`payment_date` (já é), Guru por `confirmed_at` (aprox. de recebimento; gateways repassam em D+1/D+30)
e reembolsos pela data do estorno. A receber: parcelas Asaas `PENDING`/`OVERDUE` (já existe na view).

## Modelo de dados

- `monthly_details` ganha `source` por campo: cada valor automático fica em `auto_*` (view
  `v_monthly_dre`), e o que o usuário digita vira **ajuste** (`adjustment_*`, pode ser negativo),
  com `final = auto + adjustment`. Elimina o "preencher e salvar" que copia valores.
- View `v_monthly_dre(user_id, year, month, …todas as linhas…)` consolida `v_monthly_integrations`
  (por kind), `commercial_closings`, custos de turmas, `fixed_expenses` efetivos e ajustes.
- `goals` ganha metas por linha opcional (ex.: ROAS alvo, CAC máximo).

## Telas

- **Mensal**: tabela DRE (linhas acima) × 12 meses; cada célula mostra automático e, ao clicar,
  campo de ajuste com motivo. Gráfico atual mantido. Indicador de "dados até" por fonte
  (última sync). Filtro competência/caixa.
- **Anual**: KPIs (receita líquida, lucro, margem, ROAS, CAC médio, conversão desafio→plataforma,
  taxa de renovação) contra metas; DRE anual acumulado; mês a mês; cartão "A receber" e "Vencido";
  comparação com o ano anterior quando houver histórico.
- Exportar CSV/PDF do DRE.

## Critérios de aceite

- Setembro/2026 importado: receita líquida do DRE = Σ turmas do mês (spec 04) ± vendas fora de
  turma (renovações, ofertas), demonstrável numa linha de conciliação "diferença = X".
- Alterar uma alíquota nas metas recalcula o DRE sem recarregar dados.
- Ajuste manual com motivo aparece com ícone e some do cálculo se removido.
- Nenhum valor é copiado de uma tabela para outra: tudo é view + ajustes.
