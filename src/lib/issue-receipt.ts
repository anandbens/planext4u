import { supabase } from "@/integrations/supabase/client";
import { downloadReceiptPdf, type ReceiptData } from "@/lib/receipt-pdf";
import { toast } from "sonner";

type EntityType = "vendor" | "franchise";

interface IssueReceiptParams {
  entityType: EntityType;
  entityId: string;
  paymentRecordId?: string | null;
  applicantName: string;
  companyName?: string | null;
  registrationNo?: string | null;
  category?: string | null;
  planName?: string | null;
  planAmount: number;
  amountPaid: number;
  transactionRef?: string | null;
  paymentMode?: string | null;
  paymentDate?: string | null;
  paymentStatus: "paid" | "pending" | "partial";
  receivedBy?: string | null;
  planBenefits?: string[];
  planFeatures?: string[];
  coverageType?: string | null;
  deliveryRadiusKm?: number | null;
  validityMonths?: number | null;
  territory?: string | null;
  promotionBenefits?: string[];
  rewardBenefits?: string[];
  redemptionBenefits?: string[];
  productVisibility?: string | null;
  keyFeatures?: string[];
}

async function fetchProjections() {
  const { data } = await (supabase as any)
    .from("business_projection_master")
    .select("scenario_label,scenario_order,category,category_order,investment,members,turnover,gross_profit,net_profit,share_pct,category_profit,profit_per_person,spend_1,spend_10,spend_100,spend_1000")
    .eq("status", "active")
    .order("scenario_order", { ascending: true })
    .order("category_order", { ascending: true });
  return data || [];
}


/**
 * Creates a payment_receipts row (with atomic receipt number)
 * and opens the branded print-to-PDF receipt in a new tab.
 */
export async function issueAndDownloadReceipt(p: IssueReceiptParams) {
  const balance = Math.max(0, p.planAmount - p.amountPaid);

  // 1. Generate receipt number via RPC
  const { data: receiptNo, error: rpcErr } = await (supabase as any).rpc("generate_receipt_number", {
    _entity_type: p.entityType,
  });
  if (rpcErr || !receiptNo) {
    toast.error("Could not generate receipt number");
    return null;
  }

  const snapshot = {
    applicant_name: p.applicantName,
    company_name: p.companyName,
    registration_no: p.registrationNo,
    category: p.category,
    plan_name: p.planName,
    plan_amount: p.planAmount,
    amount_paid: p.amountPaid,
    balance,
    transaction_ref: p.transactionRef,
    payment_mode: p.paymentMode,
    payment_date: p.paymentDate,
    payment_status: p.paymentStatus,
    received_by: p.receivedBy,
    plan_benefits: p.planBenefits || [],
    plan_features: p.planFeatures || [],
    coverage_type: p.coverageType,
    delivery_radius_km: p.deliveryRadiusKm,
    validity_months: p.validityMonths,
    territory: p.territory,
    promotion_benefits: p.promotionBenefits || [],
    reward_benefits: p.rewardBenefits || [],
    redemption_benefits: p.redemptionBenefits || [],
    product_visibility: p.productVisibility,
    key_features: p.keyFeatures || [],
  };

  const projections = p.entityType === "franchise" ? await fetchProjections() : [];

  // 2. Persist receipt row (idempotent per payment_record_id)
  try {
    await (supabase as any).from("payment_receipts").insert({
      receipt_no: receiptNo,
      entity_type: p.entityType,
      entity_id: p.entityId,
      payment_record_id: p.paymentRecordId || null,
      snapshot,
    });
  } catch (e) {
    // Not fatal — still show the PDF
    console.warn("Receipt persist failed", e);
  }

  const data: ReceiptData = {
    receipt_no: receiptNo,
    receipt_date: new Date().toISOString(),
    entity_type: p.entityType,
    applicant_name: p.applicantName,
    company_name: p.companyName,
    registration_no: p.registrationNo,
    category: p.category,
    plan_name: p.planName,
    plan_amount: p.planAmount,
    amount_paid: p.amountPaid,
    balance,
    transaction_ref: p.transactionRef,
    payment_mode: p.paymentMode,
    payment_date: p.paymentDate,
    payment_status: p.paymentStatus,
    received_by: p.receivedBy,
    plan_benefits: p.planBenefits || [],
    plan_features: p.planFeatures || [],
    coverage_type: p.coverageType,
    delivery_radius_km: p.deliveryRadiusKm,
    validity_months: p.validityMonths,
    territory: p.territory,
    promotion_benefits: p.promotionBenefits || [],
    reward_benefits: p.rewardBenefits || [],
    redemption_benefits: p.redemptionBenefits || [],
    product_visibility: p.productVisibility,
    key_features: p.keyFeatures || [],
    projections,
  };

  downloadReceiptPdf(data);
  return receiptNo as string;
}

/**
 * Re-download an existing receipt row (uses its stored snapshot).
 */
export async function redownloadReceipt(receiptId: string) {
  const { data, error } = await (supabase as any)
    .from("payment_receipts")
    .select("receipt_no, entity_type, snapshot, issued_at")
    .eq("id", receiptId)
    .maybeSingle();
  if (error || !data) {
    toast.error("Receipt not found");
    return;
  }
  const s = data.snapshot || {};
  const projections = data.entity_type === "franchise" ? await fetchProjections() : [];
  downloadReceiptPdf({
    receipt_no: data.receipt_no,
    receipt_date: data.issued_at,
    entity_type: data.entity_type,
    applicant_name: s.applicant_name || "—",
    company_name: s.company_name,
    registration_no: s.registration_no,
    category: s.category,
    plan_name: s.plan_name,
    plan_amount: Number(s.plan_amount || 0),
    amount_paid: Number(s.amount_paid || 0),
    balance: Number(s.balance || 0),
    transaction_ref: s.transaction_ref,
    payment_mode: s.payment_mode,
    payment_date: s.payment_date,
    payment_status: s.payment_status || "paid",
    received_by: s.received_by,
    plan_benefits: s.plan_benefits || [],
    plan_features: s.plan_features || [],
    coverage_type: s.coverage_type,
    delivery_radius_km: s.delivery_radius_km,
    validity_months: s.validity_months,
    territory: s.territory,
    promotion_benefits: s.promotion_benefits || [],
    reward_benefits: s.reward_benefits || [],
    redemption_benefits: s.redemption_benefits || [],
    product_visibility: s.product_visibility,
    key_features: s.key_features || [],
    projections,
  });
}
