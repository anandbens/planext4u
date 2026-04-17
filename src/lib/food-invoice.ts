// Generate a printable HTML invoice and trigger browser download as PDF
// (uses window.print into a new tab — works on desktop and mobile webview).

export interface InvoicePayload {
  invoice_no: string;
  order_id: string;
  generated_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  restaurant_name?: string | null;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: number;
  delivery_fee: number;
  packaging_fee: number;
  platform_fee: number;
  tax: number;
  discount: number;
  total: number;
  payment_method?: string | null;
  payment_id?: string | null;
}

export function buildInvoiceHtml(p: InvoicePayload): string {
  const date = new Date(p.generated_at).toLocaleString("en-IN");
  const itemRows = p.items.map(it => `
    <tr>
      <td>${escape(it.name)}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">₹${it.price.toFixed(2)}</td>
      <td style="text-align:right">₹${(it.qty * it.price).toFixed(2)}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${p.invoice_no}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:760px;margin:24px auto;padding:0 20px}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:14px;color:#475569;margin:0 0 16px;font-weight:500}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px}
  th{background:#f1f5f9;text-align:left;font-weight:600}
  .row{display:flex;justify-content:space-between;font-size:13px;margin:4px 0}
  .row b{font-weight:600}
  .total{font-size:16px;font-weight:700;border-top:2px solid #0f172a;padding-top:8px;margin-top:8px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}
  .meta div{font-size:12px;color:#475569;line-height:1.5}
  .meta b{color:#0f172a;display:block;font-size:13px;margin-bottom:2px}
  .badge{display:inline-block;background:#0f172a;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;letter-spacing:.5px}
  .footer{margin-top:24px;font-size:11px;color:#64748b;text-align:center}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:start">
  <div>
    <h1>P4U Food</h1>
    <h2>Tax Invoice</h2>
  </div>
  <div style="text-align:right">
    <span class="badge">${escape(p.invoice_no)}</span>
    <p style="font-size:11px;color:#64748b;margin:6px 0 0">Generated ${date}</p>
  </div>
</div>

<div class="meta">
  <div><b>Billed to</b>
    ${escape(p.customer_name || "Customer")}<br/>
    ${escape(p.customer_phone || "")}<br/>
    ${escape(p.delivery_address || "")}
  </div>
  <div><b>Order details</b>
    Order ID: ${escape(p.order_id)}<br/>
    Restaurant: ${escape(p.restaurant_name || "")}<br/>
    Payment: ${escape((p.payment_method || "").toUpperCase())} ${p.payment_id ? `• ${escape(p.payment_id)}` : ""}
  </div>
</div>

<table>
  <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>

<div style="margin-top:18px;max-width:280px;margin-left:auto">
  <div class="row"><span>Subtotal</span><b>₹${p.subtotal.toFixed(2)}</b></div>
  <div class="row"><span>Delivery fee</span><b>₹${p.delivery_fee.toFixed(2)}</b></div>
  <div class="row"><span>Packaging</span><b>₹${p.packaging_fee.toFixed(2)}</b></div>
  <div class="row"><span>Platform fee</span><b>₹${p.platform_fee.toFixed(2)}</b></div>
  <div class="row"><span>GST</span><b>₹${p.tax.toFixed(2)}</b></div>
  ${p.discount > 0 ? `<div class="row" style="color:#16a34a"><span>Discount</span><b>-₹${p.discount.toFixed(2)}</b></div>` : ""}
  <div class="row total"><span>Total</span><b>₹${p.total.toFixed(2)}</b></div>
</div>

<p class="footer">This is a system-generated invoice issued by P4U on behalf of ${escape(p.restaurant_name || "the restaurant")}. For queries, please contact P4U support.</p>
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body></html>`;
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function downloadInvoice(p: InvoicePayload) {
  const html = buildInvoiceHtml(p);
  const w = window.open("", "_blank");
  if (!w) {
    // fallback: download as .html
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${p.invoice_no}.html`; a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.write(html);
  w.document.close();
}
