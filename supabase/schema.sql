create extension if not exists "pgcrypto";

create table if not exists public.provider_options (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.category_options (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  mode text not null check (mode in ('morning', 'evening', 'custom')),
  theme_mode text not null default 'auto' check (theme_mode in ('day', 'night', 'auto')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  provider text not null,
  content_type text not null check (content_type in ('audio', 'video', 'course', 'article')),
  url text,
  category text,
  difficulty_level integer check (difficulty_level between 1 and 5),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  week_start_date date not null,
  week_end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'finalized', 'completed')),
  ai_recommendation text,
  created_at timestamptz not null default now(),
  constraint weekly_plans_date_check check (week_end_date >= week_start_date)
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  weekly_plan_id uuid references public.weekly_plans(id) on delete cascade,
  routine_block_id uuid not null references public.routine_blocks(id) on delete restrict,
  source_id uuid references public.sources(id) on delete set null,
  scheduled_date date not null,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done', 'skipped')),
  is_quick_play boolean not null default false,
  priority integer not null default 1,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_schedule_items_week_block_date_unique
  on public.schedule_items (weekly_plan_id, routine_block_id, scheduled_date);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  schedule_item_id uuid references public.schedule_items(id) on delete set null,
  routine_block_id uuid not null references public.routine_blocks(id) on delete restrict,
  source_id uuid references public.sources(id) on delete set null,
  completion_status text not null default 'in_progress' check (completion_status in ('in_progress', 'done', 'partial', 'missed')),
  rating integer check (rating between 1 and 5),
  energy_level integer check (energy_level between 1 and 5),
  focus_level integer check (focus_level between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.thought_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  entry_date date not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  plan_date date not null default current_date,
  priority text not null check (priority in ('A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3')),
  description text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.task_entries
  add column if not exists plan_date date;

update public.task_entries
set plan_date = coalesce(
  plan_date,
  (completed_at at time zone 'UTC')::date,
  (created_at at time zone 'UTC')::date,
  current_date
)
where plan_date is null;

alter table public.task_entries
  alter column plan_date set default current_date;

alter table public.task_entries
  alter column plan_date set not null;

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  source_id uuid references public.sources(id) on delete set null,
  activity_log_id uuid references public.activity_logs(id) on delete set null,
  title text,
  summary text,
  keywords text[] not null default '{}',
  insights text,
  next_action text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  weekly_plan_id uuid references public.weekly_plans(id) on delete set null,
  target_date date,
  routine_block_id uuid references public.routine_blocks(id) on delete set null,
  recommended_source_id uuid references public.sources(id) on delete set null,
  recommendation_text text not null,
  reasoning_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  routine_block_id uuid not null references public.routine_blocks(id) on delete cascade,
  title text not null,
  message text not null,
  is_enabled boolean not null default true,
  channel text not null default 'push' check (channel in ('push', 'email', 'in_app')),
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  daily_target integer not null default 1 check (daily_target > 0),
  unit text not null default 'db',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  habit_id uuid not null references public.habits(id) on delete cascade,
  target_date date not null,
  completed_count integer not null default 0 check (completed_count >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_schedule_items_date on public.schedule_items (scheduled_date);
create index if not exists idx_sources_provider on public.sources (provider);
create index if not exists idx_thought_entries_date on public.thought_entries (entry_date desc, created_at desc);
create index if not exists idx_task_entries_active_priority on public.task_entries (is_completed, priority, created_at);
create index if not exists idx_task_entries_plan_active_priority on public.task_entries (plan_date, is_completed, priority, created_at);
create index if not exists idx_task_entries_completed_at on public.task_entries (completed_at desc, created_at desc);
create index if not exists idx_habit_logs_target_date on public.habit_logs (target_date);
create unique index if not exists idx_habit_logs_habit_date_unique
  on public.habit_logs (habit_id, target_date);
