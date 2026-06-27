-- Enable Supabase Realtime for habits and habit_logs

alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_logs;
