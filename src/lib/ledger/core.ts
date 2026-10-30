// Pure ledger logic: parsing, dedupe, referral joining, quarter and client aggregation,
// month-by-month window check. No I/O — safe to import on the server and in the browser.
// Ported from the design prototype (design/prototype/ledger-core.js); behaviour is identical.

import { LEDGER_CONFIG, type LedgerConfig } from "./config";

export interface Line {
  customer: string;
  start: string; // ISO date, Revenue Share Start Date as exported
  end: string; // ISO date, Revenue Share End Date as exported
  paid_on: string; // ISO date, Payment Date
  product: string;
  amount: number; // Customer Payment Amount Received
  rate: number; // Revenue Share Earnings %, as a fraction (0.15)
  split: string; // Split %, often empty
  payout: number; // Partner Earnings
  added?: string; // ISO timestamp of the paste that added the line
}

export type AnswerStatus = "churned" | "active" | "annual" | "";

export interface Note {
  status: AnswerStatus;
  text: string;
  at?: string | null; // ISO date of the last change
  resolved?: boolean;
  resolvedAt?: string | null;
}

export interface Segment {
  customer: string;
  product: string;
  start: string;
  end: string;
  rate: number;
  lines: Line[];
}

export interface Referral {
  id: string;
  customer: string;
  product: string;
  rate: number;
  start: string;
  end: string;
  segments: Segment[];
  lines: Line[];
  paid: number;
  payout: number;
  months: number;
  expected: number | null;
  monthsOff: boolean;
}

export type WindowState = "active" | "soon" | "expired";

export interface ClientReferral extends Referral {
  status: WindowState;
  statusLabel: string;
}

export interface Client {
  name: string;
  refs: ClientReferral[];
  status: WindowState;
  statusLabel: string;
  paid: number;
  payout: number;
}

export interface QuarterGroup {
  ref: Referral;
  lines: Line[];
  paid: number;
  payout: number;
  actual: number | null;
  pctOff: boolean;
}

export interface QuarterResult {
  rows: QuarterGroup[];
  paid: number;
  payout: number;
  payments: number;
}

export type CellState = "paid" | "missing" | "pending" | "lead" | "nodata" | "churned" | "beyond" | "annual";

export interface MonthCell {
  key: string; // YYYY-MM
  start: string; // first day of the month
  label: string; // "Aug 2026"
  ls: Line[];
  beyond: boolean;
  late?: boolean;
  trailing?: boolean;
  state: CellState;
  payout: number;
  count: number;
}

