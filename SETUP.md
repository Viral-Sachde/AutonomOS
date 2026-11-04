# The Resistance Night: Marketing Dashboard Setup

Complete guide to deploying the AI-powered marketing dashboard on Vercel.

## Prerequisites

- A [Vercel](https://vercel.com) account (Hobby plan works)
- An [Anthropic](https://console.anthropic.com) API key
- Node.js 18+ installed locally (for testing)

## Project Structure

The marketing dashboard lives in the `marketing/` subdirectory of the main repo. It is a standalone Next.js 15 app that generates Instagram content using Claude Sonnet 5 (creative) and Claude Haiku 4.5 (analytical).

```
marketing/
  app/              # Next.js App Router pages and API routes
    api/cron/       # Cron job endpoints (morning + midday batches)
    api/auth/       # Password authentication
    login/          # Login page
  lib/
    ai.ts           # Core content generation (posts, reels, carousels)
    agents.ts       # Specialized agents (stories, trends, hashtags, etc.)
    instagram.ts    # Instagram Graph API publishing
    store.ts        # Vercel KV (Redis) persistent content store
    design-system.ts # Compline palette and typography tokens
    history.ts      # Content deduplication and history tracking
  middleware.ts     # Auth middleware (protects all routes)
```

## Step 1: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo
2. **Important:** Set the **Root Directory** to `marketing`
3. Framework preset will auto-detect as **Next.js**
4. Click **Deploy**

## Step 2: Environment Variables

In Vercel, go to **Settings > Environment Variables** and add:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |
| `DASHBOARD_PASSWORD` | Yes | Password to access the dashboard (any string you choose) |
| `CRON_SECRET` | Yes | Random secret to protect cron endpoints (see below) |
| `KV_REST_API_URL` | Yes | Auto-added when you create a Vercel KV store |
| `KV_REST_API_TOKEN` | Yes | Auto-added when you create a Vercel KV store |
| `INSTAGRAM_ACCESS_TOKEN` | No | Meta Graph API token for auto-publishing |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | No | Your Instagram Business account ID |
| `GITHUB_TOKEN` | No | GitHub PAT for pushing improvement suggestions |
| `GITHUB_REPO` | No | Your repo in `Owner/Repo` format |

### Getting Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys** in the left sidebar
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)
6. Add credits: Go to **Billing** and add $5 to start

The dashboard uses Claude Sonnet 5 for creative content (posts, stories, reels) and Claude Haiku 4.5 for analytical work (hashtags, reports, improvements). At typical usage (2 cron runs per day), expect to spend $3 to $5 per month.

### Vercel KV (Required)

The dashboard stores all generated content in Vercel KV (Redis). To set it up:

1. Go to your Vercel project dashboard
2. Click **Storage** in the top nav
3. Click **Create Database** and select **KV**
4. Name it (e.g., "resistance-night-kv")
5. Click **Create**
6. Connect it to your project when prompted

Vercel automatically adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to your environment variables. Redeploy after connecting.

### Dashboard Password

Set `DASHBOARD_PASSWORD` to any password you want. The dashboard will require this password to access. Without it, the dashboard is open to anyone with the URL.

### CRON_SECRET

Use this pre-generated secret, or generate your own:

```
d702dd4e15f0ab60624f3d51745697d67033736ad151077f2fdc0c056dae8998
```

To generate a new one:

```bash
openssl rand -hex 32
```

Paste it into Vercel as the `CRON_SECRET` environment variable.

## Step 3: Cron Jobs

The `vercel.json` file configures two daily cron jobs automatically:

| Schedule | Endpoint | What It Does |
|----------|----------|-------------|
| 5:00 AM UTC daily | `/api/cron/morning` | Generates posts, reels, carousels, stories, hashtag strategy |
| 10:00 AM UTC daily | `/api/cron/midday` | Generates trend content, analytics reports, competitor analysis |

### Day-specific agents

Some agents only run on certain days to stay within budget:

- **Monday:** Analytics report, code improvement suggestions, content calendar
- **Tuesday/Thursday:** Illustration generation
- **Wednesday:** Concept polish ideas
- **Friday:** Competitor scout report

Cron jobs are protected by the `CRON_SECRET` Bearer token. Vercel sends this automatically for scheduled runs. To test manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/morning
```

## Step 4: Verify Deployment

After deploying with environment variables set:

1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Navigate to `/dashboard` to see the marketing dashboard
3. Test a cron endpoint manually using the curl command above
4. Check Vercel logs (**Deployments > Functions**) for any errors

## Local Development

```bash
cd marketing
cp .env.example .env.local
# Fill in your API keys in .env.local
npm install
npm run dev
# Dashboard runs at http://localhost:3001
```

## Content Pipeline

The system generates content automatically:

1. **Cron triggers** fire at scheduled times
2. **AI agents** generate content using Claude (Sonnet 5 for creative, Haiku 4.5 for analytical)
3. **Vercel KV** stores generated content persistently across deployments
4. **Dashboard** loads and displays content for review (password protected)
5. **Instagram API** can auto-publish approved content (requires Instagram setup)

The content history system tracks previously generated themes, hooks, and design variants to avoid repetition across runs.

## Troubleshooting

**"Unauthorized" from cron endpoints:** Check that `CRON_SECRET` is set in Vercel environment variables and matches the Bearer token.

**No AI content generated:** Verify `ANTHROPIC_API_KEY` is set. Without it, the system falls back to pre-written template content.

**Cron jobs not running:** On the Vercel Hobby plan, crons run once per day. Check the Vercel dashboard under **Settings > Crons** to confirm they are registered.

**Function timeout:** The `maxDuration` is set to 60 seconds. If AI calls are slow, some agents may not complete in a single batch. They will report errors in the response JSON but other agents will still produce content.
