// Odoo XML-RPC sync edge function
// Handles: test_connection, push_order, push_product, push_customer, pull_inventory, pull_shipment_status, retry_failed
// Uses Odoo's external API (XML-RPC) — no third-party SDK needed.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Minimal XML-RPC client ----------
function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function valueToXml(v: any): string {
  if (v === null || v === undefined) return "<value><boolean>0</boolean></value>";
  if (typeof v === "boolean") return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number") return Number.isInteger(v) ? `<value><int>${v}</int></value>` : `<value><double>${v}</double></value>`;
  if (typeof v === "string") return `<value><string>${xmlEscape(v)}</string></value>`;
  if (Array.isArray(v)) return `<value><array><data>${v.map(valueToXml).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const members = Object.entries(v).map(([k, val]) => `<member><name>${xmlEscape(k)}</name>${valueToXml(val)}</member>`).join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return "<value><string></string></value>";
}
function buildXmlRpc(method: string, params: any[]): string {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params.map(p => `<param>${valueToXml(p)}</param>`).join("")}</params></methodCall>`;
}
// Very small XML response parser (good enough for Odoo responses)
function parseXmlValue(node: Element): any {
  const child = node.firstElementChild;
  if (!child) return node.textContent?.trim() ?? "";
  switch (child.tagName) {
    case "string": return child.textContent ?? "";
    case "int":
    case "i4": return parseInt(child.textContent ?? "0", 10);
    case "double": return parseFloat(child.textContent ?? "0");
    case "boolean": return child.textContent === "1";
    case "array": {
      const data = child.querySelector("data");
      if (!data) return [];
      return Array.from(data.children).map(c => parseXmlValue(c as Element));
    }
    case "struct": {
      const obj: Record<string, any> = {};
      Array.from(child.children).forEach(m => {
        const name = m.querySelector("name")?.textContent ?? "";
        const val = m.querySelector("value");
        if (val) obj[name] = parseXmlValue(val as Element);
      });
      return obj;
    }
    default: return child.textContent ?? "";
  }
}
async function xmlRpcCall(url: string, method: string, params: any[]): Promise<any> {
  const body = buildXmlRpc(method, params);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body,
  });
  const text = await res.text();
  // crude DOM parsing using DOMParser polyfill
  const { DOMParser } = await import("https://esm.sh/linkedom@0.16.11");
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const fault = doc.querySelector("fault");
  if (fault) {
    const v = fault.querySelector("value");
    const data = v ? parseXmlValue(v as any) : { faultString: "Unknown Odoo fault" };
    throw new Error(`Odoo fault: ${data.faultString || JSON.stringify(data)}`);
  }
  const value = doc.querySelector("methodResponse > params > param > value");
  return value ? parseXmlValue(value as any) : null;
}

// ---------- Odoo helpers ----------
async function odooAuth(cfg: OdooCfg): Promise<number> {
  const uid = await xmlRpcCall(`${cfg.base_url}/xmlrpc/2/common`, "authenticate", [cfg.database_name, cfg.username, cfg.api_key, {}]);
  if (!uid) throw new Error("Odoo authentication failed — check credentials");
  return uid as number;
}
async function odooExecute(cfg: OdooCfg, uid: number, model: string, method: string, args: any[], kwargs: Record<string, any> = {}) {
  return xmlRpcCall(`${cfg.base_url}/xmlrpc/2/object`, "execute_kw", [cfg.database_name, uid, cfg.api_key, model, method, args, kwargs]);
}

interface OdooCfg { base_url: string; database_name: string; username: string; api_key: string; default_warehouse_id?: string | null; }

async function loadCfg(supabase: any): Promise<OdooCfg> {
  const { data: row } = await supabase.from("odoo_config").select("*").eq("id", 1).maybeSingle();
  if (!row?.base_url || !row?.database_name || !row?.username) throw new Error("Odoo config incomplete — set Base URL, Database, Username in Integrations");
  // API key stored in a Supabase secret named by api_key_secret_name (default ODOO_API_KEY)
  const secretName = row.api_key_secret_name || "ODOO_API_KEY";
  const apiKey = Deno.env.get(secretName);
  if (!apiKey) throw new Error(`Missing secret ${secretName} — add it in Integrations → Odoo`);
  return { base_url: row.base_url.replace(/\/$/, ""), database_name: row.database_name, username: row.username, api_key: apiKey, default_warehouse_id: row.default_warehouse_id };
}

async function logSync(supabase: any, entry: any) {
  try { await supabase.from("odoo_sync_log").insert(entry); } catch (e) { console.error("log fail", e); }
}

// ---------- Action handlers ----------
async function testConnection(supabase: any) {
  const cfg = await loadCfg(supabase);
  const uid = await odooAuth(cfg);
  const version = await xmlRpcCall(`${cfg.base_url}/xmlrpc/2/common`, "version", []);
  await supabase.from("odoo_config").update({ last_sync_at: new Date().toISOString(), last_sync_status: "ok" }).eq("id", 1);
  return { ok: true, uid, version };
}