export interface Analysis {
  cells: MonthCell[];
  issues: string[];
  question: string | null;
  windowExcused: boolean;
  lastLine: string;
  gapMid: number;
  gapTrail: number;
  resolved: boolean;
  flagged: boolean;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const moneyFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (v: number) => moneyFmt.format(v);
export const pct = (v: number) => (Math.round(v * 1000) / 10).toString() + "%";
export const fdate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MON[m - 1]} ${d}, ${y}`;
};
export const fmonth = (iso: string) => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const todayISO = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export function monthsBetween(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + (d2 - d1) / 30.4375;
}
export const expectedFor = (rate: number, cfg: LedgerConfig = LEDGER_CONFIG) =>
  cfg.expectedMonths[String(Math.round(rate * 100) / 100)] ?? null;
export const qOf = (iso: string) => ({ y: +iso.slice(0, 4), q: Math.floor((+iso.slice(5, 7) - 1) / 3) + 1 });
export const lineKey = (r: Line) =>
  [r.customer, r.start, r.end, r.paid_on, r.product, r.amount, r.rate, r.split, r.payout].join("|");
const segKey = (r: Pick<Line, "customer" | "product" | "start" | "end" | "rate">) =>
  [r.customer, r.product, r.start, r.end, r.rate].join("|");

// ---------- parsing ----------

function toISO(s: string): string | null {
  const t = String(s).trim();
  const m = t.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()])
    return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}
const isDate = (s: string | undefined) => s !== undefined && toISO(s) !== null;
function toMoney(s: string | undefined): number | null {
  let t = String(s ?? "").trim().replace(/[$,\s]/g, "");
  if (/^\(.*\)$/.test(t)) t = "-" + t.slice(1, -1);
  t = t.replace(/^\$?-\$?/, "-");
  return /^-?\d+(\.\d+)?$/.test(t) ? +t : null;
}
const isPct = (s: string | undefined) => s !== undefined && /^-?\d+(\.\d+)?\s*%$/.test(String(s).trim());
const toPct = (s: string) => parseFloat(s) / 100;

// c: [partner, customer, start, end, paid_on, product, amount, rate, split|"", payout]
function toRow(c: string[]): Line | null {
  const start = toISO(c[2]), end = toISO(c[3]), paid_on = toISO(c[4]);
  const amount = toMoney(c[6]), payout = toMoney(c[9]);
  const rate = isPct(c[7]) ? toPct(c[7]) : null;
  const customer = (c[1] || "").trim(), product = (c[5] || "").trim();
  if (!customer || !start || !end || !paid_on || !product || amount === null || rate === null || payout === null) return null;
  return { customer, start, end, paid_on, product, amount, rate, split: c[8] ? c[8].trim() : "", payout };
}

export interface ParseResult {
  rows: Line[];
  bad: string[];
  error?: string;
}

export function parse(text: string): ParseResult {
  if (/Managed Earnings %/i.test(text))
    return { error: "This is the Managed Accounts export. Paste the Referral Revenue Share export instead.", rows: [], bad: [] };
  const rows: Line[] = [], bad: string[] = [];
  const lines = String(text).split(/\r?\n/);
  const tabbed = lines.filter((l) => l.includes("\t")).length > 1;
  if (tabbed) {
    lines.forEach((l) => {
      const c = l.split("\t").map((x) => x.trim());
      if (c.length < 9 || !isDate(c[2])) {
        if (c.some((x) => isDate(x))) bad.push(l);
        return;
      }
      if (c.length === 9) c.splice(8, 0, "");
      const r = toRow(c);
      if (r) rows.push(r);
      else bad.push(l);
    });
  } else {
    const t = lines.map((l) => l.trim()).filter(Boolean);
    let i = 0, skipped: string[] = [];
    while (i < t.length) {
      if (i + 8 < t.length && isDate(t[i + 2]) && isDate(t[i + 3]) && isDate(t[i + 4])) {
        if (skipped.length) {
          bad.push(skipped.join(" | "));
          skipped = [];
        }
        const hasSplit = isPct(t[i + 8]);
        const c = hasSplit ? t.slice(i, i + 10) : [...t.slice(i, i + 8), "", t[i + 8]];
        const r = toRow(c);
        if (r) rows.push(r);
        else bad.push(c.join(" | "));
        i += hasSplit ? 10 : 9;
      } else {
        // header cells are expected noise; anything after the first record that does not fit is unreadable
        if (rows.length) skipped.push(t[i]);
        i++;
      }
    }
    if (skipped.length) bad.push(skipped.join(" | "));
  }
  return { rows, bad };
}

// The export is cumulative: an identical line can legitimately repeat, so keep the max count seen in one paste.
export function merge<T extends Line>(data: Line[], incoming: T[]) {
  const have = new Map<string, number>();
  data.forEach((r) => {
    const k = lineKey(r);
    have.set(k, (have.get(k) || 0) + 1);
  });
  const seen = new Map<string, number>(), fresh: T[] = [];
  let dup = 0;
  incoming.forEach((r) => {
    const k = lineKey(r), n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    if (n > (have.get(k) || 0)) fresh.push(r);
    else dup++;
  });
  return { fresh, added: fresh.length, dup };
}

// ---------- referrals ----------

// Klaviyo sometimes exports one referral as several rows: join same client + product + rate whose dates touch or overlap.
export function referrals(data: Line[], cfg: LedgerConfig = LEDGER_CONFIG) {
  const segs = new Map<string, Segment>();
  data.forEach((r) => {
    const k = segKey(r);
    if (!segs.has(k)) segs.set(k, { customer: r.customer, product: r.product, start: r.start, end: r.end, rate: r.rate, lines: [] });
    segs.get(k)!.lines.push(r);
  });
  const by = new Map<string, Segment[]>();
  segs.forEach((s) => {
    const k = [s.customer, s.product, s.rate].join("|");
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(s);
  });
  type Draft = Pick<Referral, "customer" | "product" | "rate" | "start" | "end" | "segments">;
  const drafts: Draft[] = [], bySegDraft = new Map<string, Draft>();
  by.forEach((ss) => {
    ss.sort((a, b) => a.start.localeCompare(b.start));
    let cur: Draft | null = null;
    ss.forEach((s) => {
      if (cur && s.start <= cur.end) {
        if (s.end > cur.end) cur.end = s.end;
        cur.segments.push(s);
      } else {
        cur = { customer: s.customer, product: s.product, rate: s.rate, start: s.start, end: s.end, segments: [s] };
        drafts.push(cur);
      }
      bySegDraft.set(segKey(s), cur);
    });
  });
  const done = new Map<Draft, Referral>();
  const list = drafts.map((c) => {
    const lines = c.segments.flatMap((s) => s.lines);
    const months = monthsBetween(c.start, c.end);
    const expected = expectedFor(c.rate, cfg);
    const ref: Referral = {
      ...c,
      id: [c.customer, c.product, c.rate, c.start].join("|"),
      lines,
      paid: lines.reduce((a, l) => a + l.amount, 0),
      payout: lines.reduce((a, l) => a + l.payout, 0),
      months,
      expected,
      monthsOff: expected !== null && Math.abs(months - expected) > 0.5,
    };
    done.set(c, ref);
    return ref;
  });
  const bySeg = new Map<string, Referral>();
  bySegDraft.forEach((d, k) => bySeg.set(k, done.get(d)!));
  return { list, bySeg };
}

export function windowStatus(end: string, today: string, cfg: LedgerConfig = LEDGER_CONFIG): { s: WindowState; label: string | null } {
  if (end < today) return { s: "expired", label: "Expired" };
  return daysBetween(today, end) <= cfg.soonDays
    ? { s: "soon", label: "Expiring soon (" + fdate(end) + ")" }
    : { s: "active", label: null };
}

export function quarter(
  data: Line[],
  y: number | null,
  q: number | null,
  bySeg: Map<string, Referral>,
  filter?: (r: Line) => boolean
): QuarterResult {
  const groups = new Map<Referral, Omit<QuarterGroup, "actual" | "pctOff">>();
  data.forEach((r) => {
    const qq = qOf(r.paid_on);
    if (y !== null && (qq.y !== y || (q !== null && qq.q !== q))) return;
    if (filter && !filter(r)) return;
    const c = bySeg.get(segKey(r))!;
    if (!groups.has(c)) groups.set(c, { ref: c, lines: [], paid: 0, payout: 0 });
    const g = groups.get(c)!;
    g.lines.push(r);
    g.paid += r.amount;
    g.payout += r.payout;
  });
  const rows = [...groups.values()]
    .map((g) => {
      const actual = g.paid !== 0 ? g.payout / g.paid : null;
      return { ...g, actual, pctOff: actual !== null && Math.abs(actual - g.ref.rate) > 0.001 };
    })
    .sort((a, b) => b.payout - a.payout);
  return {
    rows,
    paid: rows.reduce((a, g) => a + g.paid, 0),
    payout: rows.reduce((a, g) => a + g.payout, 0),
    payments: rows.reduce((a, g) => a + g.lines.length, 0),
  };
}

export function quarterTotals(data: Line[]) {
  const m = new Map<string, number>();
  data.forEach((r) => {
    const { y, q } = qOf(r.paid_on);
    const k = `${y}-Q${q}`;
    m.set(k, (m.get(k) || 0) + r.payout);
  });
  return m;
}

export function clients(list: Referral[], today: string, cfg: LedgerConfig = LEDGER_CONFIG): Client[] {
  const by = new Map<string, Referral[]>();
  list.forEach((c) => {
    if (!by.has(c.customer)) by.set(c.customer, []);
    by.get(c.customer)!.push(c);
  });
  const order: Record<WindowState, number> = { active: 0, soon: 1, expired: 2 };
  return [...by.entries()]
    .map(([name, raw]) => {
      const refs: ClientReferral[] = raw
        .slice()
        .sort((a, b) => b.start.localeCompare(a.start))
        .map((r) => {
          const st = windowStatus(r.end, today, cfg);
          return Object.assign(r, { status: st.s, statusLabel: st.s === "active" ? "Active (" + pct(r.rate) + ")" : st.label! });
        });
      const act = refs.filter((r) => r.status === "active");
      const soon = refs.filter((r) => r.status === "soon").sort((a, b) => a.end.localeCompare(b.end));
      const st: { s: WindowState; label: string } = act.length
        ? { s: "active", label: "Active referral (" + [...new Set(act.map((r) => pct(r.rate)))].join(", ") + ")" }
        : soon.length
          ? { s: "soon", label: "Expiring soon (" + fdate(soon[0].end) + ")" }
          : { s: "expired", label: "Expired" };
      return {
        name,
        refs,
        status: st.s,
        statusLabel: st.label,
        paid: refs.reduce((a, r) => a + r.paid, 0),
        payout: refs.reduce((a, r) => a + r.payout, 0),
      };
    })
    .sort((a, b) => order[a.status] - order[b.status] || b.payout - a.payout);
}

// ---------- month-by-month check (rule 5) ----------

const DIM = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export function addMonths(iso: string, k: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = m - 1 + k, yy = y + Math.floor(t / 12), mm = (((t % 12) + 12) % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, DIM(yy, mm))).padStart(2, "0")}`;
}
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

