-- Remove photo support from threads table

-- Drop the index first
drop index if exists public.threads_photo_url_idx;

-- Remove the photo_url column
alter table public.threads
drop column if exists photo_url;
