-- Permite que administradores da plataforma preparem mídias de qualquer
-- estabelecimento, inclusive os que ainda não têm proprietário vinculado.
-- Proprietários e gerentes ativos preservam exatamente o acesso existente.

drop policy if exists "qual_e_a_boa venue owners insert media" on storage.objects;

create policy "qual_e_a_boa venue owners insert media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members
      where venue_id = ((storage.foldername(name))[1])::uuid
        and user_id = auth.uid()
        and member_role in ('owner', 'manager')
        and is_active = true
    )
  )
);

drop policy if exists "qual_e_a_boa venue owners update media" on storage.objects;

create policy "qual_e_a_boa venue owners update media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members
      where venue_id = ((storage.foldername(name))[1])::uuid
        and user_id = auth.uid()
        and member_role in ('owner', 'manager')
        and is_active = true
    )
  )
)
with check (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members
      where venue_id = ((storage.foldername(name))[1])::uuid
        and user_id = auth.uid()
        and member_role in ('owner', 'manager')
        and is_active = true
    )
  )
);

drop policy if exists "qual_e_a_boa venue owners delete media" on storage.objects;

create policy "qual_e_a_boa venue owners delete media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members
      where venue_id = ((storage.foldername(name))[1])::uuid
        and user_id = auth.uid()
        and member_role in ('owner', 'manager')
        and is_active = true
    )
  )
);
