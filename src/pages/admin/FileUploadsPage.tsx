import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Download, FileText, AlertTriangle, CheckCircle, Clock, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// ── Product CSV ──
const PRODUCT_CSV_HEADERS = [
  "id","title","description","short_description","long_description","price","tax","discount","discount_type",
  "stock","sku","slug","product_type","category_name","subcategory_name","vendor_id","vendor_name",
  "emoji","image","images","thumbnail_image","banner_image","socio_shopping_icon",
  "meta_title","meta_description","replacement_time",
  "parent_item_id","parent_item_name","status","max_points_redeemable",
  "manage_stock","stock_status","weight","youtube_video_url","helpline_number","promise_p4u",
  "is_available","duration_hours","duration_minutes",
  "attribute_name_1","attribute_value_1","attribute_name_2","attribute_value_2",
  "attribute_name_3","attribute_value_3","attribute_name_4","attribute_value_4",
  "attribute_name_5","attribute_value_5",
];

// ── Customer CSV — covers ALL customers table columns ──
const CUSTOMER_CSV_HEADERS = [
  "id","name","email","mobile","occupation","gender","dob","about",
  "profile_photo","city_id","area_id","latitude","longitude",
  "wallet_points","referral_code","referred_by","kyc_status",
  "profile_completeness","status",
];

// ── Vendor CSV — covers ALL vendors table columns ──
const VENDOR_CSV_HEADERS = [
  "id","name","business_name","email","mobile",
  "category_id","city_id","area_id",
  "shop_address","shop_latitude","shop_longitude","shop_photo_url","background_image",
  "commission_rate","max_redemption_percentage","membership",
  "plan_id","plan_start_date","plan_end_date","plan_payment_status","plan_transaction_id",
  "rating","total_products","total_orders","total_revenue","status",
];

function downloadSampleCSV(type: string) {
  let headers: string[];
  let sampleRow: string[];
  if (type === "product") {
    headers = PRODUCT_CSV_HEADERS;
    sampleRow = [
      "","Sample Product","Description here","Short desc","Long desc","999","18","10","percentage",
      "100","SKU-001","sample-product","simple","Electronics","Phones","VND-001","Vendor Name",
      "📦","","","","","",
      "SEO Title","SEO Description","12 Hours",
      "","","active","0",
      "true","in_stock","0.5","","","",
      "true","0","0",
      "Color","Red","Size","M","","","","","",""
    ];
  } else if (type === "customer") {
    headers = CUSTOMER_CSV_HEADERS;
    sampleRow = [
      "","John Doe","john@email.com","9876543210","Engineer","male","1990-01-15","About me",
      "","CITY-001","AREA-001","17.385","78.4867",
      "0","","","pending",
      "0","active",
    ];
  } else {
    headers = VENDOR_CSV_HEADERS;
    sampleRow = [
      "","Jane Smith","Jane's Store","jane@email.com","9876543211",
      "CAT-001","CITY-001","AREA-001",
      "123 Main St","17.385","78.4867","","",
      "10","20","basic",
      "","","","unpaid","",
      "0","0","0","0","pending",
    ];
  }
  const csv = [headers.join(","), sampleRow.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sample_${type}_upload.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function validateEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validateMobile(mobile: string) { return /^\d{10,15}$/.test(mobile.replace(/[+\-\s]/g, "")); }

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 1) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { vals.push(current.trim()); current = ""; }
      else { current += char; }
    }
    vals.push(current.trim());
    return vals;
  });
  return { headers, rows };
}

