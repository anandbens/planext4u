import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FolderOpen, ArrowLeft, Loader2, Copy, ExternalLink, Download, RefreshCw, FileText, Video, ImagePlus,
} from "lucide-react";

type ListResp = {
  prefix: string;
  folders: string[];
  files: { key: string; size: number; lastModified: string; url: string }[];
  nextToken?: string;
};

function fmtSize(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export default function B2BucketBrowser() {
  const qc = useQueryClient();
  const [prefix, setPrefix] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["b2BucketList", prefix],
    queryFn: async (): Promise<ListResp> => {
      const { data, error } = await supabase.functions.invoke("b2-list-objects", {
        body: { mode: "list", prefix, maxKeys: 500 },
      });
      if (error) throw new Error(error.message);
      return data as ListResp;
    },
  });

  const goInto = (folder: string) => {
    setSelected(new Set());
    setPrefix(prefix ? `${prefix}${folder}/` : `${folder}/`);
  };
  const goUp = () => {
    setSelected(new Set());
    if (!prefix) return;
    const parts = prefix.replace(/\/$/, "").split("/");
    parts.pop();
    setPrefix(parts.length ? parts.join("/") + "/" : "");
  };

  const toggle = (key: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };
  const selectAll = () => {
    if (!data) return;
    if (selected.size === data.files.length) setSelected(new Set());
    else setSelected(new Set(data.files.map((f) => f.key)));
  };

  const importSelected = async () => {
    if (selected.size === 0) { toast.error("Select at least one file"); return; }
    setImporting(true);
    try {
      const folderName = (prefix.replace(/\/$/, "").split("/").pop() || "b2-import").toLowerCase();
      const { data: r, error } = await supabase.functions.invoke("b2-list-objects", {
        body: { mode: "import", keys: Array.from(selected), folder: folderName },
      });
      if (error) throw new Error(error.message);
      const res = r as { imported: number; skipped: number; errors: string[] };
      toast.success(`Imported ${res.imported} · Skipped ${res.skipped}${res.errors.length ? ` · ${res.errors.length} error(s)` : ""}`);
      if (res.errors.length) console.warn("[b2 import errors]", res.errors);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["adminMediaLibrary"] });
    } catch (e: any) {
      toast.error(`Import failed: ${e.message || e}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" disabled={!prefix} onClick={goUp} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Up
        </Button>
        <Input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="Browse path (e.g. Products/, Vendors/115/)"
          className="max-w-md h-9"
        />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
        </Button>
        <Badge variant="outline" className="ml-auto">/{prefix || "(root)"}</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Folders */}
          {data && data.folders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Folders ({data.folders.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.folders.map((f) => (
                  <Card key={f} className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    onClick={() => goInto(f)}>
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="h-9 w-9 text-primary/70" />
                      <p className="text-xs font-medium truncate w-full text-center">{f}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {data && data.files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-muted-foreground">Files ({data.files.length})</h4>
                <div className="flex items-center gap-2">
                  <Checkbox checked={selected.size === data.files.length && data.files.length > 0} onCheckedChange={selectAll} />
                  <span className="text-xs text-muted-foreground">Select all</span>
                  <Button size="sm" disabled={selected.size === 0 || importing} onClick={importSelected} className="gap-1">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    Import {selected.size > 0 ? `(${selected.size})` : ""} to Media Library
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.files.map((f) => {
                  const isImage = /\.(jpe?g|png|gif|webp|svg)$/i.test(f.key);
                  const isVideo = /\.(mp4|webm|mov)$/i.test(f.key);
                  const isChecked = selected.has(f.key);
                  const name = f.key.split("/").pop() || f.key;
                  return (
                    <Card key={f.key} className={`overflow-hidden group relative ${isChecked ? "ring-2 ring-primary" : ""}`}>
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggle(f.key)}
                          className="bg-background/80 border-foreground/50" />
                      </div>
                      <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={() => toggle(f.key)}>
                        {isImage ? (
                          <img src={f.url} alt={name} className="w-full h-full object-cover" loading="lazy"
                            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                        ) : isVideo ? (
                          <div className="flex flex-col items-center gap-1"><Video className="h-8 w-8 text-primary" /><span className="text-[9px]">Video</span></div>
                        ) : (
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate" title={name}>{name}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtSize(f.size)}</p>
                        <div className="flex gap-1 mt-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" title="Copy URL"
                            onClick={() => { navigator.clipboard.writeText(f.url); toast.success("URL copied"); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button asChild size="icon" variant="ghost" className="h-6 w-6" title="Open">
                            <a href={f.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                          </Button>
                          <Button asChild size="icon" variant="ghost" className="h-6 w-6" title="Download">
                            <a href={f.url} download={name}><Download className="h-3 w-3" /></a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {data && data.folders.length === 0 && data.files.length === 0 && (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>This B2 path is empty</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
