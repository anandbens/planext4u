// P4U-branded printable Payment Receipt (opens print dialog → Save as PDF).
// Used by Vendor Registrations and Franchise Registrations for settlement receipts.

export interface ProjectionRow {
  scenario_label: string;
  scenario_order: number;
  category: string;
  category_order: number;
  investment: number;
  members: number;
  turnover: number;
  gross_profit: number;
  net_profit: number;
  share_pct: number;
  category_profit: number;
  profit_per_person: number;
  spend_1: number;
  spend_10: number;
  spend_100: number;
  spend_1000: number;
}

export interface ReceiptData {
  receipt_no: string;
  receipt_date: string; // ISO
  entity_type: "vendor" | "franchise";
  applicant_name: string;
  company_name?: string | null;
  registration_no?: string | null;
  category?: string | null;
  plan_name?: string | null;
  plan_amount: number;
  amount_paid: number;
  balance: number;
  transaction_ref?: string | null;
  payment_mode?: string | null;
  payment_date?: string | null;
  payment_status: "paid" | "pending" | "partial";
  received_by?: string | null;
  plan_benefits?: string[];
  plan_features?: string[];
  coverage_type?: string | null;
  delivery_radius_km?: number | null;
  validity_months?: number | null;
  territory?: string | null;
  promotion_benefits?: string[];
  reward_benefits?: string[];
  redemption_benefits?: string[];
  product_visibility?: string | null;
  key_features?: string[];
  projections?: ProjectionRow[];
}

const COMPANY_NAME = "PLANEXT4U ALL SOLUTIONS INDIA PRIVATE LIMITED";
const BRAND = "P4U";

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

const statusPill = (s: string) => {
  const color = s === "paid" ? "#16a34a" : s === "partial" ? "#d97706" : "#dc2626";
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color}20;color:${color};font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.5px">${escapeHtml(s)}</span>`;
};

