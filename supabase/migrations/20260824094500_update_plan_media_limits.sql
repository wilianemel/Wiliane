-- ============================================================================
-- Migration: update_plan_media_limits
--
-- Atualiza os limites de mídia por plano em venue_plan_definitions:
--   Free:      2 fotos, 1 vídeo
--   Partner:   3 fotos, 2 vídeos
--   Essencial (plan_type='basico'): 4 fotos, 3 vídeos
--   Master:    6 fotos, 5 vídeos
--
-- UPDATE idempotente com valores absolutos (não incrementais) — reaplicar
-- esta migration não muda nada além de garantir os mesmos números de novo.
-- Não toca preço, click_limit, view_limit nem nenhuma outra coluna; não
-- insere linha nova (os 4 planos já existem, ver venue_commercial_plans e
-- venue_master_plan_and_diagnostics); não altera RLS, Storage nem mídia já
-- enviada — só os TETOS de quantidade permitida por plano.
-- ============================================================================

update public.venue_plan_definitions
set video_limit = 1, image_limit = 2, updated_at = now()
where plan_type = 'free';

update public.venue_plan_definitions
set video_limit = 2, image_limit = 3, updated_at = now()
where plan_type = 'partner';

update public.venue_plan_definitions
set video_limit = 3, image_limit = 4, updated_at = now()
where plan_type = 'basico';

update public.venue_plan_definitions
set video_limit = 5, image_limit = 6, updated_at = now()
where plan_type = 'master';
