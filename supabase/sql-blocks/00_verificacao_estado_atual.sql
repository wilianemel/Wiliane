-- Bloco 00 — VERIFICAÇÃO (somente leitura, não altera nada)
-- Rode primeiro, sozinho, no SQL Editor do Supabase, antes de qualquer
-- outro bloco. Mostra o estado atual das 14 funções RETURNS TABLE do
-- fluxo de reivindicação/onboarding de estabelecimentos — quais já
-- existem, com que assinatura e que tipo de retorno — para confirmar de
-- onde a aplicação dos blocos seguintes deve partir. Nenhum INSERT,
-- UPDATE, DELETE, CREATE ou DROP aqui.

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  p.prosecdef as security_definer,
  obj_description(p.oid, 'pg_proc') as comment
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'search_claimable_venues',
    'set_venue_claim_draft_media_featured',
    'retire_venue_media',
    'set_venue_media_featured',
    'start_or_resume_venue_claim',
    'save_venue_claim_draft',
    'submit_venue_claim_draft',
    'approve_venue_claim',
    'reject_venue_claim',
    'complete_existing_venue_onboarding',
    'complete_new_venue_onboarding',
    'publish_owned_venue',
    'admin_remove_venue_owner',
    'admin_release_venue_owner_block'
  )
order by p.proname;

-- Confirma que as tabelas que essas funções usam já existem (nenhum bloco
-- seguinte cria tabela — só substitui as 14 funções acima).
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'venues',
    'venue_members',
    'venue_media',
    'venue_claim_requests',
    'venue_claim_drafts',
    'venue_claim_draft_media',
    'venue_owner_reclaim_blocks',
    'venue_owner_removal_audit',
    'venue_legacy_completeness_waivers'
  )
order by table_name;
