create table if not exists public.opie_ops_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.opie_ops_state enable row level security;
