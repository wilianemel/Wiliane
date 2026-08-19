-- Bloco 10D — helper _cevo_media_flags(uuid)
-- Parte 4/10 do bloco 10. Idempotente.
-- Verifica capa (imagem ativa+destacada) e vídeo ativo do rascunho —
-- mesma lógica exata de antes.

create or replace function public._cevo_media_flags(p_draft_id uuid)
returns table (has_cover boolean, has_video boolean)
language plpgsql
security definer
set search_path = ''
as $func$
begin
  return query select
    exists (
      select 1 from public.venue_claim_draft_media
      where draft_id = p_draft_id and media_type = 'image' and is_active = true and is_featured = true
    ),
    exists (
      select 1 from public.venue_claim_draft_media
      where draft_id = p_draft_id and media_type = 'video' and is_active = true
    );
end;
$func$;

revoke all on function public._cevo_media_flags(uuid) from public;
revoke all on function public._cevo_media_flags(uuid) from anon;
revoke all on function public._cevo_media_flags(uuid) from authenticated;
