// GST-compliant tax invoice & credit note HTML generator for product/service orders
import { supabase } from "@/integrations/supabase/client";

const escape = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const numberToWords = (num: number): string => {
  if (!num || num < 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  };
  const r = Math.round(num);
  return inWords(r) + " Rupees Only";
};

export interface InvoiceData {
  invoice_no: string;
  invoice_date: string;
  vendor_name: string; vendor_gstin: string | null; vendor_pan: string | null;
  vendor_address: string | null; vendor_state: string | null; vendor_state_code: string | null;
  customer_name: string; customer_email: string | null; customer_phone: string | null;
  customer_address?: string | null;
  place_of_supply_state: string | null; place_of_supply_code: string | null;
  is_interstate: boolean;
  items: any[];
  taxable_value: number; cgst_amount: number; sgst_amount: number; igst_amount: number;
  tcs_amount: number; discount: number; total_amount: number;
  order_id: string;
  doc_title?: string; // "TAX INVOICE" or "CREDIT NOTE"
}

export function buildInvoiceHTML(p: InvoiceData): string {
  const isCN = (p.doc_title || "").toUpperCase().includes("CREDIT");
  const title = p.doc_title || "TAX INVOICE";
  const items = Array.isArray(p.items) ? p.items : [];
  const itemRows = items.map((it, i) => {
    const qty = Number(it.quantity || it.qty || 1);
    const rate = Number(it.price || it.unit_price || 0);
    const amt = qty * rate;
    return `<tr>
      <td>${i + 1}</td>
      <td>${escape(it.name || it.title || "Item")}</td>
      <td>${escape(it.hsn_code || it.hsn || it.sac_code || "—")}</td>
      <td style="text-align:right">${qty}</td>
      <td style="text-align:right">₹${rate.toFixed(2)}</td>
      <td style="text-align:right">₹${amt.toFixed(2)}</td>
    </tr>`;
  }).join("");

  const taxRows = p.is_interstate
    ? `<tr><td colspan="5" style="text-align:right">IGST</td><td style="text-align:right">₹${p.igst_amount.toFixed(2)}</td></tr>`
    : `<tr><td colspan="5" style="text-align:right">CGST</td><td style="text-align:right">₹${p.cgst_amount.toFixed(2)}</td></tr>
       <tr><td colspan="5" style="text-align:right">SGST</td><td style="text-align:right">₹${p.sgst_amount.toFixed(2)}</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${escape(p.invoice_no)}</title>
<style>
  *{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:800px;margin:20px auto;padding:0 20px;font-size:12px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px}
  .doc-title{background:${isCN ? "#dc2626" : "#0f172a"};color:#fff;padding:6px 14px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:1px}
  .badge{background:#f1f5f9;border:1px solid #e2e8f0;padding:4px 10px;border-radius:4px;font-family:monospace;font-size:11px;display:inline-block;margin-bottom:6px}
  .meta{font-size:10px;color:#64748b}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
  .card{border:1px solid #e2e8f0;border-radius:6px;padding:10px}
  .card h4{margin:0 0 6px;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px}
  .card p{margin:1px 0;font-size:11px}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;font-size:11px}
  th{background:#f8fafc;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.3px}
  tfoot td{font-weight:600;background:#f8fafc}
  .total-row td{font-size:13px;background:#0f172a;color:#fff;padding:8px}
  .footer{margin-top:18px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;display:flex;justify-content:space-between}
  .words{margin-top:6px;padding:6px 10px;background:#f1f5f9;border-radius:4px;font-size:11px;font-style:italic}
</style></head>
<body>
  <div class="head">
    <div>
      <h1 style="margin:0;font-size:24px">P4U Marketplace</h1>
      <p class="meta">Products for You · GST Registered E-Commerce Operator</p>
    </div>
    <div style="text-align:right">
      <div class="doc-title">${title}</div>
      <p class="badge" style="margin-top:8px">${escape(p.invoice_no)}</p>
      <p class="meta">Date: ${new Date(p.invoice_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
      <p class="meta">Order: ${escape(p.order_id)}</p>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Supplier (Seller)</h4>
      <p style="font-weight:600">${escape(p.vendor_name)}</p>
      ${p.vendor_address ? `<p>${escape(p.vendor_address)}</p>` : ""}
      ${p.vendor_state ? `<p>${escape(p.vendor_state)} ${p.vendor_state_code ? `(${escape(p.vendor_state_code)})` : ""}</p>` : ""}
      ${p.vendor_gstin ? `<p><b>GSTIN:</b> ${escape(p.vendor_gstin)}</p>` : `<p style="color:#dc2626"><b>GSTIN:</b> Not provided</p>`}
      ${p.vendor_pan ? `<p><b>PAN:</b> ${escape(p.vendor_pan)}</p>` : ""}
    </div>
    <div class="card">
      <h4>Recipient (Buyer)</h4>
      <p style="font-weight:600">${escape(p.customer_name)}</p>
      ${p.customer_address ? `<p>${escape(p.customer_address)}</p>` : ""}
      ${p.customer_phone ? `<p>📱 ${escape(p.customer_phone)}</p>` : ""}
      ${p.customer_email ? `<p>✉ ${escape(p.customer_email)}</p>` : ""}
      <p><b>Place of Supply:</b> ${escape(p.place_of_supply_state || "—")} ${p.place_of_supply_code ? `(${escape(p.place_of_supply_code)})` : ""}</p>
      <p><b>Supply Type:</b> ${p.is_interstate ? "Inter-State" : "Intra-State"}</p>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>Description</th><th>HSN/SAC</th>
      <th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>${itemRows || `<tr><td colspan="6" style="text-align:center;color:#64748b">No items</td></tr>`}</tbody>
    <tfoot>
      <tr><td colspan="5" style="text-align:right">Taxable Value</td><td style="text-align:right">₹${p.taxable_value.toFixed(2)}</td></tr>
      ${p.discount > 0 ? `<tr><td colspan="5" style="text-align:right">Discount</td><td style="text-align:right">- ₹${p.discount.toFixed(2)}</td></tr>` : ""}
      ${taxRows}
      ${p.tcs_amount > 0 ? `<tr><td colspan="5" style="text-align:right">TCS (1% u/s 52)</td><td style="text-align:right">₹${p.tcs_amount.toFixed(2)}</td></tr>` : ""}
      <tr class="total-row"><td colspan="5" style="text-align:right">${isCN ? "Refund Total" : "Grand Total"}</td><td style="text-align:right">₹${p.total_amount.toFixed(2)}</td></tr>
    </tfoot>
  </table>

  <div class="words"><b>Amount in words:</b> ${numberToWords(p.total_amount)}</div>

  <div class="footer">
    <div>
      <p><b>Declaration:</b> ${isCN
        ? "This credit note is issued in accordance with Section 34 of the CGST Act for the cancellation/return referenced above."
        : "We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct."}</p>
      <p>Subject to ${escape(p.vendor_state || "local")} jurisdiction</p>
    </div>
    <div style="text-align:right">
      <p style="margin-bottom:30px">For <b>${escape(p.vendor_name)}</b></p>
      <p>Authorised Signatory</p>
    </div>
  </div>

  <p style="text-align:center;margin-top:20px;color:#94a3b8;font-size:9px">
    Computer-generated ${title.toLowerCase()}. P4U is the marketplace facilitator. The supplier above is responsible for the goods/services and applicable GST.
  </p>
</body></html>`;
}