export function buildReceiptHtml(data: ReceiptData): string {
  const {
    receipt_no, receipt_date, entity_type,
    applicant_name, company_name, registration_no, category,
    plan_name, plan_amount, amount_paid, balance,
    transaction_ref, payment_mode, payment_date, payment_status, received_by,
    plan_benefits = [], plan_features = [], coverage_type,
    delivery_radius_km, validity_months, territory,
  } = data;

  const entityLabel = entity_type === "franchise" ? "Franchise Registration" : "Vendor Registration";
  const benefitsList = plan_benefits.length
    ? `<ul style="margin:6px 0 0 18px;padding:0;color:#334155;font-size:12px;line-height:1.55">${plan_benefits.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : `<div style="color:#94a3b8;font-size:12px">No benefits configured.</div>`;
  const featuresList = plan_features.length
    ? `<ul style="margin:6px 0 0 18px;padding:0;color:#334155;font-size:12px;line-height:1.55">${plan_features.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";

  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>${escapeHtml(receipt_no)} — Payment Receipt</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin:0; padding:32px; color:#0f172a; background:#fff; }
  .sheet { max-width: 820px; margin: 0 auto; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; }
  .head { background: linear-gradient(135deg,#011d33,#0b3a5a); color:#fff; padding:24px 28px; display:flex; align-items:center; justify-content:space-between; }
  .brand { display:flex; align-items:center; gap:14px; }
  .logo { width:52px; height:52px; border-radius:14px; background:#009999; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:22px; color:#fff; letter-spacing:1px; }
  .company { font-size:18px; font-weight:700; letter-spacing:.3px; }
  .sub { font-size:11px; opacity:.75; margin-top:2px; }
  .rlabel { text-align:right; font-size:11px; opacity:.75; text-transform:uppercase; letter-spacing:1px; }
  .rno { font-size:20px; font-weight:800; color:#f89f03; margin-top:2px; }
  .body { padding: 26px 28px; }
  .title { font-size:20px; font-weight:700; margin:0 0 4px; }
  .muted { color:#64748b; font-size:12px; }
  .row { display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin:20px 0; }
  .card { border:1px solid #e2e8f0; border-radius:12px; padding:16px; }
  .card h4 { margin:0 0 10px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b; }
  .kv { display:grid; grid-template-columns: 140px 1fr; row-gap:6px; font-size:13px; }
  .kv .k { color:#64748b; }
  .kv .v { font-weight:600; color:#0f172a; }
  table.pay { width:100%; border-collapse: collapse; margin-top:6px; }
  table.pay th, table.pay td { padding:10px 12px; text-align:left; font-size:13px; border-bottom:1px solid #e2e8f0; }
  table.pay th { background:#f8fafc; text-transform:uppercase; font-size:10px; letter-spacing:1px; color:#64748b; }
  .totals { margin-top:12px; border-top:2px solid #0f172a; padding-top:12px; display:flex; justify-content:flex-end; }
  .totals table { border-collapse:collapse; }
  .totals td { padding:6px 12px; font-size:13px; }
  .totals .grand td { border-top:1px solid #0f172a; font-size:15px; font-weight:800; color:#011d33; }
  .plan { border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-top:8px; background:#f8fafc; }
  .plan h4 { margin:0 0 10px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b; }
  .plan .name { font-size:15px; font-weight:700; color:#011d33; }
  .footer { text-align:center; color:#64748b; font-size:11px; padding:16px 28px 24px; border-top:1px dashed #cbd5e1; }
  .page-break { page-break-before: always; break-before: page; }
  .page { max-width: 820px; margin: 24px auto; border:1px solid #e2e8f0; border-radius:16px; padding: 28px; background:#fff; }
  .page h2 { margin:0 0 6px; font-size:22px; color:#011d33; }
  .page .sub-title { color:#64748b; font-size:12px; margin-bottom:16px; }
  .proj { width:100%; border-collapse:collapse; font-size:11px; margin-top:10px; }
  .proj th, .proj td { border:1px solid #e2e8f0; padding:6px 8px; text-align:right; }
  .proj th { background:#f1f5f9; text-transform:uppercase; font-size:9px; letter-spacing:0.5px; color:#475569; }
  .proj td.cat, .proj th.cat { text-align:left; font-weight:600; color:#011d33; background:#f8fafc; }
  .scenario-title { font-size:14px; font-weight:700; color:#009999; margin-top:14px; text-transform:uppercase; letter-spacing:1px; }
  .disclaimer { border:2px solid #f89f03; background:#fffbeb; border-radius:12px; padding:20px; margin-top:20px; }
  .disclaimer h3 { margin:0 0 12px; color:#b45309; text-transform:uppercase; letter-spacing:2px; font-size:13px; }
  .disclaimer p { font-size:12px; color:#334155; line-height:1.7; margin:0 0 10px; }
  .plan-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:14px; }
  .plan-detail-card { border:1px solid #e2e8f0; border-radius:10px; padding:14px; }
  .plan-detail-card h5 { margin:0 0 8px; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; }
  .plan-detail-card ul { margin:0; padding-left:18px; font-size:12px; color:#334155; line-height:1.6; }
  .btnbar { max-width:820px; margin:16px auto 0; display:flex; gap:8px; justify-content:flex-end; }
  .btnbar button { background:#009999; color:#fff; border:0; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; }
  @media print { .btnbar { display:none } body { padding:0 } .sheet, .page { border:0; border-radius:0; margin:0 auto; } }
</style>
</head><body>
  <div class="sheet">
    <div class="head">
      <div class="brand">
        <div class="logo">${BRAND}</div>
        <div>
          <div class="company">${escapeHtml(COMPANY_NAME)}</div>
          <div class="sub">${escapeHtml(entityLabel)} • Official Payment Receipt</div>
        </div>
      </div>
      <div>
        <div class="rlabel">Receipt No.</div>
        <div class="rno">${escapeHtml(receipt_no)}</div>
        <div class="sub">Issued: ${escapeHtml(fmtDate(receipt_date))}</div>
      </div>
    </div>

    <div class="body">
      <h2 class="title">Payment Receipt</h2>
      <div class="muted">Status ${statusPill(payment_status)}</div>

      <div class="row">
        <div class="card">
          <h4>Applicant</h4>
          <div class="kv">
            <div class="k">Name</div><div class="v">${escapeHtml(applicant_name)}</div>
            ${company_name ? `<div class="k">Company</div><div class="v">${escapeHtml(company_name)}</div>` : ""}
            ${registration_no ? `<div class="k">Registration No.</div><div class="v">${escapeHtml(registration_no)}</div>` : ""}
            ${category ? `<div class="k">Category</div><div class="v">${escapeHtml(category)}</div>` : ""}
          </div>
        </div>
        <div class="card">
          <h4>Payment Details</h4>
          <div class="kv">
            <div class="k">Txn Reference</div><div class="v">${escapeHtml(transaction_ref || "—")}</div>
            <div class="k">Payment Mode</div><div class="v" style="text-transform:capitalize">${escapeHtml((payment_mode || "—").replace(/_/g, " "))}</div>
            <div class="k">Payment Date</div><div class="v">${escapeHtml(fmtDate(payment_date))}</div>
            <div class="k">Received By</div><div class="v">${escapeHtml(received_by || "P4U Admin")}</div>
          </div>
        </div>
      </div>

      <table class="pay">
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr><td>Selected Plan${plan_name ? `: <strong>${escapeHtml(plan_name)}</strong>` : ""}</td><td style="text-align:right">${inr(plan_amount)}</td></tr>
          <tr><td>Amount Paid (Advance)</td><td style="text-align:right;color:#16a34a">${inr(amount_paid)}</td></tr>
          <tr><td>Balance Remaining</td><td style="text-align:right;color:${balance > 0 ? "#dc2626" : "#16a34a"}">${inr(balance)}</td></tr>
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr><td>Plan Amount</td><td style="text-align:right">${inr(plan_amount)}</td></tr>
          <tr><td>Amount Paid</td><td style="text-align:right;color:#16a34a">${inr(amount_paid)}</td></tr>
          <tr class="grand"><td>Balance</td><td style="text-align:right">${inr(balance)}</td></tr>
        </table>
      </div>

      <div class="plan">
        <h4>Plan Summary</h4>
        <div class="name">${escapeHtml(plan_name || "—")}</div>
        <div class="muted" style="margin-top:4px">
          ${coverage_type ? `Coverage: <strong style="text-transform:capitalize">${escapeHtml(coverage_type)}</strong>` : ""}
          ${delivery_radius_km ? ` • Radius: <strong>${delivery_radius_km} KM</strong>` : ""}
          ${validity_months ? ` • Validity: <strong>${validity_months} months</strong>` : ""}
          ${territory ? ` • Territory: <strong>${escapeHtml(territory)}</strong>` : ""}
        </div>
        <div style="margin-top:12px;font-size:12px;font-weight:600;color:#334155">Key Benefits</div>
        ${benefitsList}
        ${plan_features.length ? `<div style="margin-top:12px;font-size:12px;font-weight:600;color:#334155">Features Included</div>${featuresList}` : ""}
      </div>
    </div>

    <div class="footer">
      This is a system-generated receipt from ${escapeHtml(COMPANY_NAME)} and does not require a physical signature.<br/>
      For queries, contact support@planext4u.com &nbsp;•&nbsp; Generated on ${escapeHtml(fmtDate(new Date().toISOString()))}
    </div>
  </div>

  ${buildPlanDetailPage(data)}
  ${entity_type === "franchise" ? buildProjectionPages(data.projections || []) : ""}
  ${buildDisclaimerPage(entity_type)}

  <div class="btnbar"><button onclick="window.print()">Download / Print PDF</button></div>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`;
}

function buildPlanDetailPage(d: ReceiptData): string {
  const list = (arr?: string[]) =>
    arr && arr.length
      ? `<ul>${arr.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
      : `<div style="font-size:12px;color:#94a3b8">Not specified.</div>`;
  return `
  <div class="page page-break">
    <h2>Plan Summary — ${escapeHtml(d.plan_name || "")}</h2>
    <div class="sub-title">${escapeHtml(d.entity_type === "franchise" ? "Franchise" : "Vendor")} Plan Details • Validity ${d.validity_months || "—"} months • Radius ${d.delivery_radius_km || "—"} KM • Territory ${escapeHtml(d.territory || "—")}</div>
    <div class="plan-detail-grid">
      <div class="plan-detail-card"><h5>Promotion Benefits</h5>${list(d.promotion_benefits)}</div>
      <div class="plan-detail-card"><h5>Product Visibility</h5><div style="font-size:12px;color:#334155">${escapeHtml(d.product_visibility || "—")}</div></div>
      <div class="plan-detail-card"><h5>Reward Benefits</h5>${list(d.reward_benefits)}</div>
      <div class="plan-detail-card"><h5>Redemption Benefits</h5>${list(d.redemption_benefits)}</div>
      <div class="plan-detail-card"><h5>Key Features</h5>${list(d.key_features?.length ? d.key_features : d.plan_features)}</div>
      <div class="plan-detail-card"><h5>Benefits Summary</h5>${list(d.plan_benefits)}</div>
    </div>
  </div>`;
}

function buildProjectionPages(rows: ProjectionRow[]): string {
  if (!rows.length) return "";
  const byScenario = new Map<string, ProjectionRow[]>();
  rows
    .slice()
    .sort((a, b) => a.scenario_order - b.scenario_order || a.category_order - b.category_order)
    .forEach(r => {
      if (!byScenario.has(r.scenario_label)) byScenario.set(r.scenario_label, []);
      byScenario.get(r.scenario_label)!.push(r);
    });

  const scenarios = Array.from(byScenario.entries());
  // Split scenarios across two pages: first 3 on page 1, remaining on page 2
  const buildTable = (block: [string, ProjectionRow[]][]) =>
    block.map(([label, items]) => `
      <div class="scenario-title">Scenario — ${escapeHtml(label)}</div>
      <table class="proj">
        <thead>
          <tr>
            <th class="cat">Category</th>
            <th>Investment</th><th>Members</th><th>Turnover</th>
            <th>Gross Profit</th><th>Net Profit</th><th>Share %</th>
            <th>Category Profit</th><th>Per Person</th>
            <th>₹1/Day</th><th>₹10</th><th>₹100</th><th>₹1000</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => `<tr>
            <td class="cat">${escapeHtml(i.category)}</td>
            <td>${inr(i.investment)}</td>
            <td>${i.members}</td>
            <td>${inr(i.turnover)}</td>
            <td>${inr(i.gross_profit)}</td>
            <td>${inr(i.net_profit)}</td>
            <td>${i.share_pct}%</td>
            <td>${inr(i.category_profit)}</td>
            <td>${inr(i.profit_per_person)}</td>
            <td>${inr(i.spend_1)}</td>
            <td>${inr(i.spend_10)}</td>
            <td>${inr(i.spend_100)}</td>
            <td>${inr(i.spend_1000)}</td>
          </tr>`).join("")}
        </tbody>
      </table>`).join("");

  const first = scenarios.slice(0, 3);
  const second = scenarios.slice(3);

  return `
  <div class="page page-break">
    <h2>Business Projection (Page 2)</h2>
    <div class="sub-title">Illustrative earning potential based on user acquisition & spending patterns.</div>
    ${buildTable(first)}
  </div>
  ${second.length ? `
  <div class="page page-break">
    <h2>Business Projection (Page 3)</h2>
    <div class="sub-title">Illustrative earning potential — continued.</div>
    ${buildTable(second)}
  </div>` : ""}`;
}

function buildDisclaimerPage(entity: "vendor" | "franchise"): string {
  return `
  <div class="page page-break">
    <h2>Important Disclaimer</h2>
    <div class="sub-title">Please read carefully before making any investment decision.</div>
    <div class="disclaimer">
      <h3>Disclaimer</h3>
      ${entity === "franchise" ? `
      <p>The above business projections, turnover estimates, profit calculations and earning illustrations are provided solely for illustration and business planning purposes.</p>
      <p>These projections are based on assumed customer acquisition, transaction volume, average user spending, operational efficiency and market assumptions.</p>
      <p>Actual revenue, profitability and return on investment may vary depending on customer growth, vendor onboarding, geographic coverage, marketing activities, competition, operational execution and prevailing market conditions.</p>
      ` : ""}
      <p><strong>${escapeHtml(COMPANY_NAME)}</strong> does not guarantee any minimum revenue, turnover, profit or return on investment.</p>
      <p>Applicants are advised to perform their own financial and business due diligence before making any investment decision.</p>
      <p style="margin-top:14px;font-size:11px;color:#64748b">This document is a computer-generated payment receipt and is valid without a physical signature. Any dispute is subject to Coimbatore jurisdiction.</p>
    </div>
  </div>`;
}

export function downloadReceiptPdf(data: ReceiptData) {
  const html = buildReceiptHtml(data);
  const w = window.open("", "_blank");
  if (!w) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.receipt_no}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.write(html);
  w.document.close();
}
