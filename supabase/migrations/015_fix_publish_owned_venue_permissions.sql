-- 015_fix_publish_owned_venue_permissions.sql
-- NÃO APLICADA — aguardando autorização explícita antes de qualquer
-- execução no Supabase.
--
-- ============================================================================
-- Reforça apenas as permissões de public.publish_owned_venue(uuid), criada
-- em 014_create_publish_owned_venue.sql. Não altera o corpo da função, não
-- cria tabela/coluna, não toca em nenhuma policy, não altera nenhuma
-- migration anterior.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.publish_owned_venue(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_owned_venue(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.publish_owned_venue(uuid) TO authenticated;

-- ============================================================================
-- ROLLBACK MANUAL (NÃO executar automaticamente).
-- ============================================================================
--
-- REVOKE EXECUTE ON FUNCTION public.publish_owned_venue(uuid) FROM authenticated;
