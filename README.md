# Meetings Mini App

Telegram Mini App for internal team meetings and follow-up.

Excel remains the source of truth for schedule, agenda, topic owners (`Who`) and meeting links. The Mini App is the source of truth for attendance, minutes, decisions and action items.

**Meeting → Agenda → Attendance → Minutes → Action Items → Follow-up**

This is not a calendar clone. The product is built for running meetings and tracking follow-up inside Telegram.

## What it does

- Admin uploads an XLSX schedule, reviews a meeting-oriented preview, then confirms import
- Everyone sees the current week of meetings (Agenda view by default)
- Users RSVP: Going / Not going / Maybe
- After the meeting, admin writes minutes, decisions and action items
- Each user has **My Actions** with overdue / this week / later / completed
- Admin can also create meetings and edit agenda without Excel

`Who` from Excel is stored as free text. Mini App participants are registered users. These are never mixed.

## Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project
- A Telegram bot from [@BotFather](https://t.me/BotFather)
- A public HTTPS URL for production (Vercel)

## Install

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env.local
```

On macOS / Linux use `cp .env.example .env.local`.

## Environment variables

| Name | Where used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Config only | Anon key is not used for data access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS. Never expose to the client |
| `TELEGRAM_BOT_TOKEN` | Server | Required for initData validation and the bot |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Client | Bot username without `@` |
| `APP_URL` | Bot webhook | Public Mini App URL, for example `https://your-app.vercel.app` |
| `NODE_ENV` | Runtime | `development` enables local demo login |

Do not commit real secrets. `.env*` is gitignored except `.env.example`.

## Supabase setup

1. Create a project in Supabase.
2. Open **Project Settings → API** and copy the project URL, anon key and service role key into `.env.local`.
3. Open **SQL Editor** and run the migrations in order:
   - `database/migrations/001_init.sql`
   - `database/migrations/002_rls.sql`
   - `database/migrations/003_user_status.sql`

`002_rls.sql` enables Row Level Security and does not add anon policies. The Next.js API uses the service role key and checks Telegram `initData` plus user role on the server.

To print the SQL locally:

```bash
npm run db:migrate
```

## Seed data

```bash
npm run seed
```

Creates 5 demo users, 10 meetings, agenda topics, mixed attendance, minutes and action items.

Demo Telegram IDs:

- `1001` Anna Admin (`admin`)
- `1002` Dmitry Ivanov
- `1003` Maria Petrova
- `1004` Ivan Sokolov
- `1005` Olga Kuznetsova

## Telegram bot

1. Create a bot with BotFather (`/newbot`).
2. Put the token in `TELEGRAM_BOT_TOKEN`.
3. Put the username in `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

`/start` replies with an **Open Meetings** WebApp button.

Set the webhook after deploy:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<APP_URL>/api/bot/webhook
```

Notifications are not fully implemented in this MVP. `services/notifications.ts` is the extension point for later reminders (new meeting, RSVP, starting soon, minutes, assigned / due / overdue actions).

## Telegram Mini App

1. In BotFather: `/newapp` or **Bot Settings → Configure Mini App**.
2. Set the Mini App URL to your Vercel domain, for example `https://your-app.vercel.app`.
3. Open the bot in Telegram and tap **Open Meetings**.

The client sends `initData` on every API request. The server validates the HMAC signature against `TELEGRAM_BOT_TOKEN`. Username is never used as the primary identifier. `telegram_id` is.

The first real Telegram user becomes `admin` if there is no active admin yet. Everyone after that must tap **Request access**. An admin approves or rejects the request in **Admin → Users**. Pending users cannot see meetings, agenda or join links.

After pulling this change, run `database/migrations/003_user_status.sql` in the Supabase SQL editor. Existing users stay `active`.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Telegram `initData` is not available in a normal browser. In `NODE_ENV=development` the app shows a demo user picker after `npm run seed`. That picker is disabled in production.

To test the real Mini App locally, use a tunnel (Cloudflare Tunnel, ngrok) and point BotFather at that HTTPS URL.

## Development mode

If `NODE_ENV=development` and Telegram context is missing:

1. Choose a seeded user.
2. A development cookie stores `telegram_id`.
3. API routes treat that user as the current session.

Production builds never expose this path.

## XLSX template

Admin → Import Schedule → **Download Template**

File: `meeting_schedule_template.xlsx`

Columns, in this order:

`Date | Meeting | Topic | Start_Time | End_Time | Who | Outcome_expected | Meeting_Link`

## XLSX import rules

1. Upload → parse → validate → preview → confirm. Nothing is written until confirm.
2. One Excel row = one agenda topic.
3. Rows are grouped by **Date + Meeting name**.
4. `external_id` is deterministic: `YYYY-MM-DD__normalized-title`, for example `2026-08-31__rop`.
5. Same title on another date is a different meeting.
6. Meeting start/end = min topic start / max topic end.
7. Meeting link is taken from the first non-empty value. Different links inside one meeting produce a warning.
8. Merged Date / Meeting cells are forward-filled. Topic, times, Who and Outcome are never forward-filled.
9. Header aliases are accepted (`Дата`, `Start Time`, `Expected Outcome`, `Teams Link`, …).
10. Blocking errors: missing Date / Meeting / Topic, invalid date or time, `End_Time <= Start_Time`.
11. Warnings: empty Who / outcome / link, conflicting links, overlaps, gaps, duplicate topics.
12. Re-import is idempotent. Unchanged data reports 0 changes. Agenda is fully replaced from Excel.
13. Attendance, minutes, decisions and action items are never overwritten by Excel.
14. Who is stored as `responsible_text`. It is never matched to Mini App users.

Max file size: 5 MB. Formulas and macros are not executed.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run seed
```

## Project structure

```text
app/                 Next.js App Router + API routes
components/          Shell, providers, UI states
features/imports/excel   Parser, validation, grouping, sync
features/meetings        Home and meeting detail
features/actions         My Actions
features/admin           Admin screens
lib/auth                 initData session + role checks
lib/telegram             HMAC validation
services/                Domain services
database/migrations      SQL schema + RLS
scripts/                 seed + print migrations
tests/imports            Excel pipeline unit tests
```

## Deployment to Vercel

1. Push the repository and import it in Vercel.
2. Add the same environment variables as `.env.example`.
3. Deploy.
4. Set `APP_URL` to the Vercel URL.
5. Point the Telegram Mini App and bot webhook at that URL.
6. Run migrations in Supabase if you have not already.

The app uses the Node.js runtime for XLSX parsing and Telegram validation.

## Production checklist

- [ ] Migrations applied in Supabase (`001`, `002`, `003`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set only on the server
- [ ] `TELEGRAM_BOT_TOKEN` set only on the server
- [ ] Mini App URL is HTTPS
- [ ] Bot webhook points to `/api/bot/webhook`
- [ ] At least one `admin` user exists
- [ ] `NODE_ENV=production` — no demo login
- [ ] First import tested with the official template
- [ ] Join links open from Telegram

## Architecture notes

- Auth: Telegram WebApp `initData`, validated with HMAC-SHA256 on the server
- Data: Supabase PostgreSQL through the service role from Next.js API routes
- Excel: isolated `features/imports/excel` module, covered by Vitest
- Roles: `user` and `admin`. Admin endpoints call `requireAdmin()`
- Notifications: in-memory no-op service, ready for later Telegram messages
