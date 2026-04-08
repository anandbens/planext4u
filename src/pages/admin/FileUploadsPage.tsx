import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Download, FileText, AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const PRODUCT_CSV_HEADERS = [
  "title","description","short_description","long_description","price","tax","discount","discount_type",
  "stock","sku","slug","product_type","category_name","subcategory_name","vendor_id","vendor_name",
  "emoji","image","thumbnail_image","banner_image","meta_title","meta_description",
  "parent_item_id","parent_item_name","status"
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
    sampleRow = ["Sample Product","Description here","Short desc","Long desc","999","18","10","percentage",
      "100","SKU-001","sample-product","simple","Electronics","Phones","VND-001","Vendor Name",
      "📦","","","","SEO Title","SEO Description","","","active"];
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
  let success = 0;
  let errors: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });

    const rowErrors: string[] = [];
    if (!record.title) rowErrors.push("title is required");
    if (!record.price || isNaN(Number(record.price))) rowErrors.push("price must be a valid number");
    if (!record.vendor_id) rowErrors.push("vendor_id is required");
    if (record.discount_type && !["fixed","percentage"].includes(record.discount_type)) rowErrors.push("discount_type must be 'fixed' or 'percentage'");

    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, data: record, errors: rowErrors.join("; ") });
      continue;
    }

    try {
      const id = `PRD-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
      const { error } = await supabase.from("products").insert({
        id,
        title: record.title,
        description: record.description || "",
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
        category_name: record.category_name || null,
        subcategory_name: record.subcategory_name || null,
        vendor_id: record.vendor_id,
        vendor_name: record.vendor_name || null,
        emoji: record.emoji || "📦",
        image: record.image || null,
        thumbnail_image: record.thumbnail_image || null,
        banner_image: record.banner_image || null,
        meta_title: record.meta_title || null,
        meta_description: record.meta_description || null,
        parent_item_id: record.parent_item_id || null,
        parent_item_name: record.parent_item_name || null,
        status: record.status || "active",
        max_points_redeemable: 0,
      } as any);
      if (error) throw error;
      success++;
    } catch (e: any) {
      errors.push({ row: i + 2, data: record, errors: e.message });
    }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: success,
    error_count: errors.length,
    error_log: errors,
    updated_at: new Date().toISOString(),
  }).eq("id", uploadId);
}

async function processCustomerUpload(rows: string[][], headers: string[], uploadId: string) {
  let success = 0;
  let errors: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};
    headers.forEach((h, j) => { record[h] = row[j] || ""; });

    const rowErrors: string[] = [];
    if (!record.name) rowErrors.push("name is required");
    if (!record.email || !validateEmail(record.email)) rowErrors.push("valid email is required");
    if (!record.mobile || !validateMobile(record.mobile)) rowErrors.push("valid 10-digit mobile number is required");

    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, data: record, errors: rowErrors.join("; ") });
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
      errors.push({ row: i + 2, data: record, errors: e.message });
    }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: success, error_count: errors.length, error_log: errors,
  }).eq("id", uploadId);
}

async function processVendorUpload(rows: string[][], headers: string[], uploadId: string) {
  let success = 0;
  let errors: any[] = [];

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
      errors.push({ row: i + 2, data: record, errors: rowErrors.join("; ") });
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
      errors.push({ row: i + 2, data: record, errors: e.message });
    }
  }

  await supabase.from("file_uploads" as any).update({
    status: errors.length > 0 ? "partial" : "completed",
    success_count: success, error_count: errors.length, error_log: errors,
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

    // Create upload record
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

    // Process in background
    const uploadId = (uploadRecord as any).id;
    if (uploadType === "product") processProductUpload(rows, headers, uploadId).then(fetchUploads);
    else if (uploadType === "customer") processCustomerUpload(rows, headers, uploadId).then(fetchUploads);
    else processVendorUpload(rows, headers, uploadId).then(fetchUploads);
  };

  const downloadErrors = (upload: any) => {
    if (!upload.error_log || upload.error_log.length === 0) return;
    const errorData = upload.error_log as any[];
    const headers = ["row", ...Object.keys(errorData[0]?.data || {}), "errors"];
    const csvRows = errorData.map((e: any) => [
      e.row, ...Object.values(e.data || {}), e.errors
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
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
        <p className="page-description">Bulk upload products, customers, and vendors via CSV</p>
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
        </div>
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
                          <Download className="h-3 w-3" /> Errors
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
