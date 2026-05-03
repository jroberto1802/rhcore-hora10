-- Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', true)
on conflict (id) do nothing;

-- Force bucket to be public if it already existed
update storage.buckets
set public = true
where id = 'documentos' and public is distinct from true;

-- Policies for storage.objects on 'documentos' bucket
-- Allow public read
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'Public can view documentos') then
    create policy "Public can view documentos"
    on storage.objects
    for select
    using (bucket_id = 'documentos');
  end if;
end $$;

-- Allow authenticated users to upload
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'Authenticated can upload documentos') then
    create policy "Authenticated can upload documentos"
    on storage.objects
    for insert
    with check (bucket_id = 'documentos' and auth.role() = 'authenticated');
  end if;
end $$;

-- Allow authenticated users to update
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'Authenticated can update documentos') then
    create policy "Authenticated can update documentos"
    on storage.objects
    for update
    using (bucket_id = 'documentos' and auth.role() = 'authenticated');
  end if;
end $$;

-- Allow authenticated users to delete
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'Authenticated can delete documentos') then
    create policy "Authenticated can delete documentos"
    on storage.objects
    for delete
    using (bucket_id = 'documentos' and auth.role() = 'authenticated');
  end if;
end $$;