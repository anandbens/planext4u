import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Upload, FolderPlus, Image, Trash2, Search, Video, MoreVertical, Pencil, FolderX } from "lucide-react";

export default function VendorMediaLibraryPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "";
  const qc = useQueryClient();
  const [folder, setFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const defaultFolders = ["products", "logos", "backgrounds", "icons", "general"];

  // Get unique folders from DB
  const { data: dbFolders = [] } = useQuery({
    queryKey: ["vendorFolders", vendorId],
    queryFn: async () => {
      const { data } = await supabase.from("media_library" as any).select("folder").eq("vendor_id", vendorId);
      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        const parts = (r.folder || "").split("/");
        if (parts.length >= 2) set.add(parts[parts.length - 1]);
      });
      return Array.from(set);
    },
    enabled: !!vendorId,
  });

  const allFolders = Array.from(new Set([...defaultFolders, ...dbFolders, ...(typeof localFolders !== 'undefined' ? localFolders : [])]));

  const { data: media } = useQuery({
    queryKey: ["vendorMedia", vendorId, folder, search],
    queryFn: async () => {
      let query = supabase.from("media_library" as any).select("*").eq("vendor_id", vendorId);
      if (folder !== "all") query = query.eq("folder", `vendor-${vendorId}/${folder}`);
      if (search) query = query.ilike("file_name", `%${search}%`);
      const { data } = await query.order("created_at", { ascending: false }).limit(100);
      return (data || []) as any[];
    },
    enabled: !!vendorId,
  });

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || !vendorId) return;
    setUploading(true);
    const targetFolder = folder === "all" ? "general" : folder;
    try {
      const { compressToWebP } = await import("@/lib/webp-compress");
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith("image/");
        const { blob, contentType } = isImage ? await compressToWebP(file) : { blob: file as Blob, contentType: file.type };
        const ext = isImage ? "webp" : file.name.split(".").pop() || "mp4";
        const path = `vendor-${vendorId}/${targetFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("vendor-assets").upload(path, blob, { contentType });
        if (uploadErr) { toast.error(uploadErr.message); continue; }
        const { data: { publicUrl } } = supabase.storage.from("vendor-assets").getPublicUrl(path);
        await supabase.from("media_library" as any).insert({
          file_name: file.name, file_url: publicUrl, file_type: isImage ? "image" : "video",
          file_size: blob.size, folder: `vendor-${vendorId}/${targetFolder}`, vendor_id: vendorId,
        } as any);
      }
      toast.success("Uploaded successfully");
      qc.invalidateQueries({ queryKey: ["vendorMedia"] });
      qc.invalidateQueries({ queryKey: ["vendorFolders"] });
    } finally { setUploading(false); }
  }, [vendorId, folder, qc]);

  const handleDelete = async (item: any) => {
    if (!confirm("Delete this file?")) return;
    const path = item.file_url.split("/vendor-assets/")[1];
    if (path) await supabase.storage.from("vendor-assets").remove([path]);
    await supabase.from("media_library" as any).delete().eq("id", item.id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["vendorMedia"] });
  };

  const [localFolders, setLocalFolders] = useState<string[]>([]);

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim().toLowerCase().replace(/\s+/g, '-');
    setLocalFolders(prev => [...prev, name]);
    setFolder(name);
    setNewFolderName("");
    setShowNewFolder(false);
    toast.success("Folder created");
  };

  const deleteFolder = async (folderName: string) => {
    if (!confirm(`Delete folder "${folderName}" and ALL its files?`)) return;
    const folderPath = `vendor-${vendorId}/${folderName}`;
    // Get all files in folder
    const { data: files } = await supabase.from("media_library" as any).select("id, file_url").eq("folder", folderPath).eq("vendor_id", vendorId);
    if (files && files.length > 0) {
      const storagePaths = (files as any[]).map((f: any) => f.file_url.split("/vendor-assets/")[1]).filter(Boolean);
      if (storagePaths.length > 0) await supabase.storage.from("vendor-assets").remove(storagePaths);
      const ids = (files as any[]).map((f: any) => f.id);
      await supabase.from("media_library" as any).delete().in("id", ids);
    }
    if (folder === folderName) setFolder("all");
    toast.success("Folder deleted");
    qc.invalidateQueries({ queryKey: ["vendorMedia"] });
    qc.invalidateQueries({ queryKey: ["vendorFolders"] });
  };

  const renameFolder = async () => {
    if (!renameValue.trim() || !renamingFolder) return;
    const oldPath = `vendor-${vendorId}/${renamingFolder}`;
    const newName = renameValue.trim().toLowerCase().replace(/\s+/g, '-');
    const newPath = `vendor-${vendorId}/${newName}`;
    await supabase.from("media_library" as any).update({ folder: newPath } as any).eq("folder", oldPath).eq("vendor_id", vendorId);
    if (folder === renamingFolder) setFolder(newName);
    setRenamingFolder(null);
    setRenameValue("");
    toast.success("Folder renamed");
    qc.invalidateQueries({ queryKey: ["vendorMedia"] });
    qc.invalidateQueries({ queryKey: ["vendorFolders"] });
  };

  return (
    <VendorLayout title="Media Library">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search files..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Folder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                {allFolders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            {folder !== "all" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setRenamingFolder(folder); setRenameValue(folder); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Rename Folder
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteFolder(folder)}>
                    <FolderX className="h-4 w-4 mr-2" /> Delete Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <Button variant="outline" onClick={() => setShowNewFolder(true)}><FolderPlus className="h-4 w-4 mr-1" /> New Folder</Button>
          <label>
            <Button asChild disabled={uploading}><span><Upload className="h-4 w-4 mr-1" /> Upload</span></Button>
            <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={(e) => handleUpload(e.target.files)} />
          </label>
        </div>

        {/* Drop zone */}
        <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center mb-6 hover:border-primary/30 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}>
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drag & drop files here or use the upload button</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(media || []).map((item: any) => (
            <Card key={item.id} className="relative group overflow-hidden">
              <div className="aspect-square bg-secondary/20 flex items-center justify-center">
                {item.file_type === "video" ? (
                  <Video className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-2">
                <p className="text-xs truncate">{item.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{item.folder?.split("/").pop()}</p>
              </div>
              <button onClick={() => handleDelete(item)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3 w-3" />
              </button>
            </Card>
          ))}
          {(!media || media.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No files yet. Upload your first file!</p>
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Create Folder</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label>Folder Name</Label><Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. banners" /></div>
            <Button className="w-full" onClick={createFolder}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!renamingFolder} onOpenChange={(o) => { if (!o) setRenamingFolder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Rename Folder</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label>New Name</Label><Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} /></div>
            <Button className="w-full" onClick={renameFolder}>Rename</Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
