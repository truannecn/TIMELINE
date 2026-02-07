create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  type text not null check (type in ('like', 'bookmark')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient on notifications(recipient_id, read, created_at desc);
create index idx_notifications_actor on notifications(actor_id);

alter table notifications enable row level security;

-- Users can only see their own notifications
create policy "Users can read own notifications"
  on notifications for select using (auth.uid() = recipient_id);

-- Authenticated users can insert (for others' works)
create policy "Auth users can create notifications"
  on notifications for insert with check (auth.uid() = actor_id);

-- Users can update (mark read) their own notifications
create policy "Users can update own notifications"
  on notifications for update using (auth.uid() = recipient_id);

-- Users can delete their own notifications
create policy "Users can delete own notifications"
  on notifications for delete using (auth.uid() = recipient_id);