export async function downloadOrderInvoice(orderId: string, asCreditNote = false) {
  const table = asCreditNote ? "credit_notes" : "order_invoices";
  const { data, error } = await supabase.from(table as any).select("*").eq("order_id", orderId).maybeSingle();
  if (error || !data) throw new Error("Invoice not yet generated. Order must be delivered first.");

  const d: any = data;
  const payload: InvoiceData = {
    invoice_no: d.invoice_no || d.credit_note_no,
    invoice_date: d.invoice_date || d.issue_date,
    vendor_name: d.vendor_name || "Vendor",
    vendor_gstin: d.vendor_gstin, vendor_pan: d.vendor_pan,
    vendor_address: d.vendor_address, vendor_state: d.vendor_state, vendor_state_code: d.vendor_state_code,
    customer_name: d.customer_name || "Customer",
    customer_email: d.customer_email, customer_phone: d.customer_phone,
    customer_address: d.customer_address,
    place_of_supply_state: d.place_of_supply_state, place_of_supply_code: d.place_of_supply_code,
    is_interstate: !!d.is_interstate,
    items: d.items || [],
    taxable_value: Number(d.taxable_value || 0),
    cgst_amount: Number(d.cgst_amount || 0),
    sgst_amount: Number(d.sgst_amount || 0),
    igst_amount: Number(d.igst_amount || 0),
    tcs_amount: Number(d.tcs_amount || 0),
    discount: Number(d.discount || 0),
    total_amount: Number(d.total_amount || 0),
    order_id: d.order_id,
    doc_title: asCreditNote ? "CREDIT NOTE" : "TAX INVOICE",
  };

  const html = buildInvoiceHTML(payload);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${payload.invoice_no}.html`; a.click();
  URL.revokeObjectURL(url);
}
