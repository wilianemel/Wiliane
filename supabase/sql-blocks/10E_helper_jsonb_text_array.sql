-- Bloco 10E — helper _cevo_text_array(jsonb)
-- Parte 5/10 do bloco 10. Idempotente.
-- Extrai o padrão repetido "jsonb array -> text[]" (atmosferas/intenções/
-- companhia) para um único lugar, sem duplicar a mesma expressão 3 vezes
-- no bloco 10F. Mesmo resultado exato de antes.

create or replace function public._cevo_text_array(p_value jsonb)
returns text[]
language sql
security definer
set search_path = ''
as $func$
  select coalesce(
    (select array_agg(elem) from jsonb_array_elements_text(coalesce(p_value, '[]'::jsonb)) as elem),
    '{}'::text[]
  );
$func$;

revoke all on function public._cevo_text_array(jsonb) from public;
revoke all on function public._cevo_text_array(jsonb) from anon;
revoke all on function public._cevo_text_array(jsonb) from authenticated;
