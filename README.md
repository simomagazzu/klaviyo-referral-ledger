# Klaviyo Referral Ledger

A local ledger for a Klaviyo partner's referral revenue share. Paste the Referral Revenue Share export from the Partner Portal. The app stores every line in Postgres, totals each calendar quarter, and checks every referral month by month. When payouts stop early, it asks whether the client churned.

There is no login. The app listens only on this computer.

## Set up Docker as the database

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac, Windows, or Linux).

1. Install Docker Desktop and open it. Wait until the engine is running. On Mac the whale menu icon stops animating.
2. In this folder, start Postgres:

```bash
docker compose up -d
```

That starts PostgreSQL 17. It is reachable only at `127.0.0.1:5432`. The database name, user, and password are already set in `docker-compose.yml` and `env.example`:

| | |
|---|---|
| Database | `app_dev` |
| User | `dev_user` |
| Password | `dev_password` |
| URL | `postgresql://dev_user:dev_password@localhost:5432/app_dev` |

You do not create the database yourself. `docker compose up -d` does it, and the data stays in a Docker volume named `postgres_data`.

Check that it is up:

```bash
docker compose ps
```

`postgres` should be running. Stop it without deleting data with `docker compose down`. Delete the database, and everything in the ledger, with `docker compose down -v`. Download a backup from **Add data** before you do that.

If `pnpm db:migrate` later says it cannot connect, Docker is not running yet, or another Postgres is already using port 5432.

## Run the project

You need Node.js 20 or newer and pnpm 9 or newer. This repo includes `.nvmrc` (`20`) if you use nvm.

```bash
node -v
corepack enable
corepack prepare pnpm@9 --activate
pnpm install
cp env.example .env
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000.

`pnpm dev` binds to `127.0.0.1` only. A request for any other host name is refused.

## Add your data

1. In the Klaviyo Partner Portal, copy the **Referral Revenue Share Details** table, header included. Do not copy the Managed Accounts export. The ledger rejects a paste whose header contains `Managed Earnings %`.
2. In the app, open **Add data**.
3. Paste into **Referral Revenue Share export**. Both shapes work: the portal's copy (one cell per line, blank lines between header cells) and a tab-separated table. `Split %` is often empty. Amounts can be negative.
4. Click **Add to ledger**. The message tells you how many lines were new and how many were already stored.
5. Each quarter, paste the full export again. The export is cumulative, so lines already in the ledger are skipped. Identical lines that really repeat (same amount, same day) are kept.
6. Click **Download backup** after each quarter. **Open backup file** replaces the whole ledger, including answers and notes.

**Delete all data** on the same page wipes lines and answers. Download a backup first if you may need them.

## Try it before you have an export

On an empty database:

```bash
pnpm db:seed
```

This loads a short fictional export (`src/lib/ledger/__fixtures__/referral-export-sample.txt`) and marks `cedar.example` as churned. The names and amounts are made up. If the ledger already has lines, the command does nothing. `pnpm db:seed --force` pastes the sample anyway.

You can also open that file, copy it, and paste it on **Add data**.

After seeding, **Quarters** shows the sample payouts, **Clients** lists four fictional clients, and **To check** still has open questions (the seed only answers cedar).

## Screens

| View | What it shows |
|---|---|
| **Quarters** (`/`) | Year and quarter, the quarter payout, one row per referral paid in the period. Expand a row for its payments. CSV export of the period. |
| **Clients** (`/clients`) | One row per client: active, expiring soon (within 60 days), or expired, plus how many referrals need checking. |
| **Client** (`/clients/[name]`) | Each referral, its window, and a box per month (paid, no line, not yet due, past the window). Record churned, did not churn, or billed annually, plus a note. |
| **To check** (`/check`) | Every referral with a failed check or an open question. |
| **Add data** (`/data`) | Paste box, lines new in the last paste, paste history, backup, delete all. |

## Rules the checks use

Edit the month counts and the "expiring soon" window in `src/lib/ledger/config.ts`.

1. Payout per line = Revenue Share Earnings % × Customer Payment Amount Received.
2. A quarter is the calendar quarter of the Payment Date.
3. The rate is fixed at lead acceptance and does not change for that referral.
4. Revenue Share Start Date is the referral start. The window lasts a fixed number of months: 15% → 16 (stated by Klaviyo), 20% → 24 and 10% → 12 (inferred from typical windows).
5. Every month with client spend inside the window should produce a line. A window stops early only if the client churned from that product.
6. Klaviyo sometimes exports one referral as several rows. Rows for the same client, product, and rate whose dates touch or overlap are one referral. Different rates stay separate.

The full notes are in [`docs/business/brief-2026-10-22.md`](docs/business/brief-2026-10-22.md).

## Commands

| Command | |
|---|---|
| `pnpm dev` | Dev server at http://localhost:3000 |
| `pnpm test` | Ledger logic tests against the fictional sample (7 lines, $113.00) |
| `pnpm check` | Lint and typecheck |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Load the fictional sample into an empty ledger |
| `pnpm db:studio` | Database GUI |
| `pnpm test:e2e` | Playwright smoke tests (`pnpm exec playwright install chromium` once). Needs Postgres and a seeded ledger. |

## This stays on your computer

Lines, answers, and paste history live in the Docker volume. There is no account system. Do not put this app on a public server as it is: `src/middleware.ts` only answers localhost, and API writes from another website are refused.
