-- Daily AI-generated workout plans cached per athlete per day

create table if not exists gym_daily_plans (
  id uuid primary key default gen_random_uuid(),
  athlete text not null,
  plan_date date not null,
  plan jsonb not null,
  generated_at timestamptz default now(),
  unique(athlete, plan_date)
);

alter table gym_daily_plans enable row level security;
drop policy if exists "open" on gym_daily_plans;
create policy "open" on gym_daily_plans for all using (true) with check (true);

create index if not exists gym_daily_plans_athlete_date on gym_daily_plans (athlete, plan_date desc);
