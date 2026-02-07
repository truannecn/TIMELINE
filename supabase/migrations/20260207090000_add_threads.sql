-- Threads taxonomy for posts/works

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threads_name_lower_idx on public.threads (lower(name));

create trigger threads_set_updated_at
before update on public.threads
for each row execute function public.set_updated_at();

create table if not exists public.work_threads (
  work_id uuid not null references public.works(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (work_id, thread_id)
);

create index if not exists work_threads_thread_idx on public.work_threads (thread_id, created_at desc);
create index if not exists work_threads_work_idx on public.work_threads (work_id, created_at desc);

alter table public.threads enable row level security;
alter table public.work_threads enable row level security;

create policy "Threads are publicly readable"
on public.threads for select
using (true);

create policy "Work threads are publicly readable"
on public.work_threads for select
using (true);

create policy "Users can create threads"
on public.threads for insert
to authenticated
with check (true);

create policy "Users can tag works"
on public.work_threads for insert
to authenticated
with check (true);

create policy "Users can untag works"
on public.work_threads for delete
to authenticated
using (true);
