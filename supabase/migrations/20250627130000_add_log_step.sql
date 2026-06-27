alter table public.habits
add column log_step smallint not null default 5;

alter table public.habits
add constraint habits_log_step_positive check (log_step > 0);
