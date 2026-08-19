-- Bloco 12 — publish_owned_venue(uuid)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Já estava correta (tudo qualificado via c./v_result.) — wrapper fino e
-- seguro de complete_new_venue_onboarding(), mesma assinatura antiga
-- (target_venue_id) e mesmo formato de retorno (venue_id, is_published)
-- por compatibilidade. Incluída aqui só para fechar a auditoria completa
-- das 14 funções RETURNS TABLE. Depende do bloco 11 já aplicado.

create or replace function public.publish_owned_venue(target_venue_id uuid)
returns table (
  venue_id uuid,
  is_published boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_result record;
begin
  select c.venue_id, c.status into v_result
  from public.complete_new_venue_onboarding(target_venue_id) c;

  return query select v_result.venue_id, (v_result.status = 'published');
end;
$func$;

comment on function public.publish_owned_venue(uuid) is
  'Wrapper seguro de complete_new_venue_onboarding() — mantém a assinatura antiga (target_venue_id) e o formato antigo de retorno (venue_id, is_published) por compatibilidade, mas delega toda a validação para a checklist completa nova. Nenhuma chamada a esta função, direta ou pelo frontend, consegue mais publicar um cadastro incompleto.';

revoke all on function public.publish_owned_venue(uuid) from public;
revoke all on function public.publish_owned_venue(uuid) from anon;
grant execute on function public.publish_owned_venue(uuid) to authenticated;
