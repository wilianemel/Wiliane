-- 019_extend_interaction_business_events.sql
-- APLICADA — confirmada ao vivo no Supabase em 2026-08-10: os 3 valores
-- (whatsapp_click/route_click/reservation_click) já existem no enum
-- interaction_type. Este arquivo passa a existir só como registro da
-- estrutura real, para uma instalação nova poder reproduzi-la — não deve
-- ser reaplicado sem necessidade (é idempotente, mas não é preciso rodar de
-- novo em cima do banco atual).
--
-- Objetivo: novos valores em public.interaction_type para capturar
-- intenção comercial real (clique em WhatsApp, rota ou reserva), a partir
-- de src/components/venues/venue-profile.tsx.
--
-- Só ALTER TYPE ... ADD VALUE — nenhuma outra alteração nesta migration,
-- por design. Mesma restrição do Postgres já documentada em 017: um valor
-- de enum recém-adicionado não pode ser usado na mesma transação em que foi
-- criado, então nenhum código pode gravar esses valores até esta migration
-- ser aplicada e commitada isoladamente.
--
-- Este arquivo é seguro para revisar e reexecutar: "add value if not
-- exists" não falha nem duplica se rodado mais de uma vez.

alter type public.interaction_type add value if not exists 'whatsapp_click';
alter type public.interaction_type add value if not exists 'route_click';
alter type public.interaction_type add value if not exists 'reservation_click';
