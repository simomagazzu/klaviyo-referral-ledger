import { test, expect } from "@playwright/test";

/**
 * Smoke tests for the local ledger (no login).
 * Run with: pnpm test:e2e  (needs Postgres running and `pnpm db:seed` on an empty ledger)
 */

test.describe("Views load", () => {
  for (const [path, text] of [
    ["/", "payout"],
    ["/clients", "Search client"],
    ["/check", "To check"],
    ["/data", "Referral Revenue Share export"],
  ] as const) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Klaviyo referral ledger" })).toBeVisible();
      await expect(page.getByText(text).first()).toBeVisible();
    });
  }
});

test.describe("Local-only guard", () => {
  test("refuses API writes from another website", async ({ request }) => {
    const res = await request.post("/api/ledger/notes", {
      data: { referralId: "x", text: "" },
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(res.status()).toBe(403);
  });

  test("refuses requests for another host name", async ({ request }) => {
    const res = await request.get("/", { headers: { host: "ledger.example.com" } });
    expect(res.status()).toBe(403);
  });
});
