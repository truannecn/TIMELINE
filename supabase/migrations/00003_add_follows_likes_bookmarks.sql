-- Migration: Add follows, likes, bookmarks, and work types
-- This migration adds social features to Artfolio

-- =============================================================================
-- 1. FOLLOWS TABLE (Asymmetric follow relationships)
-- =============================================================================

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

-- Enable RLS
alter table public.follows enable row level security;

-- RLS Policies for follows
-- Anyone can see follow relationships (public social graph)
create policy "Follows are publicly readable"
on public.follows for select
using (true);

-- Users can follow others (insert their own follows)
create policy "Users can follow others"
on public.follows for insert
to authenticated
with check (auth.uid() = follower_id);

-- Users can unfollow (delete their own follows)
create policy "Users can unfollow"
on public.follows for delete
to authenticated
using (auth.uid() = follower_id);

-- Indexes for follows
create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);

-- =============================================================================
-- 2. WORK TYPES (Extend works table to support essays)
-- =============================================================================

-- Create work_type enum
create type work_type as enum ('image', 'essay');

-- Add work_type column with default 'image' for existing works
alter table public.works
  add column work_type work_type not null default 'image';

-- Add content field for essays (markdown body)
alter table public.works
  add column content text;

-- Make image fields nullable (essays don't have images)
alter table public.works
  alter column image_path drop not null,
  alter column image_url drop not null;

-- Add check constraint: images need image_path, essays need content
alter table public.works
  add constraint work_type_fields_check check (
    (work_type = 'image' and image_path is not null and image_url is not null)
    or (work_type = 'essay' and content is not null)
  );

-- Index on work_type for filtering
create index idx_works_type on public.works(work_type);

-- =============================================================================
-- 3. LIKES TABLE
-- =============================================================================

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (user_id, work_id)
);

-- Enable RLS
alter table public.likes enable row level security;

-- RLS Policies for likes
-- Anyone can see likes (public engagement counts)
create policy "Likes are publicly readable"
on public.likes for select
using (true);

-- Users can like works
create policy "Users can like works"
on public.likes for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can unlike works
create policy "Users can unlike works"
on public.likes for delete
to authenticated
using (auth.uid() = user_id);

-- Indexes for likes
create index idx_likes_work on public.likes(work_id);
create index idx_likes_user on public.likes(user_id);

-- =============================================================================
-- 4. BOOKMARKS TABLE
-- =============================================================================

create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (user_id, work_id)
);

-- Enable RLS
alter table public.bookmarks enable row level security;

-- RLS Policies for bookmarks
-- Bookmarks are PRIVATE - only the owner can see their bookmarks
create policy "Users can view own bookmarks"
on public.bookmarks for select
to authenticated
using (auth.uid() = user_id);

-- Users can bookmark works
create policy "Users can bookmark works"
on public.bookmarks for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can remove bookmarks
create policy "Users can remove bookmarks"
on public.bookmarks for delete
to authenticated
using (auth.uid() = user_id);

-- Index for bookmarks (user_id for fetching user's bookmarks)
create index idx_bookmarks_user on public.bookmarks(user_id);
