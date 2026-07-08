// P4U-branded printable Orders Summary (opens print dialog → Save as PDF).
// Used by Admin Sales Report and Vendor Orders page for settlement reconciliation.

export interface OrderSummaryRow {
  id: string;
  date: string;                     // ISO or display date
  customer_name?: string | null;
  customer_mobile?: string | null;
  vendor_name?: string | null;
  coupon_code?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status?: string | null;
}

export interface OrdersSummaryOptions {
  title?: string;                   // e.g. "Sales Summary" / "My Orders Summary"
  subtitle?: string;                // e.g. date range or vendor name
  showVendorColumn?: boolean;       // admin=true, vendor=false
  showCustomerColumn?: boolean;     // usually true
  filename?: string;                // hint for browser Save-as-PDF
}

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildOrdersSummaryHtml(rows: OrderSummaryRow[], opts: OrdersSummaryOptions = {}): string {
  const {
    title = "Orders Summary",
    subtitle = "",
    showVendorColumn = true,
    showCustomerColumn = true,
  } = opts;

  const totals = rows.reduce(
    (acc, r) => {
      acc.subtotal += Number(r.subtotal || 0);
      acc.discount += Number(r.discount || 0);
      acc.total += Number(r.total || 0);
      return acc;
    },
    { subtotal: 0, discount: 0, total: 0 }
  );

  const generated = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const headerCols = [
    `<th>#</th>`,
    `<th>Order ID</th>`,
    `<th>Date</th>`,
    showCustomerColumn ? `<th>Customer</th>` : "",
    showCustomerColumn ? `<th>Mobile</th>` : "",
    showVendorColumn ? `<th>Vendor</th>` : "",
    `<th>Coupon</th>`,
    `<th style="text-align:right">Subtotal</th>`,
    `<th style="text-align:right">Discount</th>`,
    `<th style="text-align:right">Grand Total</th>`,
    `<th>Status</th>`,
  ].filter(Boolean).join("");

  const bodyRows = rows.length === 0
    ? `<tr><td colspan="10" style="text-align:center;color:#64748b;padding:24px">No orders in the selected range.</td></tr>`
    : rows.map((r, i) => {
        const d = (() => { try { return new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return r.date; } })();
        return `<tr>
          <td>${i + 1}</td>
          <td class="mono">${escapeHtml(r.id)}</td>
          <td>${escapeHtml(d)}</td>
          ${showCustomerColumn ? `<td>${escapeHtml(r.customer_name || "—")}</td>` : ""}
          ${showCustomerColumn ? `<td class="mono">${escapeHtml(r.customer_mobile || "—")}</td>` : ""}
          ${showVendorColumn ? `<td>${escapeHtml(r.vendor_name || "—")}</td>` : ""}
          <td class="mono">${r.coupon_code ? escapeHtml(r.coupon_code) : "—"}</td>
          <td style="text-align:right">${inr(r.subtotal)}</td>
          <td style="text-align:right;color:${r.discount > 0 ? "#16a34a" : "inherit"}">${r.discount > 0 ? "- " + inr(r.discount) : "—"}</td>
          <td style="text-align:right;font-weight:600">${inr(r.total)}</td>
          <td><span class="pill">${escapeHtml((r.status || "").replace(/_/g, " "))}</span></td>
        </tr>`;
      }).join("");

  const colspanTotals = 3 + (showCustomerColumn ? 2 : 0) + (showVendorColumn ? 1 : 0) + 1; // #+ID+Date+Cust?+Mobile?+Vend?+Coupon

  const LOGO_URL = "https://jhtddsqnpfvjvnfojeea.supabase.co/storage/v1/object/public/media-library/branding%2Fp4u-logo-invoice.png";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:1000px;margin:20px auto;padding:0 24px;font-size:12px;background:#fff}
  .brand-bar{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#011d33 0%,#0a4f6b 100%);color:#fff;padding:18px 22px;border-radius:8px 8px 0 0}
  .brand-bar .logo-wrap{display:flex;align-items:center;gap:14px}
  .brand-bar img.logo{height:52px;width:auto;background:#fff;border-radius:6px;padding:6px 10px}
  .brand-bar h1{margin:0;font-size:22px;letter-spacing:.5px;font-weight:700}
  .brand-bar .tagline{font-size:10px;opacity:.85;margin-top:2px}
  .brand-bar .doc-block{text-align:right}
  .doc-title{background:#fff;color:#011d33;padding:6px 14px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:1.5px;display:inline-block}
  .meta-light{font-size:10px;color:rgba(255,255,255,.9);margin-top:4px}
  .contact-strip{background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:6px 22px;font-size:10px;color:#475569;display:flex;justify-content:space-between;border-radius:0 0 8px 8px;margin-bottom:16px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
  .card{border:1px solid #e2e8f0;border-radius:6px;padding:10px}
  .card h4{margin:0 0 4px;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:.5px}
  .card p{margin:0;font-size:15px;font-weight:700;color:#011d33}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;font-size:11px;vertical-align:top}
  th{background:#f8fafc;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.3px;color:#334155}
  tfoot td{font-weight:700;background:#f1f5f9}
  .total-row td{background:#011d33;color:#fff;font-size:12px;padding:8px}
  .mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px}
  .pill{display:inline-block;padding:2px 8px;border-radius:10px;background:#e2e8f0;color:#334155;font-size:10px;text-transform:capitalize}
  .footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;text-align:center}
  @media print { body{margin:0;padding:0 10px} .brand-bar{border-radius:0} .no-print{display:none} }
</style></head><body>
  <div class="brand-bar">
    <div class="logo-wrap">
      <img class="logo" src="${LOGO_URL}" alt="P4U" onerror="this.style.display='none'"/>
      <div>
        <h1>P4U Marketplace</h1>
        <p class="tagline">Products for You · Orders &amp; Settlement Summary</p>
      </div>
    </div>
    <div class="doc-block">
      <div class="doc-title">${escapeHtml(title.toUpperCase())}</div>
      ${subtitle ? `<p class="meta-light">${escapeHtml(subtitle)}</p>` : ""}
      <p class="meta-light">Generated ${escapeHtml(generated)}</p>
    </div>
  </div>
  <div class="contact-strip">
    <span>📧 support@planext4u.com</span>
    <span>🌐 planext4u.com</span>
    <span>${rows.length} order${rows.length === 1 ? "" : "s"}</span>
  </div>

  <div class="summary">
    <div class="card"><h4>Total Orders</h4><p>${rows.length}</p></div>
    <div class="card"><h4>Subtotal</h4><p>${inr(totals.subtotal)}</p></div>
    <div class="card"><h4>Total Discount</h4><p style="color:#16a34a">${inr(totals.discount)}</p></div>
    <div class="card"><h4>Grand Total</h4><p>${inr(totals.total)}</p></div>
  </div>

  <table>
    <thead><tr>${headerCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
    ${rows.length > 0 ? `<tfoot>
      <tr>
        <td colspan="${colspanTotals}" style="text-align:right">Totals</td>
        <td style="text-align:right">${inr(totals.subtotal)}</td>
        <td style="text-align:right;color:#16a34a">${totals.discount > 0 ? "- " + inr(totals.discount) : "—"}</td>
        <td style="text-align:right">${inr(totals.total)}</td>
        <td></td>
      </tr>
      <tr class="total-row">
        <td colspan="${colspanTotals + 2}" style="text-align:right">Net Settlement Value</td>
        <td style="text-align:right">${inr(totals.total)}</td>
        <td></td>
      </tr>
    </tfoot>` : ""}
  </table>

  <p class="footer">Computer-generated summary from P4U. Use this report for internal reconciliation and vendor settlement. For queries, contact support@planext4u.com.</p>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;
}

export function downloadOrdersSummaryPdf(rows: OrderSummaryRow[], opts: OrdersSummaryOptions = {}) {
  const html = buildOrdersSummaryHtml(rows, opts);
  const w = window.open("", "_blank");
  if (!w) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${opts.filename || "orders-summary"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.write(html);
  w.document.close();
}
