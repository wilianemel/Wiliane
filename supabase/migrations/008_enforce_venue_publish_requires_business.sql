-- 008_enforce_venue_publish_requires_business.sql
-- Regra de negócio (D5): um estabelecimento só pode ser publicado
-- (is_published = true) depois de ter um cadastro empresarial com status
-- 'verified' em public.venue_business_registrations.
--
-- Só bloqueia a TRANSIÇÃO para publicado — insert com is_published = true,
-- ou update em que is_published estava false e passa a true. Uma vez
-- publicado, edições que não mexem em is_published continuam livres. Isso
-- "perdoa" os 6 estabelecimentos que já estão publicados hoje sem cadastro
-- empresarial (confirmados na auditoria de public.venues), sem exigir uma
-- migração de dados retroativa nesta etapa — eles só passariam a precisar
-- de um cadastro verified se alguém explicitamente despublicasse e tentasse
-- republicá-los.
--
-- Depende de 007_create_business_registration.sql já aplicada (a tabela
-- venue_business_registrations e o tipo business_registration_status
-- precisam existir). Não altera as migrations 001-007.

create or replace function public.enforce_venue_publish_requires_verified_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_new_publish boolean;
  v_has_verified_registration boolean;
begin
  if tg_op = 'INSERT' then
    v_is_new_publish := new.is_published;
  else
    v_is_new_publish := new.is_published and (old.is_published is distinct from new.is_published);
  end if;

  if v_is_new_publish then
    select exists (
      select 1
      from public.venue_business_registrations
      where venue_id = new.id
        and registration_status = 'verified'::public.business_registration_status
    )
    into v_has_verified_registration;

    if not v_has_verified_registration then
      raise exception
        'Estabelecimento só pode ser publicado após cadastro empresarial verificado.';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_venue_publish_requires_verified_business() is
  'Bloqueia a transição de um venue para is_published = true sem um cadastro empresarial verified em venue_business_registrations. Não reavalia venues que já estavam publicados e permanecem publicados.';

drop trigger if exists enforce_venue_publish_requires_business on public.venues;

create trigger enforce_venue_publish_requires_business
before insert or update on public.venues
for each row
execute function public.enforce_venue_publish_requires_verified_business();

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- ============================================================================
--
-- drop trigger if exists enforce_venue_publish_requires_business on public.venues;
-- drop function if exists public.enforce_venue_publish_requires_verified_business();
