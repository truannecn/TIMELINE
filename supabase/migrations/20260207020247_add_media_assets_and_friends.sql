-- Media assets for uploads
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null default 'media',
  path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  duration_ms int,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_visibility_check check (visibility in ('public','unlisted','private'))
);

create unique index if not exists media_assets_bucket_path_idx on public.media_assets (bucket, path);
create index if not exists media_assets_owner_idx on public.media_assets (owner_id, created_at desc);
create index if not exists media_assets_visibility_idx on public.media_assets (visibility, created_at desc);

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

-- Friends system
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_status_check check (status in ('pending','accepted','declined','blocked')),
  constraint friendships_requester_not_addressee check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_idx on public.friendships (requester_id, created_at desc);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, created_at desc);
create index if not exists friendships_status_idx on public.friendships (status, created_at desc);

create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

-- RLS
alter table public.media_assets enable row level security;
alter table public.friendships enable row level security;

-- Media assets policies
create policy media_assets_select_visible on public.media_assets
for select using (
  visibility in ('public','unlisted')
  or owner_id = auth.uid()
);

create policy media_assets_insert_owner on public.media_assets
for insert with check (owner_id = auth.uid());

create policy media_assets_update_owner on public.media_assets
for update using (owner_id = auth.uid());

create policy media_assets_delete_owner on public.media_assets
for delete using (owner_id = auth.uid());

-- Friendships policies
create policy friendships_select_participant on public.friendships
for select using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy friendships_insert_requester on public.friendships
for insert with check (requester_id = auth.uid());

create policy friendships_update_participant on public.friendships
for update using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
) with check (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy friendships_delete_participant on public.friendships
for delete using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);
