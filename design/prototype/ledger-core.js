// Pure ledger logic: parsing, dedupe, referral joining, quarter and client aggregation.
(function () {
  const EXPECTED_MONTHS = { "0.1": 12, "0.15": 16, "0.2": 24 }; // 15% stated by Klaviyo; 10% and 20% inferred from data
  const CONFIG = { soonDays: 60 };
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  const money = (v) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const pct = (v) => (Math.round(v * 1000) / 10).toString() + "%";
  const fdate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${MON[m - 1]} ${d}, ${y}`; };
  const todayISO = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  function monthsBetween(a, b) {
    const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + (d2 - d1) / 30.4375;
  }
  const expectedFor = (rate) => EXPECTED_MONTHS[String(Math.round(rate * 100) / 100)] ?? null;
  const qOf = (iso) => ({ y: +iso.slice(0, 4), q: Math.floor((+iso.slice(5, 7) - 1) / 3) + 1 });
  const lineKey = (r) => [r.customer, r.start, r.end, r.paid_on, r.product, r.amount, r.rate, r.split, r.payout].join("|");
  const segKey = (r) => [r.customer, r.product, r.start, r.end, r.rate].join("|");

  function toISO(s) {
    const t = String(s).trim();
    const m = t.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})$/);
    if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  }
  const isDate = (s) => toISO(s) !== null;
  const toMoney = (s) => { let t = String(s).trim().replace(/[$,\s]/g, ""); if (/^\(.*\)$/.test(t)) t = "-" + t.slice(1, -1); t = t.replace(/^\$?-\$?/, "-"); return /^-?\d+(\.\d+)?$/.test(t) ? +t : null; };
  const isPct = (s) => /^-?\d+(\.\d+)?\s*%$/.test(String(s).trim());
  const toPct = (s) => parseFloat(s) / 100;

  // c: [partner, customer, start, end, paid_on, product, amount, rate, split|"", payout]
  function toRow(c) {
    const r = { customer: (c[1] || "").trim(), start: toISO(c[2]), end: toISO(c[3]), paid_on: toISO(c[4]), product: (c[5] || "").trim(),
      amount: toMoney(c[6]), rate: isPct(c[7]) ? toPct(c[7]) : null, split: c[8] ? c[8].trim() : "", payout: toMoney(c[9]) };
    const ok = r.customer && r.start && r.end && r.paid_on && r.product && r.amount !== null && r.rate !== null && r.payout !== null;
    return ok ? r : null;
  }

  function parse(text) {
    if (/Managed Earnings %/i.test(text)) return { error: "This is the Managed Accounts export. Paste the Referral Revenue Share export instead.", rows: [], bad: [] };
    const rows = [], bad = [];
    const lines = String(text).split(/\r?\n/);
    const tabbed = lines.filter((l) => l.includes("\t")).length > 1;
    if (tabbed) {
      lines.forEach((l) => {
        const c = l.split("\t").map((x) => x.trim());
        if (c.length < 9 || !isDate(c[2])) { if (c.some((x) => isDate(x))) bad.push(l); return; }
        if (c.length === 9) c.splice(8, 0, "");
        const r = toRow(c); r ? rows.push(r) : bad.push(l);
      });
    } else {
      const t = lines.map((l) => l.trim()).filter(Boolean);
      let i = 0, skipped = [];
      while (i < t.length) {
        if (i + 8 < t.length && isDate(t[i + 2]) && isDate(t[i + 3]) && isDate(t[i + 4])) {
          if (skipped.length) { bad.push(skipped.join(" | ")); skipped = []; }
          const hasSplit = isPct(t[i + 8]);
          const c = hasSplit ? t.slice(i, i + 10) : [...t.slice(i, i + 8), "", t[i + 8]];
          const r = toRow(c); r ? rows.push(r) : bad.push(c.join(" | "));
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
  function merge(data, incoming) {
    const have = new Map(); data.forEach((r) => { const k = lineKey(r); have.set(k, (have.get(k) || 0) + 1); });
    const seen = new Map(), out = data.slice(); let added = 0, dup = 0;
    incoming.forEach((r) => {
      const k = lineKey(r), n = (seen.get(k) || 0) + 1; seen.set(k, n);
      if (n > (have.get(k) || 0)) { out.push(r); added++; } else dup++;
    });
    return { data: out, added, dup };
  }

  // Klaviyo sometimes exports one referral as several rows: join same client + product + rate whose dates touch or overlap.
  function referrals(data) {
    const segs = new Map();
    data.forEach((r) => {
      const k = segKey(r);
      if (!segs.has(k)) segs.set(k, { customer: r.customer, product: r.product, start: r.start, end: r.end, rate: r.rate, lines: [] });
      segs.get(k).lines.push(r);
    });
    const by = new Map();
    segs.forEach((s) => { const k = [s.customer, s.product, s.rate].join("|"); if (!by.has(k)) by.set(k, []); by.get(k).push(s); });
    const list = [], bySeg = new Map();
    by.forEach((ss) => {
      ss.sort((a, b) => a.start.localeCompare(b.start));
      let cur = null;
      ss.forEach((s) => {
        if (cur && s.start <= cur.end) { if (s.end > cur.end) cur.end = s.end; cur.segments.push(s); }
        else { cur = { customer: s.customer, product: s.product, rate: s.rate, start: s.start, end: s.end, segments: [s] }; list.push(cur); }
        bySeg.set(segKey(s), cur);
      });
    });
    list.forEach((c) => {
      c.id = [c.customer, c.product, c.rate, c.start].join("|");
      c.lines = c.segments.flatMap((s) => s.lines);
      c.paid = c.lines.reduce((a, l) => a + l.amount, 0);
      c.payout = c.lines.reduce((a, l) => a + l.payout, 0);
      c.months = monthsBetween(c.start, c.end);
      c.expected = expectedFor(c.rate);
      c.monthsOff = c.expected !== null && Math.abs(c.months - c.expected) > 0.5;
    });
    return { list, bySeg };
  }

  function windowStatus(end, today) {
    if (end < today) return { s: "expired", label: "Expired" };
    return daysBetween(today, end) <= CONFIG.soonDays ? { s: "soon", label: "Expiring soon (" + fdate(end) + ")" } : { s: "active", label: null };
  }

  function quarter(data, y, q, bySeg, filter) {
    bySeg = bySeg || referrals(data).bySeg;
    const groups = new Map();
    data.forEach((r) => {
      const qq = qOf(r.paid_on); if (y !== null && (qq.y !== y || (q !== null && qq.q !== q))) return;
      if (filter && !filter(r)) return;
      const c = bySeg.get(segKey(r));
      if (!groups.has(c)) groups.set(c, { ref: c, lines: [], paid: 0, payout: 0 });
      const g = groups.get(c); g.lines.push(r); g.paid += r.amount; g.payout += r.payout;
    });
    const rows = [...groups.values()].map((g) => {
      const actual = g.paid !== 0 ? g.payout / g.paid : null;
      return { ...g, actual, pctOff: actual !== null && Math.abs(actual - g.ref.rate) > 0.001 };
    }).sort((a, b) => b.payout - a.payout);
    const paid = rows.reduce((a, g) => a + g.paid, 0), payout = rows.reduce((a, g) => a + g.payout, 0);
    return { rows, paid, payout, payments: rows.reduce((a, g) => a + g.lines.length, 0) };
  }

  function quarterTotals(data) {
    const m = new Map();
    data.forEach((r) => { const { y, q } = qOf(r.paid_on); const k = `${y}-Q${q}`; m.set(k, (m.get(k) || 0) + r.payout); });
    return m;
  }

  function clients(data, today, list) {
    const by = new Map();
    (list || referrals(data).list).forEach((c) => { if (!by.has(c.customer)) by.set(c.customer, []); by.get(c.customer).push(c); });
    const order = { active: 0, soon: 1, expired: 2 };
    return [...by.entries()].map(([name, refs]) => {
      refs = refs.slice().sort((a, b) => b.start.localeCompare(a.start));
      refs.forEach((r) => { const st = windowStatus(r.end, today); r.status = st.s; r.statusLabel = st.s === "active" ? "Active (" + pct(r.rate) + ")" : st.label; });
      const act = refs.filter((r) => r.status === "active");
      const soon = refs.filter((r) => r.status === "soon").sort((a, b) => a.end.localeCompare(b.end));
      const st = act.length ? { s: "active", label: "Active referral (" + [...new Set(act.map((r) => pct(r.rate)))].join(", ") + ")" }
        : soon.length ? { s: "soon", label: "Expiring soon (" + fdate(soon[0].end) + ")" } : { s: "expired", label: "Expired" };
      return { name, refs, status: st.s, statusLabel: st.label, paid: refs.reduce((a, r) => a + r.paid, 0), payout: refs.reduce((a, r) => a + r.payout, 0) };
    }).sort((a, b) => order[a.status] - order[b.status] || b.payout - a.payout);
  }

  // ---------- month-by-month check (rule 5) ----------
  const DIM = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  function addMonths(iso, k) {
    const [y, m, d] = iso.split("-").map(Number);
    const t = (m - 1) + k, yy = y + Math.floor(t / 12), mm = ((t % 12) + 12) % 12 + 1;
    return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, DIM(yy, mm))).padStart(2, "0")}`;
  }
  const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
  const fmonth = (iso) => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

  // note.status: churned | active (did not churn) | annual (billed annually) | other
  function analyze(ref, dataLast, note, dataFirst) {
    dataFirst = dataFirst || "0000";
    const st = note && note.status;
    // calendar months of the payment date; the end month counts only if the window runs past its billing day
    const cells = [], ym = (iso) => iso.slice(0, 7);
    // months past the expected length (start + months for the rate) are outside the referral even if the export's end date runs longer
    const capEnd = ref.expected ? addMonths(ref.start, ref.expected) : ref.end;
    const effEnd = capEnd < ref.end ? capEnd : ref.end;
    const lastM = (e) => { let m = +e.slice(8, 10) > +ref.start.slice(8, 10) ? ym(e) : ym(addMonths(e, -1)); if (ref.lines.some((l) => ym(l.paid_on) === ym(e))) m = ym(e); return m; };
    const endM = lastM(effEnd), realEndM = lastM(ref.end) > endM ? lastM(ref.end) : endM;
    const byM = new Map(); ref.lines.forEach((l) => { const k = ym(l.paid_on); if (!byM.has(k)) byM.set(k, []); byM.get(k).push(l); });
    for (let k = 0; k < 72; k++) {
      const ms = addMonths(ref.start.slice(0, 8) + "01", k), key = ym(ms); if (key > realEndM) break;
      cells.push({ key, start: ms, label: fmonth(ms), ls: (byM.get(key) || []).slice(), beyond: key > endM });
    }
    // a line that slips into the first days of the next month (e.g. due on the 29th, paid on the 2nd) covers the empty month before it
    cells.forEach((c, i) => {
      const nx = cells[i + 1]; if (c.ls.length || !nx || nx.ls.length < 2) return;
      const early = nx.ls.filter((l) => +l.paid_on.slice(8, 10) <= 10);
      if (early.length && early.length < nx.ls.length) { c.ls = early; nx.ls = nx.ls.filter((l) => !early.includes(l)); c.late = true; }
    });
    cells.forEach((c) => {
      const due = c.key === ym(ref.start) ? ref.start : c.key + "-" + String(Math.min(+ref.start.slice(8, 10), DIM(+c.key.slice(0, 4), +c.key.slice(5, 7)))).padStart(2, "0");
      c.state = c.ls.length ? "paid" : c.beyond ? "beyond" : addDays(due, 5) > dataLast ? "pending" : "missing";
      c.payout = c.ls.reduce((a, l) => a + l.payout, 0); c.count = c.ls.length;
    });
    let lastPaid = -1, firstPaid = -1; cells.forEach((c, i) => { if (c.state === "paid") { lastPaid = i; if (firstPaid < 0) firstPaid = i; } });
    // before the first line (billing often starts a month after the window opens, or before the export begins): not flagged
    cells.forEach((c, i) => { if (c.state === "missing" && i < firstPaid) c.state = c.start < dataFirst ? "nodata" : "lead"; });
    cells.forEach((c, i) => { if (c.state === "missing") c.trailing = i > lastPaid; });
    if (st === "churned") cells.forEach((c) => { if (c.trailing) c.state = "churned"; });
    if (st === "annual") cells.forEach((c) => { if (c.state === "missing") c.state = "annual"; });
    const mid = cells.filter((c) => c.state === "missing" && !c.trailing);
    const trail = cells.filter((c) => c.state === "missing" && c.trailing);
    const lastLine = ref.lines.reduce((a, l) => (l.paid_on > a ? l.paid_on : a), "");
    const pctOffLines = ref.lines.filter((l) => l.amount && Math.abs(l.payout / l.amount - l.rate) > 0.001).length;
    const windowExcused = ref.monthsOff && st === "churned" && ref.months < ref.expected;
    const issues = [];
    if (ref.monthsOff && !windowExcused) issues.push(`Window is ${ref.months.toFixed(1)} months; ${ref.expected} expected at ${pct(ref.rate)}.` + (ref.months > ref.expected && lastLine && lastLine <= capEnd ? ` The ${ref.expected} months end on ${fdate(capEnd)}; the last line is ${fdate(lastLine)}, so payouts stopped on time and only the export's end date is longer.` : ""));
    if (mid.length) issues.push(`${mid.length} month${mid.length === 1 ? "" : "s"} without a line: ${mid.map((c) => c.label).join(", ")}.`);
    if (trail.length && st === "active") issues.push(`Payouts stopped ${trail.length} month${trail.length === 1 ? "" : "s"} before the window ended, and the client did not churn.`);
    if (pctOffLines) issues.push(`${pctOffLines} line${pctOffLines === 1 ? "" : "s"} paid at a different % than the rate.`);
    const question = trail.length && !st ? `Did this client churn from ${ref.product}? I see the payout was cut short early: last line ${fdate(lastLine)}, window ends ${fdate(ref.end)}.` : null;
    return { cells, issues, question, windowExcused, lastLine, gapMid: mid.length, gapTrail: trail.length, resolved: !!(note && note.resolved), flagged: !(note && note.resolved) && (issues.length > 0 || !!question) };
  }

  const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

  window.LedgerCore = { EXPECTED_MONTHS, CONFIG, analyze, addMonths, fmonth, toCSV, parse, merge, referrals, quarter, quarterTotals, clients, windowStatus,
    money, pct, fdate, todayISO, monthsBetween, expectedFor, qOf, lineKey };
})();
