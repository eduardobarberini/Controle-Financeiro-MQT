-- Correções da revisão do módulo Gastos Fixos.

-- 1. Excluir um gasto recorrente NÃO apaga as ocorrências pagas: elas viram
--    gastos pontuais independentes (origin_id = null) e o histórico se mantém.
alter table public.fixed_expenses drop constraint fixed_expenses_origin_id_fkey;
alter table public.fixed_expenses
  add constraint fixed_expenses_origin_id_fkey
  foreign key (origin_id) references public.fixed_expenses (id) on delete set null;

-- 2. Só pode existir uma ocorrência paga por competência de cada recorrência
--    (evita duplicar com duplo clique em "Pagar").
create unique index fixed_expenses_origin_competence_uidx
  on public.fixed_expenses (origin_id, year, month)
  where origin_id is not null;

-- 3. Término da recorrência: mês e ano juntos ou nenhum.
alter table public.fixed_expenses
  add constraint fixed_expenses_ends_both_or_none
  check ((ends_year is null) = (ends_month is null));