// ════════════════════════════════════════════════════════════
// PRODUCT upload (unchanged logic)
// ════════════════════════════════════════════════════════════
async function processProductUpload(rows: string[][], headers: string[], uploadId: string) {
  let created = 0, updated = 0;
  const errors: any[] = [];

  const { data: dbAttributes } = await supabase.from("product_attributes").select("id, name").eq("is_active", true);
  const validAttrNames = new Set((dbAttributes || []).map((a: any) => a.name.toLowerCase()));
  const attrIdMap: Record<string, string> = {};
  (dbAttributes || []).forEach((a: any) => { attrIdMap[a.name.toLowerCase()] = a.id; });

  const { data: dbCategories } = await supabase.from("categories").select("id, name, parent_id");
  const catMap: Record<string, any> = {};
  (dbCategories || []).forEach((c: any) => { catMap[c.name.toLowerCase()] = c; });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });
    const rowErrors: string[] = [];

    if (!record.title) rowErrors.push("title is required");
    if (!record.price || isNaN(Number(record.price)) || Number(record.price) <= 0) rowErrors.push("price must be a valid positive number");
    if (!record.vendor_id) rowErrors.push("vendor_id is required");
    if (!record.sku) rowErrors.push("sku is required");
    if (record.tax && isNaN(Number(record.tax))) rowErrors.push("tax must be a number");
    if (record.discount && isNaN(Number(record.discount))) rowErrors.push("discount must be a number");
    if (record.stock && isNaN(Number(record.stock))) rowErrors.push("stock must be a number");
    if (record.discount_type && !["fixed","percentage",""].includes(record.discount_type)) rowErrors.push("discount_type must be 'fixed' or 'percentage'");
    if (record.product_type && !["simple","variable","service",""].includes(record.product_type)) rowErrors.push("product_type must be 'simple', 'variable', or 'service'");
    if (record.status && !["active","inactive","draft","pending_approval",""].includes(record.status)) rowErrors.push("status must be active/inactive/draft/pending_approval");
    if (record.title && record.title.length > 500) rowErrors.push("title must be under 500 characters");
    if (record.sku && record.sku.length > 100) rowErrors.push("sku must be under 100 characters");

    if (record.category_name) {
      if (!catMap[record.category_name.toLowerCase()]) rowErrors.push(`category_name '${record.category_name}' not found`);
    }
    if (record.subcategory_name && record.category_name) {
      const parentCat = catMap[record.category_name.toLowerCase()];
      if (parentCat) {
        const sub = (dbCategories || []).find((c: any) => c.parent_id === parentCat.id && c.name.toLowerCase() === record.subcategory_name.toLowerCase());
        if (!sub) rowErrors.push(`subcategory_name '${record.subcategory_name}' not found under '${record.category_name}'`);
      }
    }

    const productAttrs: any[] = [];
    for (let a = 1; a <= 5; a++) {
      const an = record[`attribute_name_${a}`], av = record[`attribute_value_${a}`];
      if (an && av) {
        if (!validAttrNames.has(an.toLowerCase())) rowErrors.push(`attribute '${an}' not found in attributes master`);
        else {
          const ex = productAttrs.find(pa => pa.attribute_name.toLowerCase() === an.toLowerCase());
          if (ex) ex.values.push(av);
          else productAttrs.push({ attribute_id: attrIdMap[an.toLowerCase()], attribute_name: an, values: [av] });
        }
      } else if (an && !av) rowErrors.push(`attribute_value_${a} required when attribute_name_${a} provided`);
    }

    if (rowErrors.length > 0) { errors.push({ row: i + 2, data: record, errors: rowErrors }); continue; }

    try {
      let categoryId = "", categoryName = record.category_name || "", subcategoryId = "", subcategoryName = record.subcategory_name || "";
      if (record.category_name) {
        const cat = catMap[record.category_name.toLowerCase()];
        if (cat) { categoryId = cat.id; categoryName = cat.name;
          if (record.subcategory_name) {
            const sub = (dbCategories || []).find((c: any) => c.parent_id === cat.id && c.name.toLowerCase() === record.subcategory_name.toLowerCase());
            if (sub) { subcategoryId = sub.id; subcategoryName = sub.name; }
          }
        }
      }
      let imagesArr: string[] = [];
      if (record.images) { try { imagesArr = JSON.parse(record.images); } catch { imagesArr = record.images.split("|").filter(Boolean); } }

      const payload: any = {
        title: record.title, description: record.description || record.short_description || "",
        short_description: record.short_description || null, long_description: record.long_description || null,
        price: Number(record.price) || 0, tax: Number(record.tax) || 0, discount: Number(record.discount) || 0,
        discount_type: record.discount_type || "fixed", stock: Number(record.stock) || 0,
        sku: record.sku || null, slug: record.slug || null, product_type: record.product_type || "simple",
        category_id: categoryId || null, category_name: categoryName || null,
        subcategory_id: subcategoryId || null, subcategory_name: subcategoryName || null,
        vendor_id: record.vendor_id, vendor_name: record.vendor_name || null,
        emoji: record.emoji || "📦", image: record.image || (imagesArr.length > 0 ? imagesArr[0] : null),
        images: imagesArr.length > 0 ? imagesArr : null, thumbnail_image: record.thumbnail_image || null,
        banner_image: record.banner_image || null, socio_shopping_icon: record.socio_shopping_icon || null,
        meta_title: record.meta_title || null, meta_description: record.meta_description || null,
        replacement_time: record.replacement_time || "12 Hours",
        parent_item_id: record.parent_item_id || null, parent_item_name: record.parent_item_name || null,
        status: record.status || "active", max_points_redeemable: Number(record.max_points_redeemable) || 0,
        manage_stock: record.manage_stock === "true" || record.manage_stock === "1",
        stock_status: record.stock_status || "in_stock", weight: record.weight ? Number(record.weight) : null,
        youtube_video_url: record.youtube_video_url || null, helpline_number: record.helpline_number || null,
        promise_p4u: record.promise_p4u || null,
        is_available: record.is_available !== "false" && record.is_available !== "0",
        duration_hours: Number(record.duration_hours) || null, duration_minutes: Number(record.duration_minutes) || null,
        product_attributes: productAttrs.length > 0 ? productAttrs : null,
      };

      const existingId = record.id?.trim();
      if (existingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", existingId);
        if (error) throw error;
        updated++;
      } else {
        const id = `PRD-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
        const { error } = await supabase.from("products").insert({ ...payload, id } as any);
        if (error) throw error;
        created++;
      }
    } catch (e: any) { errors.push({ row: i + 2, data: record, errors: [e.message] }); }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: created + updated, error_count: errors.length,
    error_log: errors.length > 0 ? errors : null, updated_at: new Date().toISOString(),
  }).eq("id", uploadId);
}

// ════════════════════════════════════════════════════════════
// CUSTOMER upload — full field coverage with create / update
// ════════════════════════════════════════════════════════════
async function processCustomerUpload(rows: string[][], headers: string[], uploadId: string) {
  let created = 0, updated = 0;
  const errors: any[] = [];

  // Pre-fetch existing emails & mobiles for dupe checks
  const { data: existingCustomers } = await supabase.from("customers").select("id, email, mobile");
  const emailIdMap: Record<string, string> = {};
  const mobileIdMap: Record<string, string> = {};
  (existingCustomers || []).forEach((c: any) => {
    if (c.email) emailIdMap[c.email.toLowerCase()] = c.id;
    if (c.mobile) mobileIdMap[c.mobile.replace(/\D/g, "")] = c.id;
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });
    const rowErrors: string[] = [];

    // Required fields
    if (!record.name?.trim()) rowErrors.push("name is required");
    if (record.name && record.name.length > 200) rowErrors.push("name must be under 200 characters");
    if (!record.email || !validateEmail(record.email)) rowErrors.push("valid email is required");
    if (!record.mobile || !validateMobile(record.mobile)) rowErrors.push("valid 10+ digit mobile is required");

    // Data type validations
    if (record.gender && !["male","female","other",""].includes(record.gender.toLowerCase())) rowErrors.push("gender must be male/female/other");
    if (record.dob && isNaN(Date.parse(record.dob))) rowErrors.push("dob must be a valid date (YYYY-MM-DD)");
    if (record.latitude && isNaN(Number(record.latitude))) rowErrors.push("latitude must be a number");
    if (record.longitude && isNaN(Number(record.longitude))) rowErrors.push("longitude must be a number");
    if (record.wallet_points && isNaN(Number(record.wallet_points))) rowErrors.push("wallet_points must be a number");
    if (record.profile_completeness && isNaN(Number(record.profile_completeness))) rowErrors.push("profile_completeness must be a number");
    if (record.status && !["active","inactive","suspended","deactivated","deleted",""].includes(record.status)) rowErrors.push("status must be active/inactive/suspended/deactivated/deleted");
    if (record.kyc_status && !["pending","approved","rejected",""].includes(record.kyc_status)) rowErrors.push("kyc_status must be pending/approved/rejected");
    if (record.about && record.about.length > 1000) rowErrors.push("about must be under 1000 characters");
    if (record.occupation && record.occupation.length > 200) rowErrors.push("occupation must be under 200 characters");

    // Duplicate check for new records
    const existingId = record.id?.trim();
    if (!existingId) {
      const cleanMobile = record.mobile?.replace(/\D/g, "") || "";
      if (record.email && emailIdMap[record.email.toLowerCase().trim()]) rowErrors.push("email already exists in customers");
      if (cleanMobile && mobileIdMap[cleanMobile]) rowErrors.push("mobile already exists in customers");
    }

    if (rowErrors.length > 0) { errors.push({ row: i + 2, data: record, errors: rowErrors }); continue; }

    try {
      const payload: any = {
        name: record.name.trim(),
        email: record.email.toLowerCase().trim(),
        mobile: record.mobile.trim(),
        occupation: record.occupation || null,
        gender: record.gender?.toLowerCase() || null,
        dob: record.dob || null,
        about: record.about || null,
        profile_photo: record.profile_photo || null,
        city_id: record.city_id || null,
        area_id: record.area_id || null,
        latitude: record.latitude ? Number(record.latitude) : 0,
        longitude: record.longitude ? Number(record.longitude) : 0,
        wallet_points: record.wallet_points ? Number(record.wallet_points) : 0,
        referred_by: record.referred_by || null,
        kyc_status: record.kyc_status || "pending",
        profile_completeness: record.profile_completeness ? Number(record.profile_completeness) : 0,
        status: record.status || "active",
      };

      if (existingId) {
        const { error } = await supabase.from("customers").update(payload).eq("id", existingId);
        if (error) throw error;
        updated++;
      } else {
        const id = `USR-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
        const refCode = record.referral_code?.trim() || `MRCP4U${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
        const { error } = await supabase.from("customers").insert({ ...payload, id, referral_code: refCode });
        if (error) throw error;
        // Track for dupe checks within the same upload
        emailIdMap[payload.email] = id;
        mobileIdMap[payload.mobile.replace(/\D/g, "")] = id;
        created++;
      }
    } catch (e: any) { errors.push({ row: i + 2, data: record, errors: [e.message] }); }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: created + updated, error_count: errors.length,
    error_log: errors.length > 0 ? errors : null, updated_at: new Date().toISOString(),
  }).eq("id", uploadId);
}

// ════════════════════════════════════════════════════════════
// VENDOR upload — full field coverage with create / update
// ════════════════════════════════════════════════════════════
async function processVendorUpload(rows: string[][], headers: string[], uploadId: string) {
  let created = 0, updated = 0;
  const errors: any[] = [];

  const { data: existingVendors } = await supabase.from("vendors").select("id, email, mobile");
  const emailIdMap: Record<string, string> = {};
  const mobileIdMap: Record<string, string> = {};
  (existingVendors || []).forEach((v: any) => {
    if (v.email) emailIdMap[v.email.toLowerCase()] = v.id;
    if (v.mobile) mobileIdMap[v.mobile.replace(/\D/g, "")] = v.id;
  });

  // Fetch valid categories for validation
  const { data: dbCategories } = await supabase.from("categories").select("id");
  const validCatIds = new Set((dbCategories || []).map((c: any) => c.id));

  // Fetch valid plans for validation
  const { data: dbPlans } = await supabase.from("vendor_plans").select("id");
  const validPlanIds = new Set((dbPlans || []).map((p: any) => p.id));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });
    const rowErrors: string[] = [];

    // Required fields
    if (!record.name?.trim()) rowErrors.push("name is required");
    if (!record.business_name?.trim()) rowErrors.push("business_name is required");
    if (!record.email || !validateEmail(record.email)) rowErrors.push("valid email is required");
    if (!record.mobile || !validateMobile(record.mobile)) rowErrors.push("valid 10+ digit mobile is required");

    // Length validations
    if (record.name && record.name.length > 200) rowErrors.push("name must be under 200 characters");
    if (record.business_name && record.business_name.length > 300) rowErrors.push("business_name must be under 300 characters");
    if (record.shop_address && record.shop_address.length > 500) rowErrors.push("shop_address must be under 500 characters");

    // Data type validations
    if (record.commission_rate && (isNaN(Number(record.commission_rate)) || Number(record.commission_rate) < 0 || Number(record.commission_rate) > 100))
      rowErrors.push("commission_rate must be 0-100");
    if (record.max_redemption_percentage && (isNaN(Number(record.max_redemption_percentage)) || Number(record.max_redemption_percentage) < 0 || Number(record.max_redemption_percentage) > 100))
      rowErrors.push("max_redemption_percentage must be 0-100");
    if (record.shop_latitude && isNaN(Number(record.shop_latitude))) rowErrors.push("shop_latitude must be a number");
    if (record.shop_longitude && isNaN(Number(record.shop_longitude))) rowErrors.push("shop_longitude must be a number");
    if (record.rating && (isNaN(Number(record.rating)) || Number(record.rating) < 0 || Number(record.rating) > 5))
      rowErrors.push("rating must be 0-5");
    if (record.total_products && isNaN(Number(record.total_products))) rowErrors.push("total_products must be a number");
    if (record.total_orders && isNaN(Number(record.total_orders))) rowErrors.push("total_orders must be a number");
    if (record.total_revenue && isNaN(Number(record.total_revenue))) rowErrors.push("total_revenue must be a number");
    if (record.status && !["active","inactive","pending","suspended","rejected",""].includes(record.status))
      rowErrors.push("status must be active/inactive/pending/suspended/rejected");
    if (record.membership && !["basic","premium","enterprise",""].includes(record.membership))
      rowErrors.push("membership must be basic/premium/enterprise");
    if (record.plan_payment_status && !["paid","unpaid","trial","expired",""].includes(record.plan_payment_status))
      rowErrors.push("plan_payment_status must be paid/unpaid/trial/expired");

    // FK validations
    if (record.category_id && !validCatIds.has(record.category_id)) rowErrors.push(`category_id '${record.category_id}' not found`);
    if (record.plan_id && !validPlanIds.has(record.plan_id)) rowErrors.push(`plan_id '${record.plan_id}' not found in vendor plans`);
    if (record.plan_start_date && isNaN(Date.parse(record.plan_start_date))) rowErrors.push("plan_start_date must be valid date");
    if (record.plan_end_date && isNaN(Date.parse(record.plan_end_date))) rowErrors.push("plan_end_date must be valid date");

    // Duplicate check for new records
    const existingId = record.id?.trim();
    if (!existingId) {
      const cleanMobile = record.mobile?.replace(/\D/g, "") || "";
      if (record.email && emailIdMap[record.email.toLowerCase().trim()]) rowErrors.push("email already exists in vendors");
      if (cleanMobile && mobileIdMap[cleanMobile]) rowErrors.push("mobile already exists in vendors");
    }

    if (rowErrors.length > 0) { errors.push({ row: i + 2, data: record, errors: rowErrors }); continue; }

    try {
      const payload: any = {
        name: record.name.trim(),
        business_name: record.business_name.trim(),
        email: record.email.toLowerCase().trim(),
        mobile: record.mobile.trim(),
        category_id: record.category_id || null,
        city_id: record.city_id || null,
        area_id: record.area_id || null,
        shop_address: record.shop_address || null,
        shop_latitude: record.shop_latitude ? Number(record.shop_latitude) : null,
        shop_longitude: record.shop_longitude ? Number(record.shop_longitude) : null,
        shop_photo_url: record.shop_photo_url || null,
        background_image: record.background_image || null,
        commission_rate: record.commission_rate ? Number(record.commission_rate) : 10,
        max_redemption_percentage: record.max_redemption_percentage ? Number(record.max_redemption_percentage) : null,
        membership: record.membership || "basic",
        plan_id: record.plan_id || null,
        plan_start_date: record.plan_start_date || null,
        plan_end_date: record.plan_end_date || null,
        plan_payment_status: record.plan_payment_status || "unpaid",
        plan_transaction_id: record.plan_transaction_id || null,
        rating: record.rating ? Number(record.rating) : null,
        total_products: record.total_products ? Number(record.total_products) : 0,
        total_orders: record.total_orders ? Number(record.total_orders) : 0,
        total_revenue: record.total_revenue ? Number(record.total_revenue) : 0,
        status: record.status || "pending",
      };

      if (existingId) {
        const { error } = await supabase.from("vendors").update(payload).eq("id", existingId);
        if (error) throw error;
        updated++;
      } else {
        const id = `VND-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
        const { error } = await supabase.from("vendors").insert({ ...payload, id } as any);
        if (error) throw error;
        emailIdMap[payload.email] = id;
        mobileIdMap[payload.mobile.replace(/\D/g, "")] = id;
        created++;
      }
    } catch (e: any) { errors.push({ row: i + 2, data: record, errors: [e.message] }); }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: created + updated, error_count: errors.length,
    error_log: errors.length > 0 ? errors : null, updated_at: new Date().toISOString(),
  }).eq("id", uploadId);
}

