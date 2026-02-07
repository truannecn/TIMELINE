-- Add created_by to threads (null = default interest)
alter table public.threads
  add column created_by uuid references public.profiles(id) on delete set null;

create index if not exists threads_created_by_idx on public.threads (created_by);

-- User threads (follows)
create table if not exists public.user_threads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

create index if not exists user_threads_thread_idx on public.user_threads (thread_id, created_at desc);
create index if not exists user_threads_user_idx on public.user_threads (user_id, created_at desc);

alter table public.user_threads enable row level security;

-- RLS policies for user_threads
create policy "User threads are publicly readable"
on public.user_threads for select
using (true);

create policy "Users can follow threads"
on public.user_threads for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can unfollow threads"
on public.user_threads for delete
to authenticated
using (user_id = auth.uid());

-- Update threads policies to allow user creation
create policy "Users can create threads"
on public.threads for insert
to authenticated
with check (created_by = auth.uid());

create policy "Users can update their threads"
on public.threads for update
to authenticated
using (created_by = auth.uid());

create policy "Users can delete their threads"
on public.threads for delete
to authenticated
using (created_by = auth.uid());
