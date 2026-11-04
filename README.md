# AutonomOS

AI company orchestration platform.

An **agent orchestration layer** that plans work, delegates tasks, coordinates
agents and tracks outcomes across the company:

| Department | Scope | Status |
|---|---|---|
| Marketing | Research, content, campaigns | Live |
| Sales | Prospecting, outreach, CRM | Planned |
| Intelligence | Competitors, markets, leads | Planned |
| Operations | Tasks, workflows, reporting | Planned |

The marketing department below is the original Resistance Night marketing hub:
ten AI agents that write, illustrate, review and publish Instagram content, with
a Next.js dashboard where you approve everything before it ships.

---

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3001
```

That is enough to click around. Content lives in memory until you set up
Supabase below, so it disappears when you restart. Auth is off until you set the
`AUTH_*` variables.

---

## Getting it live, start to finish

### 1. Supabase (database + image hosting)

Free tier covers this comfortably.

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor > New query**, paste `supabase/schema.sql`, run it. That
   creates four tables and a public `media` storage bucket.
3. **Settings > API** gives you the project URL and the `service_role` key.
   Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

> The service-role key bypasses row-level security. It is server-side only —
> never prefix it with `NEXT_PUBLIC_`. RLS is enabled on every table with no
> policies, so the anon key (the one that leaks first) can read nothing.

> The `media` bucket must stay **public**. Instagram fetches images by URL and
> presents no credentials.

| Table | Holds |
|---|---|
| `content` | everything the agents write |
| `improvements` | game improvement suggestions |
| `agent_state` | which agents are on, and how the last run went |
| `usage_history` | anti-repetition memory |

> Supabase pauses a free project after ~7 days with no activity. The daily
> agents keep it awake on their own.

### 2. Deploy the dashboard

```bash
npm i -g vercel
vercel            # from this marketing/ directory
```

Set every variable from `.env.example` in the Vercel project settings.

> **Licensing note:** Vercel's Hobby plan is for non-commercial use. Marketing a
> game you sell is arguably commercial. Cloudflare Pages and Render have no such
> restriction on their free tiers if that matters to you.

### 3. Schedule the agents

Scheduling is **Vercel Cron**, configured in `vercel.json`. No GitHub Actions
involved - Vercel calls its own deployed routes directly, which also means no
separate `MARKETING_URL` secret to keep in sync with wherever the app actually
lives.

Vercel's Hobby plan fires a cron at most once per day with up to an hour of
drift, and caps a project at a couple of cron jobs - not enough for the ten
agents to each get their own slot. They're grouped into two: `/api/cron/morning`
(timed near the 12-2pm IST peak) and `/api/cron/midday` (timed near 7-9pm IST,
despite the name), each running whichever agents are due that day of the week.
Both also publish any approved content that's due - see "Auto-publish" below.

Run any agent by hand from the dashboard's Agents tab, or hit its
`/api/cron/<agent>` endpoint directly.

### 4. Lock the cron endpoints

```bash
openssl rand -hex 32
```

Set that as `CRON_SECRET` in the Vercel project's environment variables (not a
GitHub secret - there's no GitHub Actions step to hand it to anymore). Vercel
automatically sends it as `Authorization: Bearer $CRON_SECRET` on its own cron
invocations, so nothing else needs configuring. **While it is unset, anyone who
finds your URL can trigger your agents or force a publish.**

### 5. Auto-publish

Approving a piece in the dashboard schedules it for the next peak window
(12-2pm or 7-9pm IST) rather than posting the moment it's reviewed. The
morning/midday crons publish anything due once their window arrives. Turn
this off from the Agents tab (a toggle above the agent list) to go back to
manual-only: approved pieces then just wait for a publish click.

### 6. Lock the dashboard

The dashboard can approve content and post to your Instagram, so it must not be
open to anyone with the URL.

```bash
openssl rand -hex 32     # AUTH_SECRET
```

Set `AUTH_USER`, `AUTH_PASSWORD` and `AUTH_SECRET`. While **any** of the three
is unset the dashboard stays open — that is the local-dev behaviour, and it is
not safe in production.

Sessions are an HMAC-signed cookie with a 7-day expiry baked into the signed
payload, so it cannot be extended client-side. Changing `AUTH_USER` invalidates
every outstanding session. `/api/cron/*` GET stays outside the gate because
Vercel Cron calls it with a bearer token, not a browser session.

### 7. Instagram (optional)

Auto-publishing needs a **Business or Creator** account linked to a Facebook
Page — a personal account cannot use this API. Get a long-lived token and your
IG business account id from the Meta Graph API, then set
`INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

Until you do, everything still works — you review and approve in the dashboard
and post the generated image yourself.

### 8. Turn on AI (optional)

| Provider | Cost at this app's volume | Set |
|---|---|---|
| none | **$0** — templates only | `AI_PROVIDER=none` |
| Gemini | $0 — free tier | `GEMINI_API_KEY` |
| Claude Haiku 4.5 | ~$0.85/mo | `ANTHROPIC_API_KEY` (this is the default) |
| Claude Opus 5 | ~$4.25/mo | `ANTHROPIC_API_KEY` + `CLAUDE_MODEL=claude-opus-5` |

Measured against the real prompts: ~210 calls/month, ~115K input and ~147K
output tokens.

The request shape is model-dependent and getting it wrong is a hard 400.
Haiku 4.5 and Sonnet 4.5 reject `output_config.effort` and adaptive thinking, so
`lib/ai-provider.ts` only sends those on the Opus 4.6+ / Sonnet 5 generation.
`CLAUDE_EFFORT` (default `medium`) therefore only applies on those models.

---

## Using it

**Agents tab** — all ten agents. Each one has a switch (off means the cron skips
it) and opens into its own page showing only what it made.

**Your idea box** — on every agent. Type a thought, hit generate, and it builds
from your angle instead of picking its own.

**Regenerate / Alter** — on every piece of content. Regenerate gets a fresh take
on the same brief. Alter edits *this* copy against a note like "make it shorter"
or "aim it at gen z".

**Duplicate checker** — before anything is stored, it is compared against the
last two months of content of the same type. Anything scoring ≥55% similar is
dropped and reported. Note this is a lexical check (word and character overlap):
it reliably catches reworded repeats, but two posts making the same point in
completely different words can still slip through.

---

## Freedom artwork

On the Generate tab, **freedom** drops every template. With an AI key set the
model designs each frame's artwork from scratch around the game concept (its own
visual idea, composition, palette, background and lettering). Each frame is
test-rendered before it is kept; a frame that fails falls back to the built-in
generative composer. With no key, freedom uses that composer on its own.

Artwork uses `claude-opus-5-5` by default (override with `FREEDOM_MODEL`); copy
still uses `CLAUDE_MODEL`. Opus costs more per piece than Haiku. Generation takes up to a minute or two per piece.

Run the pending Supabase migration once: `alter table public.content add column
if not exists design jsonb;` (also in `supabase/schema.sql`).

---

## Scheduled creatives

The **creatives** tab posts a pre-made week (7 posts, 7 reels, 7 stories) on a fixed timetable, IST:
**3pm post, 6pm reel, 8pm story**. Media and captions live in `scheduled/` (manifest + files) and ship
with the deploy; `creatives/_tools/schedule_week.cjs <start-date>` restages a new week.

- Vercel Hobby allows only two crons, and the agents already use both (`morning`, `midday`), so the three slots are
  fired by a free external scheduler (cron-job.org or similar). Create three jobs, timezone Asia/Kolkata, each sending a
  GET with header `Authorization: Bearer <CRON_SECRET>`:

  | When (IST) | URL |
  |---|---|
  | 15:00 daily | `https://<your-app>/api/cron/creatives?slot=post` |
  | 18:00 daily | `https://<your-app>/api/cron/creatives?slot=reel` |
  | 20:00 daily | `https://<your-app>/api/cron/creatives?slot=story` |

- Needs Instagram + Supabase configured, plus a persistent store (Supabase or Redis) so a slot is never posted twice.
- A slot that fires more than 3 hours late is marked **missed**, not posted at a random hour; use **post now** in the tab to catch up.
- Pause or resume from the tab. Instagram ignores captions on stories, so story hashtags are dashboard-only.
- On Vercel Pro you can move these three into `vercel.json` crons instead.

## The agents

| Agent | Runs | Makes |
|---|---|---|
| content writer | daily 06:00 | reel, post and carousel |
| hashtag strategist | daily 07:00 | rotating hashtag sets |
| story generator | daily 08:00 | story sequences |
| trend rider | daily 10:00 | reactive posts |
| content calendar | mondays | the week's plan |
| analytics reporter | mondays | performance summary |
| game improver | mondays | code improvement suggestions |
| illustration studio | tue + thu | SVG artwork |
| concept polisher | wednesdays | game mechanic specs |
| competitor scout | fridays | competitive gaps |

---

## API

| Route | Purpose |
|---|---|
| `GET /api/content?agentId=&status=&months=` | list stored content |
| `POST /api/generate` | make one piece by hand |
| `POST /api/alter` | `{id, action: "regenerate" \| "alter", prompt}` |
| `POST /api/approve` | `{id, action: "approve" \| "reject"}` |
| `POST /api/publish` | render images, then post to Instagram |
| `GET /api/agents` | agent list with on/off state and counts |
| `POST /api/agents` | `{id, enabled}` — flip an agent's switch |
| `GET /api/cron/<agent>` | scheduled run (honours the switch) |
| `POST /api/cron/<agent>` | manual run with `{steer}`, ignores the switch |

---

## Known gaps

- **Reels are scripts, not video.** The agent writes shot-by-shot scripts and
  renders a cover image; it does not produce an MP4. Reel publishing needs a
  hosted video URL you supply yourself.
- **"Push to GitHub" on improvements only records the decision** — it marks the
  item pushed and logs it. It does not open a PR against the game repo.
- **Analytics are illustrative.** Nothing reads real Instagram Insights yet.
- **Error tracking is `console.error`.** Failures land in Vercel's function logs
  and nowhere else, so a broken cron is discovered by noticing missing content.
