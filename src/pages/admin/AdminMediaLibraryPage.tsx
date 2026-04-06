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
  FolderPlus, ArrowLeft, Video, FileArchive,
} from "lucide-react";

const DEFAULT_FOLDERS = [
  "banners", "category-images", "category-icons", "product-images",
  "service-images", "vendor-logos", "popup-banners", "onboarding", "general",
];

const FILE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
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
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [fileType, setFileType] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragUploadFolder, setDragUploadFolder] = useState("general");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [zipUploading, setZipUploading] = useState(false);
  const dragCounter = useRef(0);

  // Fetch ALL media to compute folder counts
  const { data: allMedia = [], isLoading } = useQuery({
    queryKey: ["adminMediaLibrary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media_library").select("*").order("created_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return (data || []) as MediaItem[];
    },
  });

  // Compute dynamic folders from DB
  const dynamicFolders = Array.from(new Set([
    ...DEFAULT_FOLDERS,
    ...allMedia.map(m => m.folder || "general"),
  ])).sort();

  const folderOptions = [
    { value: "all", label: "All Files" },
    ...dynamicFolders.map(f => ({ value: f, label: f.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })),
  ];

  // Filter media
  const mediaItems = allMedia.filter(m => {
    if (activeFolder && m.folder !== activeFolder) return false;
    if (fileType !== "all") {
      if (fileType === "image" && !m.file_type.startsWith("image")) return false;
      if (fileType === "video" && !m.file_type.startsWith("video")) return false;
      if (fileType === "application/pdf" && m.file_type !== "application/pdf") return false;
    }
    if (search && !m.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Folder stats
  const folderStats = dynamicFolders.map(f => ({
    value: f,
    label: f.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    count: allMedia.filter(m => (m.folder || "general") === f).length,
  })).filter(f => f.count > 0).sort((a, b) => b.count - a.count);

  // KYC documents
  const { data: kycDocs = [] } = useQuery({
    queryKey: ["adminKycDocs"],
    enabled: tab === "kyc",
    queryFn: async () => {
      const { data, error } = await supabase.from("kyc_documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const uploadFiles = async (files: File[], targetFolder: string) => {
    setUploading(true);
    let successCount = 0;
    const MAX_VIDEO_SIZE = 5 * 1024 * 1024; // 5MB
    try {
      for (const file of files) {
        if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
          toast.error(`${file.name} exceeds 5MB video limit`);
          continue;
        }
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
    const target = activeFolder || "general";
    await uploadFiles(Array.from(files), target);
    e.target.value = "";
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".zip")) { toast.error("Please select a ZIP file"); return; }
    setZipUploading(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(file);
      const folderName = file.name.replace(/\.zip$/i, "").replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
      const entries: File[] = [];
      const promises: Promise<void>[] = [];
      zip.forEach((relativePath, entry) => {
        if (entry.dir) return;
        const ext = relativePath.split(".").pop()?.toLowerCase() || "";
        if (!["jpg", "jpeg", "png", "gif", "webp", "svg", "mp4", "webm", "pdf"].includes(ext)) return;
        promises.push(
          entry.async("blob").then(blob => {
            const mimeMap: Record<string, string> = {
              jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
              webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
            };
            const f = new File([blob], relativePath.split("/").pop() || entry.name, { type: mimeMap[ext] || "application/octet-stream" });
            entries.push(f);
          })
        );
      });
      await Promise.all(promises);
      if (entries.length === 0) { toast.error("No valid files found in ZIP"); return; }
      await uploadFiles(entries, folderName);
      toast.success(`Extracted ${entries.length} files into folder "${folderName}"`);
    } catch (err: any) {
      toast.error("Failed to process ZIP: " + (err.message || ""));
    } finally {
      setZipUploading(false);
      e.target.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith("image/") || f.type.startsWith("video/") || f.type === "application/pdf"
    );
    if (!files.length) { toast.error("No valid files found"); return; }
    await uploadFiles(files, activeFolder || dragUploadFolder);
  }, [activeFolder, dragUploadFolder]);

  const handleDelete = async (item: MediaItem) => {
    const { error } = await supabase.from("media_library").delete().eq("id", item.id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("File deleted");
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
  };

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast.success("URL copied"); };
  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; a.click();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const createFolder = () => {
    const name = newFolderName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    if (!name) { toast.error("Enter a folder name"); return; }
    if (dynamicFolders.includes(name)) { toast.error("Folder already exists"); return; }
    // We don't need to create it in DB - it'll appear when files are uploaded
    setActiveFolder(name);
    setShowNewFolderDialog(false);
    setNewFolderName("");
    toast.success(`Folder "${name}" created. Upload files to populate it.`);
  };

  const renderKycPreview = (url: string | null) => {
    if (!url) return <div className="h-20 w-20 bg-secondary/50 rounded flex items-center justify-center"><FileText className="h-6 w-6 text-muted-foreground" /></div>;
    if (url.includes(".pdf")) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="h-20 w-20 bg-secondary/50 rounded flex flex-col items-center justify-center gap-1 hover:bg-secondary">
          <FileText className="h-6 w-6 text-primary" /><span className="text-[9px] text-muted-foreground">PDF</span>
        </a>
      );
    }
    return <img src={url} alt="KYC" className="h-20 w-20 object-cover rounded cursor-pointer border border-border/50 hover:border-primary" onClick={() => { setSelected({ id: "", file_name: "KYC Doc", file_url: url, file_type: "image", file_size: null, folder: "kyc", alt_text: "", tags: null, created_at: "" }); setPreviewOpen(true); }} />;
  };

  const renderMediaThumbnail = (item: MediaItem, className = "w-full h-full object-cover") => {
    if (item.file_type.startsWith("image")) return <img src={item.file_url} alt={item.alt_text || item.file_name} className={className} loading="lazy" />;
    if (item.file_type.startsWith("video")) return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/50">
        <Video className="h-8 w-8 text-primary" />
        <span className="text-[9px] text-muted-foreground mt-1">Video</span>
      </div>
    );
    return <FileText className="h-10 w-10 text-muted-foreground" />;
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Media Library</h1>
        <p className="page-description">Manage all uploaded images, videos, and documents. Drag & drop files anywhere to upload.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="library" className="gap-2"><Image className="h-4 w-4" /> Media Files</TabsTrigger>
          <TabsTrigger value="kyc" className="gap-2"><Shield className="h-4 w-4" /> KYC Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
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
                <p className="text-sm text-muted-foreground">Target: {activeFolder || dragUploadFolder}</p>
              </div>
            )}

            {/* Folder View or File View */}
            {!activeFolder ? (
              <>
                {/* Folder Grid */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">Folders</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowNewFolderDialog(true)}>
                      <FolderPlus className="h-4 w-4" /> New Folder
                    </Button>
                    <label>
                      <input type="file" className="hidden" accept=".zip" onChange={handleZipUpload} disabled={zipUploading} />
                      <Button asChild variant="outline" size="sm" className="gap-2" disabled={zipUploading}>
                        <span>{zipUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />} Upload ZIP</span>
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {folderStats.map(f => (
                    <Card
                      key={f.value}
                      className="p-4 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
                      onClick={() => setActiveFolder(f.value)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FolderOpen className="h-10 w-10 text-primary/70 group-hover:text-primary transition-colors" />
                        <p className="text-xs font-medium text-center truncate w-full">{f.label}</p>
                        <Badge variant="secondary" className="text-[10px]">{f.count} files</Badge>
                      </div>
                    </Card>
                  ))}
                  {/* Empty folders (no files yet) */}
                  {dynamicFolders.filter(f => !folderStats.find(s => s.value === f)).map(f => (
                    <Card
                      key={f}
                      className="p-4 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group opacity-60"
                      onClick={() => setActiveFolder(f)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FolderOpen className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
                        <p className="text-xs font-medium text-center truncate w-full">{f.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                        <Badge variant="outline" className="text-[10px]">Empty</Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* All files summary */}
                <div className="flex gap-4 flex-wrap mt-6">
                  <Badge variant="outline" className="text-xs">{allMedia.length} total files</Badge>
                  <Badge variant="outline" className="text-xs">{formatSize(allMedia.reduce((s, m) => s + (m.file_size || 0), 0))} total</Badge>
                </div>
              </>
            ) : (
              <>
                {/* Files inside a folder */}
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex gap-2 items-center flex-wrap">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveFolder(null)}>
                      <ArrowLeft className="h-4 w-4" /> Folders
                    </Button>
                    <span className="text-sm font-semibold">/</span>
                    <span className="text-sm font-semibold">{activeFolder.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <div className="relative ml-4">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-48 h-9" />
                    </div>
                    <Select value={fileType} onValueChange={setFileType}>
                      <SelectTrigger className="w-32 h-9"><Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FILE_TYPES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
                    <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
                    <label>
                      <input type="file" className="hidden" multiple accept="image/*,video/*,.pdf" onChange={handleUpload} disabled={uploading} />
                      <Button asChild disabled={uploading} className="gap-2 h-9">
                        <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</span>
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap mt-2">
                  <Badge variant="outline" className="text-xs">{mediaItems.length} files</Badge>
                  <Badge variant="outline" className="text-xs">{formatSize(mediaItems.reduce((s, m) => s + (m.file_size || 0), 0))}</Badge>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : mediaItems.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl mt-4">
                    <CloudUpload className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No files in this folder</p>
                    <p className="text-sm mt-1">Drag & drop files here or click Upload</p>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-4">
                    {mediaItems.map((item) => (
                      <Card key={item.id} className={`overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all ${selected?.id === item.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => { setSelected(item); setPreviewOpen(true); }}>
                        <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                          {renderMediaThumbnail(item)}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium truncate">{item.file_name}</p>
                          <span className="text-[10px] text-muted-foreground">{formatSize(item.file_size)}</span>
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
                          {renderMediaThumbnail(item, "w-full h-full object-cover")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyUrl(item.file_url); }}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); downloadFile(item.file_url, item.file_name); }}><Download className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
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

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Create New Folder</DialogTitle>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Folder Name</Label>
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. gallery-images" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Use lowercase letters, numbers, hyphens only</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()}>Create</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
                ) : selected.file_type.startsWith("video") ? (
                  <video src={selected.file_url} controls className="max-w-full max-h-[60vh]" />
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
