-- Dynamic athlete profiles: each athlete owns their own config

create table if not exists gym_athletes (
  id text primary key,                -- slug, e.g. 'allan'
  name text not null,
  accent text not null default '#ffffff',
  focus text not null default '',
  training_days integer not null default 3,
  split text not null default '',
  facility text default '',
  goals jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,    -- ordered list of category names
  exercises jsonb not null default '{}'::jsonb,     -- { categoryName: [exerciseName, ...] }
  pinned_default jsonb not null default '[]'::jsonb,
  coach_extra text default '',                      -- free-form coaching notes from athlete
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gym_athletes enable row level security;
drop policy if exists "open" on gym_athletes;
create policy "open" on gym_athletes for all using (true) with check (true);

-- Drop the hard-coded athlete check constraints so anyone can be an athlete
alter table gym_sets drop constraint if exists gym_sets_athlete_check;
alter table gym_prs drop constraint if exists gym_prs_athlete_check;
alter table gym_pinned drop constraint if exists gym_pinned_athlete_check;

-- Seed Allan
insert into gym_athletes (id, name, accent, focus, training_days, split, goals, categories, exercises, pinned_default, coach_extra)
values (
  'allan',
  'Allan',
  '#e8380d',
  'Strength & Size',
  4,
  'Upper/Lower alternating (Upper A, Lower A, Upper B, Lower B)',
  '["Build muscle mass","Increase strength on compound lifts","Progressive overload priority"]'::jsonb,
  '["Push","Pull","Legs","Core","Cardio"]'::jsonb,
  '{
    "Push":["Bench Press","Incline Bench","Overhead Press","Dips","Push-ups","Lateral Raise","Tricep Pushdown","Close-Grip Bench","Cable Fly","Incline Dumbbell Press"],
    "Pull":["Deadlift","Pull-ups","Barbell Row","Pendlay Row","Cable Row","Face Pull","Bicep Curl","Incline Curl","Hammer Curl","Chin-ups","Preacher Curl"],
    "Legs":["Squat","Front Squat","Romanian Deadlift","Leg Press","Bulgarian Split Squat","Lunges","Leg Curl","Leg Extension","Calf Raise","Hip Thrust"],
    "Core":["Plank","Ab Wheel","Hanging Leg Raise","Cable Crunch","Russian Twist","Farmer Carry"],
    "Cardio":["Rower","Assault Bike","Jump Rope","Sled Push"]
  }'::jsonb,
  '["Deadlift","Bench Press","Incline Curl","Squat","Overhead Press"]'::jsonb,
  'Non-negotiables: Deadlift, Bench Press, Incline Curl, Squat, Overhead Press — make sure these appear regularly. When same weight has been held for 3+ sessions on any exercise, bump 5 lbs isolation or 10 lbs compound. Balance push/pull volume.'
)
on conflict (id) do update set
  name = excluded.name,
  accent = excluded.accent,
  focus = excluded.focus,
  training_days = excluded.training_days,
  split = excluded.split,
  goals = excluded.goals,
  categories = excluded.categories,
  exercises = excluded.exercises,
  pinned_default = excluded.pinned_default,
  coach_extra = excluded.coach_extra,
  updated_at = now();

-- Seed Carol
insert into gym_athletes (id, name, accent, focus, training_days, split, goals, categories, exercises, pinned_default, coach_extra)
values (
  'carol',
  'Carol',
  '#5b8fa8',
  'Strength & Mobility',
  4,
  '2 strength days + 2 mobility days per week',
  '["Build functional strength","Improve flexibility and range of motion","Balance mobility with resistance work"]'::jsonb,
  '["Strength","Yoga","Stretch","Pilates","Recovery"]'::jsonb,
  '{
    "Strength":["Goblet Squat","Hip Thrust","Glute Bridge","Romanian Deadlift","Band Row","Pallof Press","Step-ups","Lateral Band Walk","Single Leg Deadlift","Push-ups","Kettlebell Swing","Deadlift"],
    "Yoga":["Sun Salutation","Warrior Flow","Hip Opener Sequence","Pigeon Pose","Downward Dog Hold","Lizard Pose","Yin Hold","Supine Twist","Crescent Lunge"],
    "Stretch":["Hip Flexor Stretch","Hamstring Stretch","Thoracic Rotation","Shoulder Opener","Quad Stretch","Calf Stretch","Seated Forward Fold","Figure Four","Couch Stretch"],
    "Pilates":["Hundred","Roll Up","Single Leg Circle","Leg Pull","Side Kick Series","Swan Dive","Teaser","Spine Stretch"],
    "Recovery":["Foam Roll","Lacrosse Ball","Breathing Work","Meditation","Cold Exposure"]
  }'::jsonb,
  '["Deadlift","Goblet Squat","Hip Thrust","Pigeon Pose","Hip Opener Sequence"]'::jsonb,
  'On strength days, prioritize lower body strength and core stability. On mobility days, sequence stretches logically — start dynamic, progress to deeper holds. Non-negotiables: Deadlift, Goblet Squat, Hip Thrust, Pigeon Pose, Hip Opener Sequence.'
)
on conflict (id) do update set
  name = excluded.name,
  accent = excluded.accent,
  focus = excluded.focus,
  training_days = excluded.training_days,
  split = excluded.split,
  goals = excluded.goals,
  categories = excluded.categories,
  exercises = excluded.exercises,
  pinned_default = excluded.pinned_default,
  coach_extra = excluded.coach_extra,
  updated_at = now();
