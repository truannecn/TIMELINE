-- Add photo support to threads table

alter table public.threads
add column if not exists photo_url text;

-- Add index for faster queries
create index if not exists threads_photo_url_idx on public.threads (photo_url);
