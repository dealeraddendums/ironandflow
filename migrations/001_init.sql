-- Iron & Flow gym tracker schema

create table if not exists gym_sets (
  id uuid primary key default gen_random_uuid(),
  athlete text not null check (athlete in ('allan', 'carol')),
  exercise text not null,
  category text not null,
  sets integer not null,
  reps integer not null,
  weight numeric,
  notes text,
  is_pr boolean default false,
  logged_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create table if not exists gym_prs (
  id uuid primary key default gen_random_uuid(),
  athlete text not null check (athlete in ('allan', 'carol')),
  exercise text not null,
  category text not null,
  best_sets integer,
  best_reps integer,
  best_weight numeric,
  achieved_at timestamptz,
  updated_at timestamptz default now(),
  unique(athlete, exercise)
);

create table if not exists gym_pinned (
  id uuid primary key default gen_random_uuid(),
  athlete text not null check (athlete in ('allan', 'carol')),
  exercise text not null,
  category text not null,
  priority integer default 0,
  created_at timestamptz default now(),
  unique(athlete, exercise)
);

create table if not exists gym_suggestion_feedback (
  id uuid primary key default gen_random_uuid(),
  athlete text not null,
  suggestion jsonb not null,
  accepted boolean not null,
  created_at timestamptz default now()
);

alter table gym_sets enable row level security;
alter table gym_prs enable row level security;
alter table gym_pinned enable row level security;
alter table gym_suggestion_feedback enable row level security;

drop policy if exists "open" on gym_sets;
drop policy if exists "open" on gym_prs;
drop policy if exists "open" on gym_pinned;
drop policy if exists "open" on gym_suggestion_feedback;

create policy "open" on gym_sets for all using (true) with check (true);
create policy "open" on gym_prs for all using (true) with check (true);
create policy "open" on gym_pinned for all using (true) with check (true);
create policy "open" on gym_suggestion_feedback for all using (true) with check (true);

create index if not exists gym_sets_athlete_logged on gym_sets (athlete, logged_at desc);
create index if not exists gym_prs_athlete on gym_prs (athlete);
create index if not exists gym_pinned_athlete on gym_pinned (athlete, priority desc);
