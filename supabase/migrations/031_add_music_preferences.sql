-- 031_add_music_preferences.sql
-- APLICADA — já executada manualmente no Supabase remoto. Mantida aqui como
-- registro histórico do schema; reexecutar é seguro ("add column if not
-- exists"), mas não é mais necessário.

alter table public.user_preferences
  add column if not exists preferred_music_styles text[] not null default '{}'::text[];
