import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Search, Check, X, Loader2, ImageIcon, FolderOpen, Grid3X3, List, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const FOLDERS = [
  { value: "all", label: "All Files" },
  { value: "banners", label: "Banners" },
  { value: "product-images", label: "Product Images" },
  { value: "service-images", label: "Service Images" },
  { value: "category-images", label: "Category Images" },
  { value: "category-icons", label: "Category Icons" },
  { value: "vendor-logos", label: "Vendor Logos" },
  { value: "popup-banners", label: "Popup Banners" },
  { value: "onboarding", label: "Onboarding" },
  { value: "general", label: "General" },
];

// Map legacy folder names to new ones
const FOLDER_ALIAS: Record<string, string> = {
  products: "product-images",
  services: "service-images",
  categories: "category-images",
  icons: "category-icons",
  vendors: "vendor-logos",
};

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  folder: string | null;
  alt_text: string | null;
  tags: string[] | null;
  created_at: string;
}

interface MediaLibraryPickerProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  aspectRatio?: string;
}

export function MediaLibraryPicker({
  value, onChange, folder = "general",
  label = "Select Image", disabled = false, className = "", aspectRatio = "aspect-video",
}: MediaLibraryPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      {value ? (
        <div className="relative group">
          <div className={`${aspectRatio} w-full rounded-lg overflow-hidden bg-secondary/20 border border-border/30`}>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
                Change
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onChange("")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`${aspectRatio} w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors`}
        >
          <ImageIcon className="h-6 w-6" />
          <span className="text-xs">{label}</span>
          <span className="text-[10px] opacity-60">Click to open Media Library</span>
        </button>
      )}

      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(url) => { onChange(url); setOpen(false); }}
        defaultFolder={folder}
      />
    </div>
  );
}

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  defaultFolder?: string;
}

export function MediaLibraryDialog({ open, onOpenChange, onSelect, defaultFolder = "general" }: MediaLibraryDialogProps) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const resolvedDefault = FOLDER_ALIAS[defaultFolder] || defaultFolder;
  const [folderFilter, setFolderFilter] = useState(resolvedDefault === "general" ? "all" : resolvedDefault);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadFolder, setUploadFolder] = useState(resolvedDefault);
  const [altText, setAltText] = useState("");
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string } | null>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("media_library").select("*").order("created_at", { ascending: false }).limit(200);
      if (folderFilter !== "all") query = query.eq("folder", folderFilter);
      if (search) query = query.ilike("file_name", `%${search}%`);
      const { data } = await query;
      setItems((data as MediaItem[]) || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [folderFilter, search]);

  useEffect(() => {
    if (open) { fetchMedia(); setSelectedItem(null); }
  }, [open, fetchMedia]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, WebP images allowed"); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("Image must be under 5MB"); return; }
    const preview = URL.createObjectURL(file);
    setPreviewFile({ file, preview });
    setAltText(file.name.split(".")[0].replace(/[-_]/g, " "));
    if (e.target) e.target.value = "";
  };

  const handleUpload = async () => {
    if (!previewFile) return;
    setUploading(true);
    try {
      const { file } = previewFile;
      const { compressToWebP } = await import("@/lib/webp-compress");
      const { blob, contentType } = await compressToWebP(file);
      const fileName = `${uploadFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      
      const { error } = await supabase.storage.from("media-library").upload(fileName, blob, { contentType, upsert: false });
      if (error) {
        // Try vendor-assets as fallback
        const { error: err2 } = await supabase.storage.from("vendor-assets").upload(fileName, blob, { contentType, upsert: false });
        if (err2) throw err2;
        const { data: urlData } = supabase.storage.from("vendor-assets").getPublicUrl(fileName);
        
        await supabase.from("media_library").insert({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type.startsWith("image") ? "image" : "file",
          file_size: blob.size,
          folder: uploadFolder,
          alt_text: altText,
          tags: [uploadFolder],
        } as any);
        
        toast.success("Image uploaded to media library");
        setPreviewFile(null);
        setAltText("");
        setTab("library");
        setFolderFilter(uploadFolder);
        fetchMedia();
        return;
      }

      const { data: urlData } = supabase.storage.from("media-library").getPublicUrl(fileName);
      
      await supabase.from("media_library").insert({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type.startsWith("image") ? "image" : "file",
        file_size: blob.size,
        folder: uploadFolder,
        alt_text: altText,
        tags: [uploadFolder],
      } as any);

      toast.success("Image uploaded to media library");
      setPreviewFile(null);
      setAltText("");
      setTab("library");
      setFolderFilter(uploadFolder);
      fetchMedia();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Media Library
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2">
            <TabsList className="grid grid-cols-2 w-48">
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden mt-0 px-6">
            {/* Filters */}
            <div className="flex items-center gap-3 py-3 border-b border-border/50">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLDERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex border border-border rounded-md">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("p-1.5 rounded-l-md", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("p-1.5 rounded-r-md", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground ml-auto">{items.length} files</span>
            </div>

            {/* Media Grid / List */}
            <ScrollArea className="flex-1 py-3">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">No media found</p>
                  <Button variant="link" size="sm" onClick={() => setTab("upload")}>Upload new</Button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-90",
                        selectedItem?.id === item.id ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                      )}
                    >
                      <img src={item.file_url} alt={item.alt_text || item.file_name} className="w-full h-full object-cover" loading="lazy" />
                      {selectedItem?.id === item.id && (
                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                        <p className="text-[9px] text-white truncate">{item.file_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left",
                        selectedItem?.id === item.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-secondary/50"
                      )}
                    >
                      <div className="h-10 w-10 rounded overflow-hidden shrink-0 bg-secondary/30">
                        <img src={item.file_url} alt={item.alt_text || ""} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.file_name}</p>
                        <p className="text-xs text-muted-foreground">{item.folder} · {formatSize(item.file_size)}</p>
                      </div>
                      {selectedItem?.id === item.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Selected item details */}
            {selectedItem && (
              <div className="border-t border-border/50 pt-3 pb-1 flex items-center gap-4">
                <div className="h-12 w-12 rounded overflow-hidden shrink-0">
                  <img src={selectedItem.file_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedItem.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedItem.folder} · {formatSize(selectedItem.file_size)} · {new Date(selectedItem.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-auto mt-0 px-6 py-4">
            <input ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileSelect} />
            
            {!previewFile ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center gap-3 py-16 cursor-pointer transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload or drag & drop</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 5MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-48 h-48 rounded-lg overflow-hidden bg-secondary/20 border border-border/30 shrink-0">
                    <img src={previewFile.preview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">File Name</Label>
                      <p className="text-sm font-medium mt-1">{previewFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(previewFile.file.size)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Folder *</Label>
                      <Select value={uploadFolder} onValueChange={setUploadFolder}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FOLDERS.filter(f => f.value !== "all").map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Alt Text</Label>
                      <Input value={altText} onChange={(e) => setAltText(e.target.value)} className="mt-1" placeholder="Describe the image..." />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setPreviewFile(null); setAltText(""); }}>Cancel</Button>
                  <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading..." : "Upload to Library"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 pb-6 pt-2 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => selectedItem && onSelect(selectedItem.file_url)}
            disabled={!selectedItem}
            className="gap-2"
          >
            <Check className="h-4 w-4" /> Select Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
