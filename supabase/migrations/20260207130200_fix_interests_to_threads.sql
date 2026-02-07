-- Fix references to non-existent interests table
-- Use threads table instead

-- Drop the broken primary_interest_id column if it exists
alter table public.works drop column if exists primary_interest_id;

-- Add primary_thread_id instead (nullable, for main category)
alter table public.works
  add column if not exists primary_thread_id uuid references public.threads(id) on delete set null;

create index if not exists works_primary_thread_idx on public.works (primary_thread_id);

-- Note: work_threads already exists for multi-category tagging
-- Note: user_threads already created for following threads