// note.status: churned | active (did not churn) | annual (billed annually)
export function analyze(ref: Referral, dataLast: string, note: Note | null, dataFirst = "0000"): Analysis {
  const st = note?.status;
  const ym = (iso: string) => iso.slice(0, 7);
  // months past the expected length (start + months for the rate) are outside the referral even if the export's end date runs longer
  const capEnd = ref.expected ? addMonths(ref.start, ref.expected) : ref.end;
  const effEnd = capEnd < ref.end ? capEnd : ref.end;
  // calendar months of the payment date; the end month counts only if the window runs past its billing day
  const lastM = (e: string) => {
    let m = +e.slice(8, 10) > +ref.start.slice(8, 10) ? ym(e) : ym(addMonths(e, -1));
    if (ref.lines.some((l) => ym(l.paid_on) === ym(e))) m = ym(e);
    return m;
  };
  const endM = lastM(effEnd), realEndM = lastM(ref.end) > endM ? lastM(ref.end) : endM;
  const byM = new Map<string, Line[]>();
  ref.lines.forEach((l) => {
    const k = ym(l.paid_on);
    if (!byM.has(k)) byM.set(k, []);
    byM.get(k)!.push(l);
  });
  const cells: MonthCell[] = [];
  for (let k = 0; k < 72; k++) {
    const ms = addMonths(ref.start.slice(0, 8) + "01", k), key = ym(ms);
    if (key > realEndM) break;
    cells.push({ key, start: ms, label: fmonth(ms), ls: (byM.get(key) || []).slice(), beyond: key > endM, state: "paid", payout: 0, count: 0 });
  }
  // a line that slips into the first days of the next month (e.g. due on the 29th, paid on the 2nd) covers the empty month before it
  cells.forEach((c, i) => {
    const nx = cells[i + 1];
    if (c.ls.length || !nx || nx.ls.length < 2) return;
    const early = nx.ls.filter((l) => +l.paid_on.slice(8, 10) <= 10);
    if (early.length && early.length < nx.ls.length) {
      c.ls = early;
      nx.ls = nx.ls.filter((l) => !early.includes(l));
      c.late = true;
    }
  });
  cells.forEach((c) => {
    const due =
      c.key === ym(ref.start)
        ? ref.start
        : c.key + "-" + String(Math.min(+ref.start.slice(8, 10), DIM(+c.key.slice(0, 4), +c.key.slice(5, 7)))).padStart(2, "0");
    c.state = c.ls.length ? "paid" : c.beyond ? "beyond" : addDays(due, 5) > dataLast ? "pending" : "missing";
    c.payout = c.ls.reduce((a, l) => a + l.payout, 0);
    c.count = c.ls.length;
  });
  let lastPaid = -1, firstPaid = -1;
  cells.forEach((c, i) => {
    if (c.state === "paid") {
      lastPaid = i;
      if (firstPaid < 0) firstPaid = i;
    }
  });
  // before the first line (billing often starts a month after the window opens, or before the export begins): not flagged
  cells.forEach((c, i) => {
    if (c.state === "missing" && i < firstPaid) c.state = c.start < dataFirst ? "nodata" : "lead";
  });
  cells.forEach((c, i) => {
    if (c.state === "missing") c.trailing = i > lastPaid;
  });
  if (st === "churned") cells.forEach((c) => { if (c.trailing) c.state = "churned"; });
  if (st === "annual") cells.forEach((c) => { if (c.state === "missing") c.state = "annual"; });
  const mid = cells.filter((c) => c.state === "missing" && !c.trailing);
  const trail = cells.filter((c) => c.state === "missing" && c.trailing);
  const lastLine = ref.lines.reduce((a, l) => (l.paid_on > a ? l.paid_on : a), "");
  const pctOffLines = ref.lines.filter((l) => l.amount && Math.abs(l.payout / l.amount - l.rate) > 0.001).length;
  const windowExcused = ref.monthsOff && st === "churned" && ref.expected !== null && ref.months < ref.expected;
  const issues: string[] = [];
  if (ref.monthsOff && !windowExcused)
    issues.push(
      `Window is ${ref.months.toFixed(1)} months; ${ref.expected} expected at ${pct(ref.rate)}.` +
        (ref.expected !== null && ref.months > ref.expected && lastLine && lastLine <= capEnd
          ? ` The ${ref.expected} months end on ${fdate(capEnd)}; the last line is ${fdate(lastLine)}, so payouts stopped on time and only the export's end date is longer.`
          : "")
    );
  if (mid.length) issues.push(`${mid.length} month${mid.length === 1 ? "" : "s"} without a line: ${mid.map((c) => c.label).join(", ")}.`);
  if (trail.length && st === "active")
    issues.push(`Payouts stopped ${trail.length} month${trail.length === 1 ? "" : "s"} before the window ended, and the client did not churn.`);
  if (pctOffLines) issues.push(`${pctOffLines} line${pctOffLines === 1 ? "" : "s"} paid at a different % than the rate.`);
  const question =
    trail.length && !st
      ? `Did this client churn from ${ref.product}? I see the payout was cut short early: last line ${fdate(lastLine)}, window ends ${fdate(ref.end)}.`
      : null;
  const resolved = !!note?.resolved;
  return {
    cells,
    issues,
    question,
    windowExcused,
    lastLine,
    gapMid: mid.length,
    gapTrail: trail.length,
    resolved,
    flagged: !resolved && (issues.length > 0 || !!question),
  };
}

// ---------- CSV ----------

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const toCSV = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
