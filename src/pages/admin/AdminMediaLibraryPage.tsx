import { useState, useCallback, useRef, DragEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Image, Upload, Download, Trash2, Search, Eye, Copy, Filter,
  FileText, FolderOpen, Grid3X3, List, Loader2, X, Shield, CloudUpload,
} from "lucide-react";

const FOLDERS = [
  { value: "all", label: "All Files" },
  { value: "banners", label: "Banners" },
  { value: "category-images", label: "Category Images" },
  { value: "category-icons", label: "Category Icons" },
  { value: "product-images", label: "Product Images" },
  { value: "service-images", label: "Service Images" },
  { value: "vendor-logos", label: "Vendor Logos" },
  { value: "popup-banners", label: "Popup Banners" },
  { value: "onboarding", label: "Onboarding" },
  { value: "general", label: "General" },
];

const FILE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "image", label: "Images" },
  { value: "application/pdf", label: "PDF" },
];

type MediaItem = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  folder: string | null;
  alt_text: string | null;
  tags: string[] | null;
  created_at: string;
};

export default function AdminMediaLibraryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("library");
  const [folder, setFolder] = useState("all");
  const [fileType, setFileType] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragUploadFolder, setDragUploadFolder] = useState("general");
  const dragCounter = useRef(0);

  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ["adminMediaLibrary", folder, fileType, search],
    queryFn: async () => {
      let q = supabase.from("media_library").select("*").order("created_at", { ascending: false });
      if (folder !== "all") q = q.eq("folder", folder);
      if (fileType !== "all") {
        if (fileType === "image") q = q.like("file_type", "image%");
        else q = q.eq("file_type", fileType);
      }
      if (search) q = q.ilike("file_name", `%${search}%`);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data || []) as MediaItem[];
    },
  });

  // KYC documents
  const { data: kycDocs = [] } = useQuery({
    queryKey: ["adminKycDocs"],
    enabled: tab === "kyc",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const uploadFiles = async (files: File[], targetFolder: string) => {
    setUploading(true);
    let successCount = 0;
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${targetFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("vendor-assets")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadErr) { toast.error(`Failed: ${file.name}`); continue; }

        const { data: urlData } = supabase.storage.from("vendor-assets").getPublicUrl(path);
        await supabase.from("media_library").insert({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          folder: targetFolder,
          alt_text: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        });
        successCount++;
      }
      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded to ${targetFolder}`);
        qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    await uploadFiles(Array.from(files), folder === "all" ? "general" : folder);
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (!files.length) { toast.error("No valid image files found"); return; }
    await uploadFiles(files, dragUploadFolder);
  }, [dragUploadFolder]);

  const handleDelete = async (item: MediaItem) => {
    const { error } = await supabase.from("media_library").delete().eq("id", item.id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("File deleted");
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.click();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const renderKycPreview = (url: string | null) => {
    if (!url) return <div className="h-20 w-20 bg-secondary/50 rounded flex items-center justify-center"><FileText className="h-6 w-6 text-muted-foreground" /></div>;
    if (url.includes(".pdf")) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="h-20 w-20 bg-secondary/50 rounded flex flex-col items-center justify-center gap-1 hover:bg-secondary">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-[9px] text-muted-foreground">PDF</span>
        </a>
      );
    }
    return <img src={url} alt="KYC" className="h-20 w-20 object-cover rounded cursor-pointer border border-border/50 hover:border-primary" onClick={() => { setSelected({ id: "", file_name: "KYC Doc", file_url: url, file_type: "image", file_size: null, folder: "kyc", alt_text: "", tags: null, created_at: "" }); setPreviewOpen(true); }} />;
  };

  // Folder stats
  const folderStats = FOLDERS.filter(f => f.value !== "all").map(f => ({
    ...f,
    count: mediaItems.length > 0 && folder === "all" ? mediaItems.filter(m => m.folder === f.value).length : 0,
  }));

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Media Library</h1>
        <p className="page-description">Manage all uploaded images, icons, and documents. Drag & drop files anywhere to upload.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="library" className="gap-2"><Image className="h-4 w-4" /> Media Files</TabsTrigger>
          <TabsTrigger value="kyc" className="gap-2"><Shield className="h-4 w-4" /> KYC Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative"
          >
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                <CloudUpload className="h-12 w-12 text-primary animate-bounce" />
                <p className="text-lg font-semibold text-primary">Drop files to upload</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Upload to:</span>
                  <Select value={dragUploadFolder} onValueChange={setDragUploadFolder}>
                    <SelectTrigger className="w-40 h-8 bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOLDERS.filter(f => f.value !== "all").map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 items-center flex-wrap">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-52 h-9" />
                </div>
                <Select value={folder} onValueChange={setFolder}>
                  <SelectTrigger className="w-44 h-9"><FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOLDERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger className="w-36 h-9"><Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
                <label>
                  <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={handleUpload} disabled={uploading} />
                  <Button asChild disabled={uploading} className="gap-2 h-9">
                    <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Drag upload folder selector */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Drag & drop target folder:</span>
              <Select value={dragUploadFolder} onValueChange={setDragUploadFolder}>
                <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLDERS.filter(f => f.value !== "all").map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-wrap mt-3">
              <Badge variant="outline" className="text-xs">{mediaItems.length} files</Badge>
              <Badge variant="outline" className="text-xs">{formatSize(mediaItems.reduce((s, m) => s + (m.file_size || 0), 0))} total</Badge>
              {folder === "all" && folderStats.filter(f => f.count > 0).map(f => (
                <Badge key={f.value} variant="secondary" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => setFolder(f.value)}>
                  {f.label}: {f.count}
                </Badge>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : mediaItems.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl mt-4">
                <CloudUpload className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No files found</p>
                <p className="text-sm mt-1">Drag & drop files here or click Upload</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-4">
                {mediaItems.map((item) => (
                  <Card key={item.id} className={`overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all ${selected?.id === item.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => { setSelected(item); setPreviewOpen(true); }}>
                    <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                      {item.file_type.startsWith("image") ? (
                        <img src={item.file_url} alt={item.alt_text || item.file_name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{item.file_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{formatSize(item.file_size)}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{item.folder || "general"}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-1 mt-4">
                {mediaItems.map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${selected?.id === item.id ? "bg-accent" : ""}`}
                    onClick={() => { setSelected(item); setPreviewOpen(true); }}>
                    <div className="h-12 w-12 rounded bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                      {item.file_type.startsWith("image") ? (
                        <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file_name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{item.folder || "general"}</Badge>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyUrl(item.file_url); }}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); downloadFile(item.file_url, item.file_name); }}><Download className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">KYC Document Submissions</h3>
            <Badge variant="outline">{kycDocs.length} documents</Badge>
          </div>
          {kycDocs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No KYC documents submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kycDocs.map((doc: any) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex gap-2">
                      {renderKycPreview(doc.front_image_url)}
                      {renderKycPreview(doc.back_image_url)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">User: {doc.user_id}</p>
                        <Badge variant={doc.status === "approved" ? "default" : doc.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">{doc.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Type: {doc.document_type?.toUpperCase()} · No: {doc.document_number ? "XXXX" + doc.document_number.slice(-4) : "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Submitted: {new Date(doc.created_at).toLocaleString()}</p>
                      {doc.rejection_reason && <p className="text-xs text-destructive mt-1">Reason: {doc.rejection_reason}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {doc.front_image_url && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => downloadFile(doc.front_image_url, `kyc-front-${doc.user_id}`)}>
                          <Download className="h-3 w-3" /> Front
                        </Button>
                      )}
                      {doc.back_image_url && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => downloadFile(doc.back_image_url, `kyc-back-${doc.user_id}`)}>
                          <Download className="h-3 w-3" /> Back
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {selected?.file_name || "Preview"}
          </DialogTitle>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-secondary/20 flex items-center justify-center max-h-[60vh]">
                {selected.file_type.startsWith("image") ? (
                  <img src={selected.file_url} alt={selected.alt_text || ""} className="max-w-full max-h-[60vh] object-contain" />
                ) : (
                  <div className="py-20 text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">PDF Document</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">File Name</Label><p className="font-medium truncate">{selected.file_name}</p></div>
                <div><Label className="text-xs text-muted-foreground">Folder</Label><p className="font-medium">{selected.folder || "general"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Size</Label><p className="font-medium">{formatSize(selected.file_size)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><p className="font-medium">{selected.file_type}</p></div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => copyUrl(selected.file_url)}><Copy className="h-3.5 w-3.5" /> Copy URL</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadFile(selected.file_url, selected.file_name)}><Download className="h-3.5 w-3.5" /> Download</Button>
                {selected.id && (
                  <Button variant="destructive" size="sm" className="gap-1" onClick={() => { handleDelete(selected); setPreviewOpen(false); }}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
