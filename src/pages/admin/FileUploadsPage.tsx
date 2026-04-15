import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Download, FileText, AlertTriangle, CheckCircle, Clock, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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

const CUSTOMER_CSV_HEADERS = [
  "name","email","mobile","occupation","city_id","area_id","status"
];

const VENDOR_CSV_HEADERS = [
  "name","business_name","email","mobile","category_id","city_id","area_id","commission_rate","membership","status"
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
    sampleRow = ["John Doe","john@email.com","9876543210","Engineer","1","1","active"];
  } else {
    headers = VENDOR_CSV_HEADERS;
    sampleRow = ["Jane Smith","Jane's Store","jane@email.com","9876543211","CAT-001","1","1","10","basic","pending"];
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

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateMobile(mobile: string) {
  return /^\d{10,15}$/.test(mobile.replace(/[+\-\s]/g, ""));
}

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

async function processProductUpload(rows: string[][], headers: string[], uploadId: string) {
  let created = 0;
  let updated = 0;
  const errors: any[] = [];

  // Fetch valid attribute names from DB
  const { data: dbAttributes } = await supabase.from("product_attributes").select("id, name").eq("is_active", true);
  const validAttrNames = new Set((dbAttributes || []).map((a: any) => a.name.toLowerCase()));
  const attrIdMap: Record<string, string> = {};
  (dbAttributes || []).forEach((a: any) => { attrIdMap[a.name.toLowerCase()] = a.id; });

  // Fetch valid categories
  const { data: dbCategories } = await supabase.from("categories").select("id, name, parent_id");
  const catMap: Record<string, any> = {};
  (dbCategories || []).forEach((c: any) => { catMap[c.name.toLowerCase()] = c; });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });

    const rowErrors: string[] = [];

    // Required field validation
    if (!record.title) rowErrors.push("title is required");
    if (!record.price || isNaN(Number(record.price)) || Number(record.price) <= 0) rowErrors.push("price must be a valid positive number");
    if (!record.vendor_id) rowErrors.push("vendor_id is required");
    if (!record.sku) rowErrors.push("sku is required");

    // Data type validations
    if (record.tax && isNaN(Number(record.tax))) rowErrors.push("tax must be a number");
    if (record.discount && isNaN(Number(record.discount))) rowErrors.push("discount must be a number");
    if (record.stock && isNaN(Number(record.stock))) rowErrors.push("stock must be a number");
    if (record.discount_type && !["fixed","percentage",""].includes(record.discount_type)) rowErrors.push("discount_type must be 'fixed' or 'percentage'");
    if (record.product_type && !["simple","variable","service",""].includes(record.product_type)) rowErrors.push("product_type must be 'simple', 'variable', or 'service'");
    if (record.status && !["active","inactive","draft","pending_approval",""].includes(record.status)) rowErrors.push("status must be active/inactive/draft/pending_approval");

    // String length validations
    if (record.title && record.title.length > 500) rowErrors.push("title must be under 500 characters");
    if (record.sku && record.sku.length > 100) rowErrors.push("sku must be under 100 characters");
    if (record.meta_title && record.meta_title.length > 200) rowErrors.push("meta_title must be under 200 characters");
    if (record.meta_description && record.meta_description.length > 500) rowErrors.push("meta_description must be under 500 characters");

    // Validate category name exists
    if (record.category_name) {
      const cat = catMap[record.category_name.toLowerCase()];
      if (!cat) rowErrors.push(`category_name '${record.category_name}' not found in categories master`);
    }

    // Validate subcategory
    if (record.subcategory_name && record.category_name) {
      const parentCat = catMap[record.category_name.toLowerCase()];
      if (parentCat) {
        const subCat = (dbCategories || []).find((c: any) => c.parent_id === parentCat.id && c.name.toLowerCase() === record.subcategory_name.toLowerCase());
        if (!subCat) rowErrors.push(`subcategory_name '${record.subcategory_name}' not found under '${record.category_name}'`);
      }
    }

    // Validate attributes
    const productAttrs: any[] = [];
    for (let a = 1; a <= 5; a++) {
      const attrName = record[`attribute_name_${a}`];
      const attrVal = record[`attribute_value_${a}`];
      if (attrName && attrVal) {
        if (!validAttrNames.has(attrName.toLowerCase())) {
          rowErrors.push(`attribute '${attrName}' not found in attributes master`);
        } else {
          const existingAttr = productAttrs.find(pa => pa.attribute_name.toLowerCase() === attrName.toLowerCase());
          if (existingAttr) {
            existingAttr.values.push(attrVal);
          } else {
            productAttrs.push({
              attribute_id: attrIdMap[attrName.toLowerCase()],
              attribute_name: attrName,
              values: [attrVal],
            });
          }
        }
      } else if (attrName && !attrVal) {
        rowErrors.push(`attribute_value_${a} is required when attribute_name_${a} is provided`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, data: record, errors: rowErrors });
      continue;
    }

    try {
      // Resolve category IDs
      let categoryId = "";
      let categoryName = record.category_name || "";
      let subcategoryId = "";
      let subcategoryName = record.subcategory_name || "";

      if (record.category_name) {
        const cat = catMap[record.category_name.toLowerCase()];
        if (cat) {
          categoryId = cat.id;
          categoryName = cat.name;
          if (record.subcategory_name) {
            const subCat = (dbCategories || []).find((c: any) => c.parent_id === cat.id && c.name.toLowerCase() === record.subcategory_name.toLowerCase());
            if (subCat) { subcategoryId = subCat.id; subcategoryName = subCat.name; }
          }
        }
      }

      // Parse images array
      let imagesArr: string[] = [];
      if (record.images) {
        try { imagesArr = JSON.parse(record.images); } catch { imagesArr = record.images.split("|").filter(Boolean); }
      }

      const payload: any = {
        title: record.title,
        description: record.description || record.short_description || "",
        short_description: record.short_description || null,
        long_description: record.long_description || null,
        price: Number(record.price) || 0,
        tax: Number(record.tax) || 0,
        discount: Number(record.discount) || 0,
        discount_type: record.discount_type || "fixed",
        stock: Number(record.stock) || 0,
        sku: record.sku || null,
        slug: record.slug || null,
        product_type: record.product_type || "simple",
        category_id: categoryId || null,
        category_name: categoryName || null,
        subcategory_id: subcategoryId || null,
        subcategory_name: subcategoryName || null,
        vendor_id: record.vendor_id,
        vendor_name: record.vendor_name || null,
        emoji: record.emoji || "📦",
        image: record.image || (imagesArr.length > 0 ? imagesArr[0] : null),
        images: imagesArr.length > 0 ? imagesArr : null,
        thumbnail_image: record.thumbnail_image || null,
        banner_image: record.banner_image || null,
        socio_shopping_icon: record.socio_shopping_icon || null,
        meta_title: record.meta_title || null,
        meta_description: record.meta_description || null,
        replacement_time: record.replacement_time || "12 Hours",
        parent_item_id: record.parent_item_id || null,
        parent_item_name: record.parent_item_name || null,
        status: record.status || "active",
        max_points_redeemable: Number(record.max_points_redeemable) || 0,
        manage_stock: record.manage_stock === "true" || record.manage_stock === "1",
        stock_status: record.stock_status || "in_stock",
        weight: record.weight ? Number(record.weight) : null,
        youtube_video_url: record.youtube_video_url || null,
        helpline_number: record.helpline_number || null,
        promise_p4u: record.promise_p4u || null,
        is_available: record.is_available !== "false" && record.is_available !== "0",
        duration_hours: Number(record.duration_hours) || null,
        duration_minutes: Number(record.duration_minutes) || null,
        product_attributes: productAttrs.length > 0 ? productAttrs : null,
      };

      // Check if record has an ID (update) or no ID (create)
      const existingId = record.id?.trim();
      if (existingId) {
        // Update existing product
        const { error } = await supabase.from("products").update(payload).eq("id", existingId);
        if (error) throw error;
        updated++;
      } else {
        // Create new product
        const id = `PRD-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
        const { error } = await supabase.from("products").insert({ ...payload, id } as any);
        if (error) throw error;
        created++;
      }
    } catch (e: any) {
      errors.push({ row: i + 2, data: record, errors: [e.message] });
    }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: created + updated,
    error_count: errors.length,
    error_log: errors.length > 0 ? errors : null,
    updated_at: new Date().toISOString(),
  }).eq("id", uploadId);
}

async function processCustomerUpload(rows: string[][], headers: string[], uploadId: string) {
  let success = 0;
  const errors: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });

    const rowErrors: string[] = [];
    if (!record.name) rowErrors.push("name is required");
    if (!record.email || !validateEmail(record.email)) rowErrors.push("valid email is required");
    if (!record.mobile || !validateMobile(record.mobile)) rowErrors.push("valid 10-digit mobile number is required");

    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, data: record, errors: rowErrors });
      continue;
    }

    try {
      const id = `USR-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
      const refCode = `MRCP4U${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
      const { error } = await supabase.from("customers").insert({
        id, name: record.name, email: record.email, mobile: record.mobile,
        occupation: record.occupation || "", city_id: record.city_id || "1", area_id: record.area_id || "1",
        latitude: 0, longitude: 0, wallet_points: 0, referral_code: refCode,
        status: record.status || "active",
      });
      if (error) throw error;
      success++;
    } catch (e: any) {
      errors.push({ row: i + 2, data: record, errors: [e.message] });
    }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: success, error_count: errors.length, error_log: errors.length > 0 ? errors : null,
  }).eq("id", uploadId);
}

async function processVendorUpload(rows: string[][], headers: string[], uploadId: string) {
  let success = 0;
  const errors: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });

    const rowErrors: string[] = [];
    if (!record.name) rowErrors.push("name is required");
    if (!record.business_name) rowErrors.push("business_name is required");
    if (!record.email || !validateEmail(record.email)) rowErrors.push("valid email is required");
    if (!record.mobile || !validateMobile(record.mobile)) rowErrors.push("valid mobile number is required");

    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, data: record, errors: rowErrors });
      continue;
    }

    try {
      const id = `VND-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
      const { error } = await supabase.from("vendors").insert({
        id, name: record.name, business_name: record.business_name,
        email: record.email, mobile: record.mobile,
        category_id: record.category_id || null, city_id: record.city_id || null,
        area_id: record.area_id || null, commission_rate: Number(record.commission_rate) || 10,
        membership: record.membership || "basic", status: record.status || "pending",
        total_products: 0, total_orders: 0, total_revenue: 0,
      } as any);
      if (error) throw error;
      success++;
    } catch (e: any) {
      errors.push({ row: i + 2, data: record, errors: [e.message] });
    }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: success, error_count: errors.length, error_log: errors.length > 0 ? errors : null,
  }).eq("id", uploadId);
}

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
      file_name: file.name,
      upload_type: uploadType,
      status: "processing",
      total_records: rows.length,
      uploaded_by: user?.name || "Admin",
    }).select().single();

    if (insertErr || !uploadRecord) {
      toast.error("Failed to create upload record");
      setUploading(false);
      return;
    }

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
    // Get all data keys from first record
    const dataKeys = Object.keys(errorData[0]?.data || {});
    // Headers: row number, all data columns, then error columns
    const csvHeaders = ["Row", ...dataKeys];

    // Find max number of errors across all rows
    const maxErrors = Math.max(...errorData.map((e: any) => Array.isArray(e.errors) ? e.errors.length : 1));
    for (let i = 1; i <= maxErrors; i++) {
      csvHeaders.push(`Error_${i}`);
    }

    const csvRows = errorData.map((e: any) => {
      const vals = [
        String(e.row),
        ...dataKeys.map(k => String(e.data?.[k] ?? "")),
      ];
      const errs = Array.isArray(e.errors) ? e.errors : [e.errors];
      for (let i = 0; i < maxErrors; i++) {
        vals.push(errs[i] || "");
      }
      return vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [csvHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errors_${upload.file_name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-success" />;
    if (status === "processing") return <Clock className="h-4 w-4 text-warning animate-spin" />;
    if (status === "failed") return <X className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">File Uploads</h1>
        <p className="page-description">Bulk upload products, customers, and vendors via CSV. Products support create (leave ID blank) and update (provide existing ID).</p>
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
        {uploadType === "product" && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-1">
            <p><strong>Product CSV supports:</strong> All product fields including images, SEO, pricing, and up to 5 attribute name/value pairs.</p>
            <p><strong>Create vs Update:</strong> Leave the <code className="bg-muted px-1 rounded">id</code> column empty to create new products. Provide an existing product ID to update.</p>
            <p><strong>Attributes:</strong> Use <code className="bg-muted px-1 rounded">attribute_name_1..5</code> and <code className="bg-muted px-1 rounded">attribute_value_1..5</code> columns. Attribute names must exist in the Attributes master.</p>
            <p><strong>Images:</strong> For multiple images in the <code className="bg-muted px-1 rounded">images</code> column, separate URLs with <code className="bg-muted px-1 rounded">|</code> (pipe).</p>
          </div>
        )}
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