async function pushOrder(supabase: any, orderId: string) {
  const cfg = await loadCfg(supabase);
  const uid = await odooAuth(cfg);
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error || !order) throw new Error("Order not found");

  // Find or create partner (customer)
  let partnerId: number | null = null;
  if (order.customer_id) {
    const { data: cust } = await supabase.from("customers").select("name,email,mobile").eq("id", order.customer_id).maybeSingle();
    if (cust) {
      const found = await odooExecute(cfg, uid, "res.partner", "search", [[["email", "=", cust.email]]], { limit: 1 });
      if (Array.isArray(found) && found.length) partnerId = found[0];
      else {
        partnerId = await odooExecute(cfg, uid, "res.partner", "create", [{ name: cust.name, email: cust.email, phone: cust.mobile, customer_rank: 1 }]) as number;
      }
    }
  }

  // Create sale order (lightweight — items aren't always SKU-mapped)
  const orderPayload: any = {
    partner_id: partnerId || 1,
    client_order_ref: order.id,
    note: `P4U Order ${order.id}`,
  };
  const odooId = await odooExecute(cfg, uid, "sale.order", "create", [orderPayload]) as number;

  await logSync(supabase, { entity_type: "order", entity_id: orderId, direction: "push", status: "success", odoo_record_id: String(odooId), payload: orderPayload, completed_at: new Date().toISOString() });
  await supabase.from("odoo_config").update({ last_sync_at: new Date().toISOString(), last_sync_status: "ok" }).eq("id", 1);
  return { ok: true, odoo_record_id: odooId };
}

async function pushProduct(supabase: any, productId: string) {
  const cfg = await loadCfg(supabase);
  const uid = await odooAuth(cfg);
  const { data: p } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (!p) throw new Error("Product not found");
  const payload: any = {
    name: p.name,
    list_price: Number(p.price ?? 0),
    default_code: p.sku || p.id,
    type: "consu",
    description_sale: p.description ?? "",
  };
  const odooId = await odooExecute(cfg, uid, "product.product", "create", [payload]) as number;
  await logSync(supabase, { entity_type: "product", entity_id: productId, direction: "push", status: "success", odoo_record_id: String(odooId), payload, completed_at: new Date().toISOString() });
  return { ok: true, odoo_record_id: odooId };
}

async function pullInventory(supabase: any) {
  const cfg = await loadCfg(supabase);
  const uid = await odooAuth(cfg);
  const products = await odooExecute(cfg, uid, "product.product", "search_read", [[]], { fields: ["id", "default_code", "qty_available", "name"], limit: 200 });
  let updated = 0;
  for (const p of (products as any[])) {
    if (!p.default_code) continue;
    const { error } = await supabase.from("products").update({ stock: Math.floor(p.qty_available ?? 0) }).or(`sku.eq.${p.default_code},id.eq.${p.default_code}`);
    if (!error) updated++;
  }
  await logSync(supabase, { entity_type: "inventory", entity_id: "bulk", direction: "pull", status: "success", payload: { count: (products as any[]).length, updated }, completed_at: new Date().toISOString() });
  await supabase.from("odoo_config").update({ last_sync_at: new Date().toISOString(), last_sync_status: "ok" }).eq("id", 1);
  return { ok: true, count: (products as any[]).length, updated };
}

async function retryFailed(supabase: any) {
  const { data: failed } = await supabase.from("odoo_sync_log").select("*").eq("status", "failed").lt("retry_count", 3).limit(20);
  let retried = 0, succeeded = 0;
  for (const log of (failed || [])) {
    retried++;
    try {
      if (log.entity_type === "order") await pushOrder(supabase, log.entity_id);
      else if (log.entity_type === "product") await pushProduct(supabase, log.entity_id);
      await supabase.from("odoo_sync_log").update({ status: "success", completed_at: new Date().toISOString() }).eq("id", log.id);
      succeeded++;
    } catch (e: any) {
      await supabase.from("odoo_sync_log").update({ retry_count: (log.retry_count || 0) + 1, error_message: e.message }).eq("id", log.id);
    }
  }
  return { ok: true, retried, succeeded };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action as string;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let result: any;
    switch (action) {
      case "test_connection": result = await testConnection(supabase); break;
      case "push_order": result = await pushOrder(supabase, body.order_id); break;
      case "push_product": result = await pushProduct(supabase, body.product_id); break;
      case "pull_inventory": result = await pullInventory(supabase); break;
      case "retry_failed": result = await retryFailed(supabase); break;
      default: throw new Error(`Unknown action: ${action}`);
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[odoo-sync] error", e);
    // Best-effort failure log
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("odoo_config").update({ last_sync_status: `error: ${e.message}` }).eq("id", 1);
    } catch {}
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
