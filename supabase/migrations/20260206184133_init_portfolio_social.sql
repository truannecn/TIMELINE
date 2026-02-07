-- Core schema for portfolio social platform

-- Enable required extensions
create extension if not exists "pgcrypto";

-- Utilities
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_handle_lower_idx on public.profiles (lower(handle));

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  type text not null default 'text',
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_length check (char_length(body) <= 10000),
  constraint posts_type_check check (type in ('text','image','art','mixed')),
  constraint posts_visibility_check check (visibility in ('public','unlisted','private'))
);

create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_visibility_idx on public.posts (visibility, created_at desc);

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- Post media
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_url text not null,
  media_type text not null,
  alt_text text,
  position int not null default 0
);

create index if not exists post_media_post_idx on public.post_media (post_id, position);

-- Timelines
create table if not exists public.timelines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timelines_visibility_check check (visibility in ('public','unlisted','private'))
);

create index if not exists timelines_owner_idx on public.timelines (owner_id, created_at desc);
create index if not exists timelines_visibility_idx on public.timelines (visibility, created_at desc);

create trigger timelines_set_updated_at
before update on public.timelines
for each row execute function public.set_updated_at();

-- Timeline entries (drafts/versions)
create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  timeline_id uuid not null references public.timelines(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_published boolean not null default false,
  published_post_id uuid references public.posts(id) on delete set null,
  constraint timeline_entries_body_length check (char_length(body) <= 10000)
);

create index if not exists timeline_entries_timeline_idx on public.timeline_entries (timeline_id, created_at desc);
create index if not exists timeline_entries_author_idx on public.timeline_entries (author_id, created_at desc);

create trigger timeline_entries_set_updated_at
before update on public.timeline_entries
for each row execute function public.set_updated_at();

-- Timeline entry media
create table if not exists public.timeline_entry_media (
  id uuid primary key default gen_random_uuid(),
  timeline_entry_id uuid not null references public.timeline_entries(id) on delete cascade,
  media_url text not null,
  media_type text not null,
  alt_text text,
  position int not null default 0
);

create index if not exists timeline_entry_media_entry_idx on public.timeline_entry_media (timeline_entry_id, position);

-- Follows
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_following_idx on public.follows (following_id, created_at desc);

-- Likes
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists likes_post_idx on public.likes (post_id, created_at desc);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at desc);

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.timelines enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.timeline_entry_media enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;

-- Profiles policies
create policy profiles_select_public on public.profiles
for select using (true);

create policy profiles_insert_self on public.profiles
for insert with check (auth.uid() = id);

create policy profiles_update_self on public.profiles
for update using (auth.uid() = id);

-- Posts policies
create policy posts_select_visible on public.posts
for select using (
  visibility in ('public','unlisted')
  or author_id = auth.uid()
);

create policy posts_insert_self on public.posts
for insert with check (author_id = auth.uid());

create policy posts_update_self on public.posts
for update using (author_id = auth.uid());

create policy posts_delete_self on public.posts
for delete using (author_id = auth.uid());

-- Post media policies
create policy post_media_select_visible on public.post_media
for select using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and (p.visibility in ('public','unlisted') or p.author_id = auth.uid())
  )
);

create policy post_media_insert_owner on public.post_media
for insert with check (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and p.author_id = auth.uid()
  )
);

create policy post_media_delete_owner on public.post_media
for delete using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and p.author_id = auth.uid()
  )
);

-- Timelines policies
create policy timelines_select_visible on public.timelines
for select using (
  visibility in ('public','unlisted')
  or owner_id = auth.uid()
);

create policy timelines_insert_owner on public.timelines
for insert with check (owner_id = auth.uid());

create policy timelines_update_owner on public.timelines
for update using (owner_id = auth.uid());

create policy timelines_delete_owner on public.timelines
for delete using (owner_id = auth.uid());

-- Timeline entries policies
create policy timeline_entries_select_visible on public.timeline_entries
for select using (
  exists (
    select 1 from public.timelines t
    where t.id = timeline_entries.timeline_id
      and (t.visibility in ('public','unlisted') or t.owner_id = auth.uid())
  )
);

create policy timeline_entries_insert_author on public.timeline_entries
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.timelines t
    where t.id = timeline_entries.timeline_id
      and t.owner_id = auth.uid()
  )
);

create policy timeline_entries_update_author on public.timeline_entries
for update using (author_id = auth.uid());

create policy timeline_entries_delete_author on public.timeline_entries
for delete using (author_id = auth.uid());

-- Timeline entry media policies
create policy timeline_entry_media_select_visible on public.timeline_entry_media
for select using (
  exists (
    select 1 from public.timeline_entries te
    join public.timelines t on t.id = te.timeline_id
    where te.id = timeline_entry_media.timeline_entry_id
      and (t.visibility in ('public','unlisted') or t.owner_id = auth.uid())
  )
);

create policy timeline_entry_media_insert_owner on public.timeline_entry_media
for insert with check (
  exists (
    select 1 from public.timeline_entries te
    join public.timelines t on t.id = te.timeline_id
    where te.id = timeline_entry_media.timeline_entry_id
      and t.owner_id = auth.uid()
  )
);

create policy timeline_entry_media_delete_owner on public.timeline_entry_media
for delete using (
  exists (
    select 1 from public.timeline_entries te
    join public.timelines t on t.id = te.timeline_id
    where te.id = timeline_entry_media.timeline_entry_id
      and t.owner_id = auth.uid()
  )
);

-- Follows policies
create policy follows_select_public on public.follows
for select using (true);

create policy follows_insert_self on public.follows
for insert with check (follower_id = auth.uid());

create policy follows_delete_self on public.follows
for delete using (follower_id = auth.uid());

-- Likes policies
create policy likes_select_public on public.likes
for select using (true);

create policy likes_insert_self on public.likes
for insert with check (user_id = auth.uid());

create policy likes_delete_self on public.likes
for delete using (user_id = auth.uid());

-- Comments policies
create policy comments_select_visible on public.comments
for select using (
  exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and (p.visibility in ('public','unlisted') or p.author_id = auth.uid())
  )
);

create policy comments_insert_author on public.comments
for insert with check (author_id = auth.uid());

create policy comments_delete_author on public.comments
for delete using (author_id = auth.uid());

-- Tags policies
create policy tags_select_public on public.tags
for select using (true);

create policy tags_insert_authed on public.tags
for insert with check (auth.uid() is not null);

-- Post tags policies
create policy post_tags_select_public on public.post_tags
for select using (true);

create policy post_tags_insert_owner on public.post_tags
for insert with check (
  exists (
    select 1 from public.posts p
    where p.id = post_tags.post_id
      and p.author_id = auth.uid()
  )
);

create policy post_tags_delete_owner on public.post_tags
for delete using (
  exists (
    select 1 from public.posts p
    where p.id = post_tags.post_id
      and p.author_id = auth.uid()
  )
);
