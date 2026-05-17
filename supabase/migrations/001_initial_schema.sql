create extension if not exists postgis;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recommendation-photos',
  'recommendation-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create type public.user_role as enum ('member', 'admin');
create type public.recommendation_category as enum ('almoco', 'cafe', 'delivery', 'jantar', 'lanche', 'sobremesa');
create type public.price_band as enum ('ate-30', '30-60', '60-100', '100-plus');
create type public.moderation_status as enum ('active', 'reported', 'hidden');
create type public.report_status as enum ('open', 'reviewed', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  handle text not null unique,
  avatar_url text,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  dish_name text not null,
  place_name text not null,
  category public.recommendation_category not null,
  city text not null,
  neighborhood text not null,
  address text not null,
  location geography(point, 4326) not null,
  latitude double precision generated always as (st_y(location::geometry)) stored,
  longitude double precision generated always as (st_x(location::geometry)) stored,
  price_paid numeric(10, 2) not null check (price_paid > 0),
  price_band public.price_band not null,
  value_score smallint not null check (value_score between 1 and 5),
  summary text not null,
  why_worth_it text not null,
  status public.moderation_status not null default 'active',
  report_count integer not null default 0 check (report_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recommendation_photos (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  storage_path text not null check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and split_part(storage_path, '/', 2) = recommendation_id::text
  ),
  alt_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  label text not null unique check (char_length(label) between 2 and 30)
);

create table public.recommendation_tags (
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (recommendation_id, tag_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index recommendations_status_idx on public.recommendations(status);
create index recommendations_city_neighborhood_idx on public.recommendations(city, neighborhood);
create index recommendations_category_idx on public.recommendations(category);
create index recommendations_location_idx on public.recommendations using gist(location);
create index reports_recommendation_status_idx on public.reports(recommendation_id, status);
create unique index reports_unique_reporter_recommendation_idx
  on public.reports(recommendation_id, reporter_id)
;

alter table public.profiles enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_photos enable row level security;
alter table public.tags enable row level security;
alter table public.recommendation_tags enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_logs enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id and role = 'member');
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id and role = 'member');
create policy "admins update profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create policy "active recommendations are readable" on public.recommendations
  for select using (status = 'active' or public.is_admin());

create policy "logged users create recommendations" on public.recommendations
  for insert with check (auth.uid() = author_id);

create policy "authors and admins update recommendations" on public.recommendations
  for update using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

create policy "authors and admins delete recommendations" on public.recommendations
  for delete using (auth.uid() = author_id or public.is_admin());

create policy "photos follow readable recommendations" on public.recommendation_photos
  for select using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and (r.status = 'active' or public.is_admin())
    )
  );

create policy "authors manage own photos" on public.recommendation_photos
  for all using (
    split_part(storage_path, '/', 1) = auth.uid()::text
    and split_part(storage_path, '/', 2) = recommendation_id::text
    and
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and (r.author_id = auth.uid() or public.is_admin())
    )
  ) with check (
    split_part(storage_path, '/', 1) = auth.uid()::text
    and split_part(storage_path, '/', 2) = recommendation_id::text
    and
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and (r.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "admins manage recommendation photos" on public.recommendation_photos
  for all using (public.is_admin()) with check (public.is_admin());

create policy "tags are readable" on public.tags for select using (true);
create policy "logged users create tags" on public.tags for insert with check (auth.uid() is not null);
create policy "recommendation tags are readable" on public.recommendation_tags for select using (true);
create policy "authors manage own recommendation tags" on public.recommendation_tags
  for all using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and (r.author_id = auth.uid() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and (r.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "recommendation photos are publicly readable" on storage.objects
  for select using (bucket_id = 'recommendation-photos');

create policy "users upload own recommendation photos" on storage.objects
  for insert with check (
    bucket_id = 'recommendation-photos'
    and array_length(storage.foldername(name), 1) = 2
    and auth.uid()::text = (storage.foldername(name))[1]
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.recommendations r
      where r.id::text = (storage.foldername(name))[2]
      and r.author_id = auth.uid()
    )
  );

create policy "users manage own recommendation photos" on storage.objects
  for update using (
    bucket_id = 'recommendation-photos'
    and array_length(storage.foldername(name), 1) = 2
    and auth.uid()::text = (storage.foldername(name))[1]
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.recommendations r
      where r.id::text = (storage.foldername(name))[2]
      and r.author_id = auth.uid()
    )
  ) with check (
    bucket_id = 'recommendation-photos'
    and array_length(storage.foldername(name), 1) = 2
    and auth.uid()::text = (storage.foldername(name))[1]
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.recommendations r
      where r.id::text = (storage.foldername(name))[2]
      and r.author_id = auth.uid()
    )
  );

create policy "users delete own recommendation photos" on storage.objects
  for delete using (
    bucket_id = 'recommendation-photos'
    and array_length(storage.foldername(name), 1) = 2
    and auth.uid()::text = (storage.foldername(name))[1]
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and exists (
      select 1 from public.recommendations r
      where r.id::text = (storage.foldername(name))[2]
      and r.author_id = auth.uid()
    )
  );

create policy "admins manage all recommendation photos" on storage.objects
  for all using (bucket_id = 'recommendation-photos' and public.is_admin())
  with check (bucket_id = 'recommendation-photos' and public.is_admin());

create policy "logged users create reports" on public.reports
  for insert with check (auth.uid() = reporter_id and reporter_id is not null);

create policy "admins read reports" on public.reports
  for select using (public.is_admin());

create policy "admins manage audit logs" on public.admin_audit_logs
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.increment_recommendation_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.recommendations
  set
    report_count = report_count + 1,
    status = case when report_count + 1 >= 3 then 'hidden'::public.moderation_status else 'reported'::public.moderation_status end,
    updated_at = now()
  where id = new.recommendation_id;

  return new;
end;
$$;

revoke execute on function public.increment_recommendation_report_count() from public, anon, authenticated;

create trigger reports_increment_recommendation_report_count
after insert on public.reports
for each row execute function public.increment_recommendation_report_count();

create or replace function public.delete_recommendation_photo_object()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'recommendation-photos'
  and name = old.storage_path;

  return old;
end;
$$;

revoke execute on function public.delete_recommendation_photo_object() from public, anon, authenticated;

create trigger recommendation_photo_object_delete_trigger
after delete on public.recommendation_photos
for each row execute function public.delete_recommendation_photo_object();