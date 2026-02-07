-- Create storage bucket for artwork uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artworks',
  'artworks',
  true,  -- Public bucket so images can be viewed without auth
  10485760,  -- 10MB limit
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Storage policies for artworks bucket

-- Anyone can view images (public bucket)
create policy "Public read access for artworks"
on storage.objects for select
using (bucket_id = 'artworks');

-- Authenticated users can upload to their own folder
create policy "Users can upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Users can update their own files
create policy "Users can update own files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Users can delete their own files
create policy "Users can delete own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Works table to track uploaded artworks
create table public.works (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  image_path text not null,  -- Path in storage bucket
  image_url text not null,   -- Full public URL
  width int,
  height int,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on works
alter table public.works enable row level security;

-- Works RLS policies

-- Anyone can view works
create policy "Works are publicly readable"
on public.works for select
using (true);

-- Users can insert their own works
create policy "Users can insert own works"
on public.works for insert
to authenticated
with check (auth.uid() = author_id);

-- Users can update their own works
create policy "Users can update own works"
on public.works for update
to authenticated
using (auth.uid() = author_id);

-- Users can delete their own works
create policy "Users can delete own works"
on public.works for delete
to authenticated
using (auth.uid() = author_id);

-- Indexes
create index idx_works_author_id on public.works(author_id);
create index idx_works_created_at on public.works(created_at desc);

-- Updated_at trigger for works
create trigger on_works_updated
  before update on public.works
  for each row execute function public.handle_updated_at();