// ════════════════════════════════════════════════════════════
// Page Component
// ════════════════════════════════════════════════════════════
export default function FileUploadsPage() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadType, setUploadType] = useState("product");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchUploads = useCallback(async () => {
    const { data } = await supabase.from("file_uploads" as any).select("*").order("created_at", { ascending: false });
    setUploads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { toast.error("Only CSV files are allowed"); return; }

    setUploading(true);
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    if (rows.length === 0) { toast.error("File is empty"); setUploading(false); return; }

    const { data: uploadRecord, error: insertErr } = await supabase.from("file_uploads" as any).insert({
      file_name: file.name, upload_type: uploadType, status: "processing",
      total_records: rows.length, uploaded_by: user?.name || "Admin",
    }).select().single();

    if (insertErr || !uploadRecord) { toast.error("Failed to create upload record"); setUploading(false); return; }

    toast.success(`Processing ${rows.length} records in background...`);
    fetchUploads();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";

    const uploadId = (uploadRecord as any).id;
    if (uploadType === "product") processProductUpload(rows, headers, uploadId).then(fetchUploads);
    else if (uploadType === "customer") processCustomerUpload(rows, headers, uploadId).then(fetchUploads);
    else processVendorUpload(rows, headers, uploadId).then(fetchUploads);
  };

  const downloadErrors = (upload: any) => {
    if (!upload.error_log || upload.error_log.length === 0) return;
    const errorData = upload.error_log as any[];
    const dataKeys = Object.keys(errorData[0]?.data || {});
    const csvHeaders = ["Row", ...dataKeys];
    const maxErrors = Math.max(...errorData.map((e: any) => Array.isArray(e.errors) ? e.errors.length : 1));
    for (let i = 1; i <= maxErrors; i++) csvHeaders.push(`Error_${i}`);

    const csvRows = errorData.map((e: any) => {
      const vals = [String(e.row), ...dataKeys.map(k => String(e.data?.[k] ?? ""))];
      const errs = Array.isArray(e.errors) ? e.errors : [e.errors];
      for (let i = 0; i < maxErrors; i++) vals.push(errs[i] || "");
      return vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [csvHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `errors_${upload.file_name}`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-success" />;
    if (status === "processing") return <Clock className="h-4 w-4 text-warning animate-spin" />;
    if (status === "failed") return <X className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  const helpText: Record<string, React.ReactNode> = {
    product: (
      <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-1">
        <p><strong>Product CSV supports:</strong> All product fields including images, SEO, pricing, and up to 5 attribute name/value pairs.</p>
        <p><strong>Create vs Update:</strong> Leave <code className="bg-muted px-1 rounded">id</code> empty to create. Provide existing ID to update.</p>
        <p><strong>Attributes:</strong> Attribute names must exist in the Attributes master. Use pipe (<code className="bg-muted px-1 rounded">|</code>) to separate multiple image URLs.</p>
      </div>
    ),
    customer: (
      <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-1">
        <p><strong>Customer CSV supports:</strong> All customer fields — name, email, mobile, occupation, gender, dob, about, profile photo, location, wallet points, referral code, KYC status, etc.</p>
        <p><strong>Create vs Update:</strong> Leave <code className="bg-muted px-1 rounded">id</code> empty to create. Provide existing customer ID to update.</p>
        <p><strong>Duplicates:</strong> Email and mobile uniqueness is checked for new records. Dates use YYYY-MM-DD format.</p>
      </div>
    ),
    vendor: (
      <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-1">
        <p><strong>Vendor CSV supports:</strong> All vendor fields — name, business name, email, mobile, shop details, commission rate, max redemption %, plan info, ratings, etc.</p>
        <p><strong>Create vs Update:</strong> Leave <code className="bg-muted px-1 rounded">id</code> empty to create. Provide existing vendor ID to update.</p>
        <p><strong>Validation:</strong> Category ID and Plan ID are validated against master data. Email and mobile uniqueness is enforced for new records.</p>
      </div>
    ),
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">File Uploads</h1>
        <p className="page-description">Bulk upload products, customers, and vendors via CSV. Leave ID blank to create, provide existing ID to update.</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Upload Type</label>
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="vendor">Vendors</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">CSV File</label>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading}
              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
          </div>
          <Button variant="outline" onClick={() => downloadSampleCSV(uploadType)} className="gap-2">
            <Download className="h-4 w-4" /> Sample {uploadType} CSV
          </Button>
          <Button variant="ghost" onClick={fetchUploads} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
        {helpText[uploadType]}
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : uploads.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No uploads yet. Upload a CSV to get started.</p>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left px-4 py-3 font-medium">File</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Success</th>
                  <th className="text-center px-4 py-3 font-medium">Errors</th>
                  <th className="text-left px-4 py-3 font-medium">Uploaded</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium">{u.file_name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{u.upload_type}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(u.status)}
                        <span className="capitalize">{u.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{u.total_records}</td>
                    <td className="px-4 py-3 text-center text-success font-medium">{u.success_count}</td>
                    <td className="px-4 py-3 text-center text-destructive font-medium">{u.error_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.error_count > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => downloadErrors(u)} className="gap-1 text-destructive">
                          <Download className="h-3 w-3" /> Error Log
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
