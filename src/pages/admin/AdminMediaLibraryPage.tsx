import { useState, useCallback, useRef, DragEvent, useMemo } from "react";
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
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  Image, Upload, Download, Trash2, Search, Eye, Copy, Filter,
  FileText, FolderOpen, Grid3X3, List, Loader2, X, Shield, CloudUpload,
  FolderPlus, ArrowLeft, Video, FileArchive, MoveRight, ChevronLeft, ChevronRight,
  CheckSquare, Square,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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

const FOLDERS_PER_PAGE = 18;
const FILES_PER_PAGE = 24;

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
  const [folderSearch, setFolderSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragUploadFolder, setDragUploadFolder] = useState("general");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [zipUploading, setZipUploading] = useState(false);
  const dragCounter = useRef(0);

  // Pagination
  const [folderPage, setFolderPage] = useState(1);
  const [filePage, setFilePage] = useState(1);

  // Move to folder
  const [moveItem, setMoveItem] = useState<MediaItem | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [moving, setMoving] = useState(false);

  // Delete folder
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const { data: allMedia = [], isLoading } = useQuery({
    queryKey: ["adminMediaLibrary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media_library").select("*").order("created_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return (data || []) as MediaItem[];
    },
  });

  const dynamicFolders = useMemo(() => Array.from(new Set([
    ...DEFAULT_FOLDERS,
    ...allMedia.map(m => m.folder || "general"),
  ])).sort(), [allMedia]);

  const folderStats = useMemo(() => {
    const counts: Record<string, number> = {};
    allMedia.forEach(m => { const f = m.folder || "general"; counts[f] = (counts[f] || 0) + 1; });
    return dynamicFolders.map(f => ({
      value: f,
      label: f.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      count: counts[f] || 0,
    }));
  }, [allMedia, dynamicFolders]);

  // Filtered folders for search
  const filteredFolders = useMemo(() => {
    if (!folderSearch.trim()) return folderStats;
    const q = folderSearch.toLowerCase();
    return folderStats.filter(f => f.value.includes(q) || f.label.toLowerCase().includes(q));
  }, [folderStats, folderSearch]);

  // Paginated folders
  const totalFolderPages = Math.max(1, Math.ceil(filteredFolders.length / FOLDERS_PER_PAGE));
  const paginatedFolders = filteredFolders.slice((folderPage - 1) * FOLDERS_PER_PAGE, folderPage * FOLDERS_PER_PAGE);

  // Filter media items inside active folder
  const mediaItems = useMemo(() => allMedia.filter(m => {
    if (activeFolder && m.folder !== activeFolder) return false;
    if (fileType !== "all") {
      if (fileType === "image" && !m.file_type.startsWith("image")) return false;
      if (fileType === "video" && !m.file_type.startsWith("video")) return false;
      if (fileType === "application/pdf" && m.file_type !== "application/pdf") return false;
    }
    if (search && !m.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allMedia, activeFolder, fileType, search]);

  // Paginated files
  const totalFilePages = Math.max(1, Math.ceil(mediaItems.length / FILES_PER_PAGE));
  const paginatedFiles = mediaItems.slice((filePage - 1) * FILES_PER_PAGE, filePage * FILES_PER_PAGE);

  // Reset pages on nav changes
  const openFolder = (f: string) => { setActiveFolder(f); setFilePage(1); setSearch(""); setFileType("all"); };
  const goBackToFolders = () => { setActiveFolder(null); setFilePage(1); };

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
    const MAX_VIDEO_SIZE = 5 * 1024 * 1024;
    try {
      const { compressToWebP } = await import("@/lib/webp-compress");
      for (const file of files) {
        if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
          toast.error(`${file.name} exceeds 5MB video limit`); continue;
        }
        const isImage = file.type.startsWith("image/");
        const { blob, contentType } = isImage ? await compressToWebP(file) : { blob: file as Blob, contentType: file.type };
        const ext = isImage ? "webp" : (file.name.split(".").pop() || "mp4");
        const path = `${targetFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("vendor-assets").upload(path, blob, { contentType, upsert: false });
        if (uploadErr) { toast.error(`Failed: ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("vendor-assets").getPublicUrl(path);
        await supabase.from("media_library").insert({
          file_name: file.name, file_url: urlData.publicUrl, file_type: contentType,
          file_size: blob.size, folder: targetFolder,
          alt_text: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        });
        successCount++;
      }
      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded to ${targetFolder}`);
        qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
      }
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    await uploadFiles(Array.from(files), activeFolder || "general");
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
        promises.push(entry.async("blob").then(blob => {
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
            webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
          };
          entries.push(new File([blob], relativePath.split("/").pop() || entry.name, { type: mimeMap[ext] || "application/octet-stream" }));
        }));
      });
      await Promise.all(promises);
      if (entries.length === 0) { toast.error("No valid files found in ZIP"); return; }
      await uploadFiles(entries, folderName);
      toast.success(`Extracted ${entries.length} files into folder "${folderName}"`);
    } catch (err: any) { toast.error("Failed to process ZIP: " + (err.message || "")); }
    finally { setZipUploading(false); e.target.value = ""; }
  };

  const handleDragEnter = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.items?.length) setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type === "application/pdf");
    if (!files.length) { toast.error("No valid files found"); return; }
    await uploadFiles(files, activeFolder || dragUploadFolder);
  }, [activeFolder, dragUploadFolder]);

  const handleDelete = async (item: MediaItem) => {
    const { error } = await supabase.from("media_library").delete().eq("id", item.id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("File deleted"); setSelected(null);
    qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
  };

  const handleMoveFile = async () => {
    if (!moveItem || !moveTarget) return;
    setMoving(true);
    if (moveItem.id === "__bulk__" && multiSelected.size > 0) {
      const ids = Array.from(multiSelected);
      const { error } = await supabase.from("media_library").update({ folder: moveTarget }).in("id", ids);
      setMoving(false);
      if (error) { toast.error("Bulk move failed"); return; }
      toast.success(`Moved ${ids.length} file(s) to ${moveTarget}`);
      setMoveItem(null); setMoveTarget(""); setMultiSelected(new Set()); setSelectMode(false);
      qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
      return;
    }
    const { error } = await supabase.from("media_library").update({ folder: moveTarget }).eq("id", moveItem.id);
    setMoving(false);
    if (error) { toast.error("Move failed"); return; }
    toast.success(`Moved to ${moveTarget}`);
    setMoveItem(null); setMoveTarget("");
    qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
  };

  const toggleSelect = (id: string) => {
    setMultiSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (multiSelected.size === paginatedFiles.length) setMultiSelected(new Set());
    else setMultiSelected(new Set(paginatedFiles.map(f => f.id)));
  };

  const openBulkMove = () => {
    if (multiSelected.size === 0) { toast.error("Select files first"); return; }
    setMoveItem({ id: "__bulk__", file_name: `${multiSelected.size} files`, file_url: "", file_type: "", file_size: null, folder: activeFolder, alt_text: null, tags: null, created_at: "" });
    setMoveTarget("");
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    setDeletingFolder(true);
    const folderItems = allMedia.filter(m => (m.folder || "general") === deleteFolderTarget);
    // Delete all media_library rows for that folder
    if (folderItems.length > 0) {
      const ids = folderItems.map(m => m.id);
      const { error } = await supabase.from("media_library").delete().in("id", ids);
      if (error) { toast.error("Failed to delete folder contents"); setDeletingFolder(false); return; }
    }
    setDeletingFolder(false);
    setDeleteFolderTarget(null);
    if (activeFolder === deleteFolderTarget) setActiveFolder(null);
    toast.success(`Folder "${deleteFolderTarget}" and ${folderItems.length} file(s) deleted`);
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
    setActiveFolder(name); setShowNewFolderDialog(false); setNewFolderName("");
    toast.success(`Folder "${name}" created. Upload files to populate it.`);
  };

  const renderKycPreview = (url: string | null) => {
    if (!url) return <div className="h-20 w-20 bg-secondary/50 rounded flex items-center justify-center"><FileText className="h-6 w-6 text-muted-foreground" /></div>;
    if (url.includes(".pdf")) return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="h-20 w-20 bg-secondary/50 rounded flex flex-col items-center justify-center gap-1 hover:bg-secondary">
        <FileText className="h-6 w-6 text-primary" /><span className="text-[9px] text-muted-foreground">PDF</span>
      </a>
    );
    return <img src={url} alt="KYC" className="h-20 w-20 object-cover rounded cursor-pointer border border-border/50 hover:border-primary" onClick={() => { setSelected({ id: "", file_name: "KYC Doc", file_url: url, file_type: "image", file_size: null, folder: "kyc", alt_text: "", tags: null, created_at: "" }); setPreviewOpen(true); }} />;
  };

  const renderMediaThumbnail = (item: MediaItem, className = "w-full h-full object-cover") => {
    if (item.file_type.startsWith("image")) return <img src={item.file_url} alt={item.alt_text || item.file_name} className={className} loading="lazy" />;
    if (item.file_type.startsWith("video")) return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/50">
        <Video className="h-8 w-8 text-primary" /><span className="text-[9px] text-muted-foreground mt-1">Video</span>
      </div>
    );
    return <FileText className="h-10 w-10 text-muted-foreground" />;
  };

  const PaginationControls = ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
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
          <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className="relative">
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                <CloudUpload className="h-12 w-12 text-primary animate-bounce" />
                <p className="text-lg font-semibold text-primary">Drop files to upload</p>
                <p className="text-sm text-muted-foreground">Target: {activeFolder || dragUploadFolder}</p>
              </div>
            )}

            {!activeFolder ? (
              <>
                {/* Folder View */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-base font-semibold">Folders</h3>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search folders..." value={folderSearch} onChange={e => { setFolderSearch(e.target.value); setFolderPage(1); }} className="pl-9 w-48 h-9" />
                    </div>
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
                  {paginatedFolders.map(f => (
                    <Card key={f.value} className="p-4 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group relative" onClick={() => openFolder(f.value)}>
                      <div className="flex flex-col items-center gap-2">
                        <FolderOpen className={`h-10 w-10 group-hover:text-primary transition-colors ${f.count > 0 ? "text-primary/70" : "text-muted-foreground"}`} />
                        <p className="text-xs font-medium text-center truncate w-full">{f.label}</p>
                        <Badge variant={f.count > 0 ? "secondary" : "outline"} className="text-[10px]">{f.count > 0 ? `${f.count} files` : "Empty"}</Badge>
                      </div>
                      {/* Delete folder button */}
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={e => { e.stopPropagation(); setDeleteFolderTarget(f.value); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Card>
                  ))}
                </div>

                <PaginationControls page={folderPage} totalPages={totalFolderPages} onPageChange={setFolderPage} />

                <div className="flex gap-4 flex-wrap mt-4">
                  <Badge variant="outline" className="text-xs">{allMedia.length} total files</Badge>
                  <Badge variant="outline" className="text-xs">{formatSize(allMedia.reduce((s, m) => s + (m.file_size || 0), 0))} total</Badge>
                </div>
              </>
            ) : (
              <>
                {/* Files inside a folder */}
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex gap-2 items-center flex-wrap">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={goBackToFolders}>
                      <ArrowLeft className="h-4 w-4" /> Folders
                    </Button>
                    <span className="text-sm font-semibold">/</span>
                    <span className="text-sm font-semibold">{activeFolder.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <div className="relative ml-4">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search files..." value={search} onChange={e => { setSearch(e.target.value); setFilePage(1); }} className="pl-9 w-48 h-9" />
                    </div>
                    <Select value={fileType} onValueChange={v => { setFileType(v); setFilePage(1); }}>
                      <SelectTrigger className="w-32 h-9"><Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                      <SelectContent>{FILE_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button variant={selectMode ? "secondary" : "outline"} size="sm" className="gap-1" onClick={() => { setSelectMode(!selectMode); setMultiSelected(new Set()); }}>
                      <CheckSquare className="h-4 w-4" /> {selectMode ? "Cancel Select" : "Select"}
                    </Button>
                    {selectMode && multiSelected.size > 0 && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={openBulkMove}>
                        <MoveRight className="h-4 w-4" /> Move {multiSelected.size} file(s)
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => setDeleteFolderTarget(activeFolder)}>
                      <Trash2 className="h-4 w-4" /> Delete Folder
                    </Button>
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

                {selectMode && mediaItems.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 p-2 bg-secondary/30 rounded-lg">
                    <Checkbox checked={multiSelected.size === paginatedFiles.length && paginatedFiles.length > 0} onCheckedChange={toggleSelectAll} />
                    <span className="text-xs text-muted-foreground">Select all on this page ({paginatedFiles.length})</span>
                    {multiSelected.size > 0 && <Badge variant="secondary" className="text-xs">{multiSelected.size} selected</Badge>}
                  </div>
                )}

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
                    {paginatedFiles.map(item => (
                      <Card key={item.id} className={`overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all ${multiSelected.has(item.id) ? "ring-2 ring-primary" : selected?.id === item.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => { if (selectMode) { toggleSelect(item.id); } else { setSelected(item); setPreviewOpen(true); } }}>
                        <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden relative">
                          {renderMediaThumbnail(item)}
                          {selectMode && (
                            <div className="absolute top-2 left-2 z-10">
                              <Checkbox checked={multiSelected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} className="bg-background/80 border-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{item.file_name}</p>
                            <span className="text-[10px] text-muted-foreground">{formatSize(item.file_size)}</span>
                          </div>
                          {!selectMode && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={e => { e.stopPropagation(); setMoveItem(item); setMoveTarget(""); }}>
                              <MoveRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 mt-4">
                    {paginatedFiles.map(item => (
                      <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${multiSelected.has(item.id) ? "bg-accent" : selected?.id === item.id ? "bg-accent" : ""}`}
                        onClick={() => { if (selectMode) { toggleSelect(item.id); } else { setSelected(item); setPreviewOpen(true); } }}>
                        {selectMode && (
                          <Checkbox checked={multiSelected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />
                        )}
                        <div className="h-12 w-12 rounded bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                          {renderMediaThumbnail(item, "w-full h-full object-cover")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                        {!selectMode && (
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Move" onClick={e => { e.stopPropagation(); setMoveItem(item); setMoveTarget(""); }}><MoveRight className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); copyUrl(item.file_url); }}><Copy className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); downloadFile(item.file_url, item.file_name); }}><Download className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(item); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <PaginationControls page={filePage} totalPages={totalFilePages} onPageChange={setFilePage} />
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
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No KYC documents submitted yet.</p>
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
                      {doc.front_image_url && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => downloadFile(doc.front_image_url, `kyc-front-${doc.user_id}`)}><Download className="h-3 w-3" /> Front</Button>}
                      {doc.back_image_url && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => downloadFile(doc.back_image_url, `kyc-back-${doc.user_id}`)}><Download className="h-3 w-3" /> Back</Button>}
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
              <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. gallery-images" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Use lowercase letters, numbers, hyphens only</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()}>Create</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <Dialog open={!!moveItem} onOpenChange={open => { if (!open) setMoveItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2"><MoveRight className="h-5 w-5" /> Move File</DialogTitle>
          {moveItem && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Move <strong>{moveItem.file_name}</strong> from <strong>{moveItem.folder || "general"}</strong> to:</p>
              <Select value={moveTarget} onValueChange={setMoveTarget}>
                <SelectTrigger><SelectValue placeholder="Select target folder" /></SelectTrigger>
                <SelectContent>
                  {dynamicFolders.filter(f => f !== (moveItem.folder || "general")).map(f => (
                    <SelectItem key={f} value={f}>{f.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMoveItem(null)}>Cancel</Button>
                <Button onClick={handleMoveFile} disabled={!moveTarget || moving}>
                  {moving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Move
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirm */}
      <ConfirmDialog
        open={!!deleteFolderTarget}
        onOpenChange={open => { if (!open) setDeleteFolderTarget(null); }}
        title="Delete Folder"
        description={`Are you sure you want to delete the folder "${deleteFolderTarget}" and all its contents (${allMedia.filter(m => (m.folder || "general") === deleteFolderTarget).length} files)? This action cannot be undone.`}
        confirmLabel="Delete Folder"
        variant="destructive"
        loading={deletingFolder}
        onConfirm={handleDeleteFolder}
      />

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> {selected?.file_name || "Preview"}</DialogTitle>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-secondary/20 flex items-center justify-center max-h-[60vh]">
                {selected.file_type.startsWith("image") ? (
                  <img src={selected.file_url} alt={selected.alt_text || ""} className="max-w-full max-h-[60vh] object-contain" />
                ) : selected.file_type.startsWith("video") ? (
                  <video src={selected.file_url} controls className="max-w-full max-h-[60vh]" />
                ) : (
                  <div className="py-20 text-center"><FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">PDF Document</p></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">File Name</Label><p className="font-medium truncate">{selected.file_name}</p></div>
                <div><Label className="text-xs text-muted-foreground">Folder</Label><p className="font-medium">{selected.folder || "general"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Size</Label><p className="font-medium">{formatSize(selected.file_size)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><p className="font-medium">{selected.file_type}</p></div>
              </div>
              <DialogFooter className="gap-2">
                {selected.id && <Button variant="outline" size="sm" className="gap-1" onClick={() => { setMoveItem(selected); setMoveTarget(""); setPreviewOpen(false); }}><MoveRight className="h-3.5 w-3.5" /> Move</Button>}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => copyUrl(selected.file_url)}><Copy className="h-3.5 w-3.5" /> Copy URL</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadFile(selected.file_url, selected.file_name)}><Download className="h-3.5 w-3.5" /> Download</Button>
                {selected.id && <Button variant="destructive" size="sm" className="gap-1" onClick={() => { handleDelete(selected); setPreviewOpen(false); }}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
