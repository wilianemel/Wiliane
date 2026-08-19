-- Bloco 10F — helper _cevo_checklist(jsonb, jsonb, boolean, boolean)
-- Parte 6/10 do bloco 10. Idempotente. Execute depois de 10E.
-- Monta a checklist completa (todos os campos) via _venue_publish_
-- checklist já existente, sem duplicar.

create or replace function public._cevo_checklist(
  p_venue_data jsonb,
  p_business_hours jsonb,
  p_has_cover boolean,
  p_has_video boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $func$
begin
  return public._venue_publish_checklist(
    p_venue_data->>'name', p_venue_data->>'category', p_venue_data->>'description',
    p_venue_data->>'city', p_venue_data->>'neighborhood', p_venue_data->>'address',
    p_venue_data->>'price_range', nullif(p_venue_data->>'average_price_per_person', '')::numeric,
    p_venue_data->>'whatsapp_number', p_venue_data->>'whatsapp', p_venue_data->>'whatsapp_url',
    public._cevo_text_array(p_venue_data->'atmospheres'),
    public._cevo_text_array(p_venue_data->'intentions'),
    public._cevo_text_array(p_venue_data->'companions'),
    public._venue_hours_jsonb_is_complete(p_business_hours), p_has_cover, p_has_video
  );
end;
$func$;

revoke all on function public._cevo_checklist(jsonb, jsonb, boolean, boolean) from public;
revoke all on function public._cevo_checklist(jsonb, jsonb, boolean, boolean) from anon;
revoke all on function public._cevo_checklist(jsonb, jsonb, boolean, boolean) from authenticated;
