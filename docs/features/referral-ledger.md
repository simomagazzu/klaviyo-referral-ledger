# Referral ledger

The whole app: paste Klaviyo's Referral Revenue Share export, see what each quarter should pay, and check every referral window month by month.

## Data flow

1. **Add data** posts the pasted text to `POST /api/ledger/paste`. The server parses it (`core.parse`) and dedupes it against the stored lines (`core.merge`: the export is cumulative, and identical lines may repeat). It then inserts only the new lines, with one `added_at` timestamp, plus a `ledger_paste` history row, in one transaction under an advisory lock.
2. `src/app/(ledger)/layout.tsx` loads every line, answer and paste (`store.loadLedger`) and hands them to `LedgerProvider`. That builds the model (`model.buildModel`): joined referrals, the month check per referral, clients and quarter totals.
3. Answers, notes and resolve/dismiss go to `POST /api/ledger/notes`, keyed by referral id (`customer|product|rate|start`). After any change the provider calls `router.refresh()`.
4. Backups: `GET /api/ledger/export` downloads JSON in the prototype's "ledger file" v2 format. `POST /api/ledger/import` replaces the ledger with one. `DELETE /api/ledger` with `{confirm:"DELETE"}` wipes it.

## Checks (per referral)

- **Window length:** months between start and end vs the months expected for the rate (`config.ts`). Excused if the client churned and the window is shorter.
- **Missing months:** each calendar month inside the window (capped at the expected length) needs a line. A line paid in the first 10 days of a month covers the empty month before it. Months before the first line, after the latest payment in the ledger, or before the export begins are not flagged.
- **Early stop:** if payouts stop before the window ends and there is no answer, the app asks "Did this client churn?". "Churned" marks the trailing months as churned, "Billed annually" accepts the gaps, and "Did not churn" turns the gap into an error.
- **Rate:** a line whose payout / amount differs from the rate by more than 0.1 points.
- **Resolved / dismissed** hides a referral's checks until reopened.

## Access

No accounts: single user, local only. `src/middleware.ts` answers only requests addressed to localhost / 127.0.0.1, and refuses non-GET API calls from another site (`Sec-Fetch-Site` / `Origin`). The dev and prod servers bind to 127.0.0.1, and Postgres is published on 127.0.0.1:5432.
