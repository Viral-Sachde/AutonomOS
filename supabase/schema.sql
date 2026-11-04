-- The Resistance Night - marketing agent schema
--
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- content: everything the agents write
-- ---------------------------------------------------------------------------
create table if not exists public.content (
  id            text primary key,
  type          text not null check (type in ('reel', 'post', 'carousel', 'story')),
  title         text not null,
  caption       text not null default '',
  hashtags      text[] not null default '{}',
  slides        text[],
  story_frames  text[],
  reel_script   text,
  duration_sec  integer,
  accent_color  text,
  generation_mode text,
  svg_code      text,
  image_urls    text[] not null default '{}',
  status        text not null default 'pending'
                check (status in ('draft', 'pending', 'approved', 'published', 'rejected')),
  theme         text not null default '',
  agent_id      text,
  illustration_category text,
  platform      text,
  scheduled_for timestamptz,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- Added after the table shipped, so existing installs need it backfilled.
-- "create table if not exists" above is a no-op once the table is there.
alter table public.content add column if not exists duration_sec integer;
alter table public.content add column if not exists accent_color text;
alter table public.content add column if not exists generation_mode text;

-- Artwork direction (template / freedom + seed). Safe on an existing table.
alter table public.content add column if not exists design jsonb;

-- The dashboard always sorts newest-first and filters by agent or status.
create index if not exists content_created_at_idx on public.content (created_at desc);
create index if not exists content_agent_idx      on public.content (agent_id, created_at desc);
create index if not exists content_status_idx     on public.content (status, created_at desc);

-- ---------------------------------------------------------------------------
-- improvements: suggestions for the game codebase
-- ---------------------------------------------------------------------------
create table if not exists public.improvements (
  id              text primary key,
  title           text not null,
  description     text not null default '',
  category        text not null default 'feature',
  priority        text not null default 'medium',
  files_to_change text[],
  code_changes    text,
  status          text not null default 'suggested'
                  check (status in ('suggested', 'approved', 'pushed', 'rejected')),
  created_at      timestamptz not null default now()
);

create index if not exists improvements_created_at_idx on public.improvements (created_at desc);

-- ---------------------------------------------------------------------------
-- agent_state: which agents are switched on, and how their last run went
-- ---------------------------------------------------------------------------
create table if not exists public.agent_state (
  agent_id    text primary key,
  enabled     boolean not null default true,
  last_run    timestamptz,
  last_count  integer,
  last_error  text,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- usage_history: anti-repetition memory
--
-- Kept separate from `content` because it must survive content being deleted -
-- the whole point is remembering what was already said.
-- ---------------------------------------------------------------------------
create table if not exists public.usage_history (
  id             bigserial primary key,
  kind           text not null check (kind in ('content', 'improvement')),
  theme          text,
  role_id        text,
  type           text,
  hook           text,
  design_variant text,
  title          text,
  category       text,
  created_at     timestamptz not null default now()
);

create index if not exists usage_history_kind_idx on public.usage_history (kind, created_at desc);

-- ---------------------------------------------------------------------------
-- usage_log: cost tracking per AI call
-- ---------------------------------------------------------------------------
create table if not exists public.usage_log (
  id             text primary key,
  agent_id       text not null default '',
  model          text not null default '',
  provider       text not null default 'claude',
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  cost_usd       double precision not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists usage_log_created_at_idx on public.usage_log (created_at desc);
create index if not exists usage_log_agent_idx      on public.usage_log (agent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- The app connects with the service-role key, which bypasses RLS entirely.
-- RLS is still enabled with no policies so that the anon/public key - the one
-- that would leak first - can read nothing.
-- ---------------------------------------------------------------------------
alter table public.content       enable row level security;
alter table public.improvements  enable row level security;
alter table public.agent_state   enable row level security;
alter table public.usage_history enable row level security;
alter table public.usage_log     enable row level security;

-- ---------------------------------------------------------------------------
-- Storage bucket for rendered artwork
--
-- Must be public: Instagram fetches images by URL and presents no credentials.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;
