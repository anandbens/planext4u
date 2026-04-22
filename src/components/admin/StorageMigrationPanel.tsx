import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Play, RotateCw, CheckCircle2, AlertTriangle } from "lucide-react";

const SCOPES = [
  { key: "media_library", label: "Media Library", description: "Admin-uploaded files" },
  { key: "social_posts_media", label: "Social Posts (media JSON)", description: "All Socio post media arrays" },
  { key: "social_stories", label: "Social Stories", description: "Story media URLs" },
  { key: "social_messages", label: "Social Messages", description: "Direct-message attachments" },
  { key: "social_profiles", label: "Social Profiles (avatars)", description: "Socio profile photos" },
  { key: "social_audio", label: "Social Audio", description: "Cover art" },
  { key: "social_channels", label: "Social Channels", description: "Cover art" },
  { key: "social_highlights", label: "Social Highlights", description: "Cover art" },
  { key: "social_conversations", label: "Social Conversations", description: "Group photos" },
  { key: "products", label: "Products (scalar)", description: "image, thumbnail, banner, socio icon" },
  { key: "products_images", label: "Products (images JSON)", description: "Multi-image arrays" },
  { key: "product_variants", label: "Product Variants", description: "Variant images" },
  { key: "product_variant_images", label: "Variant Image Gallery", description: "Per-variant gallery" },
  { key: "services", label: "Services (scalar)", description: "Hero image" },
  { key: "services_images", label: "Services (images JSON)", description: "Gallery arrays" },
  { key: "categories", label: "Categories", description: "Image, icon, banners" },
  { key: "service_categories", label: "Service Categories", description: "Image, icon, banners" },
  { key: "vendors", label: "Vendors", description: "Background, shop photo" },
  { key: "vendor_applications", label: "Vendor Applications", description: "Onboarding artefacts" },
  { key: "service_vendors", label: "Service Vendors", description: "Background, shop photo" },
  { key: "banners", label: "Banners", description: "Desktop + mobile" },
  { key: "popup_banners", label: "Popup Banners", description: "Image" },
  { key: "homepage_banners", label: "Homepage Banners", description: "Media + mobile media" },
  { key: "homepage_section_items", label: "Homepage Sections", description: "Card images" },
  { key: "advertisements", label: "Advertisements", description: "Desktop + mobile creative" },
  { key: "splash_screens", label: "Splash Screens", description: "Image" },
  { key: "onboarding_screens", label: "Onboarding Screens", description: "Image" },
  { key: "vendor_onboarding_screens", label: "Vendor Onboarding", description: "Image" },
  { key: "customers", label: "Customer Photos", description: "Profile photos" },
  { key: "profiles", label: "Auth Profiles", description: "Avatar URL" },
  { key: "classified_ads", label: "Classifieds", description: "Image arrays" },
  { key: "properties_images", label: "Properties (images JSON)", description: "Listing photos" },
  { key: "properties_video", label: "Properties (video)", description: "Walkthrough video" },
  { key: "property_amenities", label: "Property Amenities", description: "Icons" },
  { key: "food_reviews_photos", label: "Food Review Photos", description: "Diner photo arrays" },
  { key: "complaints_images", label: "Complaint Images", description: "Photo arrays" },
  { key: "complaint_messages", label: "Complaint Attachments", description: "Per-message file" },
  { key: "support_ticket_messages", label: "Support Attachments", description: "Per-message file" },
  { key: "restaurants", label: "Restaurants", description: "Logo, cover, banner" },
  { key: "menu_items", label: "Menu Items", description: "Image" },
  { key: "menu_combos", label: "Menu Combos", description: "Image" },
  { key: "delivery_proofs", label: "Delivery Proofs", description: "POD photos" },
  { key: "service_bookings", label: "Service POD Photos", description: "Completion + customer" },
  { key: "video_ads", label: "Video Ads", description: "Video + thumbnail" },
  { key: "kyc_documents", label: "KYC Documents (private)", description: "→ private B2 bucket" },
  { key: "riders", label: "Rider KYC (private)", description: "→ private B2 bucket" },
];

type RunState = {
  running: boolean;
  remaining: number | null;
  migrated: number;
  errors: number;
  done: boolean;
};

export default function StorageMigrationPanel() {
  const [state, setState] = useState<Record<string, RunState>>({});
  const [allRunning, setAllRunning] = useState(false);

  const runScope = async (scope: string, runUntilZero = true) => {
    setState((s) => ({ ...s, [scope]: { running: true, remaining: s[scope]?.remaining ?? null, migrated: s[scope]?.migrated ?? 0, errors: s[scope]?.errors ?? 0, done: false } }));
    let totalMigrated = state[scope]?.migrated ?? 0;
    let totalErrors = state[scope]?.errors ?? 0;
    let remaining = -1;
    let safety = 0;
    try {
      do {
        const { data, error } = await supabase.functions.invoke("backfill-supabase-to-b2", {
          body: { scope, limit: 10 },
        });
        if (error) throw error;
        const r = data as { migrated: number; remaining: number; error_count: number; errors?: any[] };
        if (r.errors && r.errors.length) {
          console.warn(`[migrate ${scope}]`, r.errors);
        }
        totalMigrated += r.migrated || 0;
        totalErrors += r.error_count || 0;
        remaining = r.remaining ?? 0;
        setState((s) => ({ ...s, [scope]: { running: true, remaining, migrated: totalMigrated, errors: totalErrors, done: false } }));
        if (!runUntilZero) break;
        // Stop early if we're stuck (no progress and errors reported)
        if (r.migrated === 0 && r.error_count > 0 && remaining > 0) {
          throw new Error(`No progress — ${r.error_count} errors. Check edge logs.`);
        }
        safety++;
        if (safety > 500) throw new Error("Safety stop after 500 batches");
      } while (remaining > 0);

      setState((s) => ({ ...s, [scope]: { running: false, remaining, migrated: totalMigrated, errors: totalErrors, done: true } }));
      toast.success(`${scope}: migrated ${totalMigrated}${totalErrors ? `, ${totalErrors} error(s)` : ""}`);
    } catch (e: any) {
      setState((s) => ({ ...s, [scope]: { running: false, remaining, migrated: totalMigrated, errors: totalErrors + 1, done: false } }));
      toast.error(`${scope} failed: ${e.message || e}`);
    }
  };

  const runAll = async () => {
    setAllRunning(true);
    for (const s of SCOPES) {
      await runScope(s.key, true);
    }
    setAllRunning(false);
    toast.success("All scopes processed");
  };

  // Populate empty image URL columns from B2 folder structure
  const [populating, setPopulating] = useState<null | "preview" | "run" | "diagnose" | "overwrite">(null);
  const [diag, setDiag] = useState<any[] | null>(null);
  const [gapReport, setGapReport] = useState<any[] | null>(null);
  const populateFromB2 = async (opts: { dryRun?: boolean; overwrite?: boolean }) => {
    setPopulating(opts.overwrite ? "overwrite" : opts.dryRun ? "preview" : "run");
    try {
      const { data, error } = await supabase.functions.invoke("b2-populate-image-urls", {
        body: { scope: "all", dry_run: !!opts.dryRun, overwrite: !!opts.overwrite },
      });
      if (error) throw error;
      const r = data as { totals: any; results: any[] };
      console.log("[b2-populate-image-urls]", r);
      setGapReport(r.results || []);
      const t = r.totals || {};
      toast.success(
        `Folders: ${t.folders_found ?? 0} · Matched: ${t.matched_records ?? 0} · ` +
        `${opts.dryRun ? "Would update" : "Updated"}: ${t.updated ?? 0} · ` +
        `Missing in B2: ${t.db_rows_without_folder ?? 0} · No DB row: ${t.skipped_no_record ?? 0}` +
        (t.errors ? ` · ${t.errors} error(s)` : ""),
      );
    } catch (e: any) {
      toast.error(`Populate failed: ${e.message || e}`);
    } finally {
      setPopulating(null);
    }
  };

  const diagnoseB2 = async () => {
    setPopulating("diagnose");
    try {
      const { data, error } = await supabase.functions.invoke("b2-populate-image-urls", {
        body: { mode: "list_folders", scope: "all" },
      });
      if (error) throw error;
      console.log("[b2 list_folders]", data);
      setDiag((data as any).results || []);
      toast.success("Folder scan complete — see panel below");
    } catch (e: any) {
      toast.error(`Diagnose failed: ${e.message || e}`);
    } finally {
      setPopulating(null);
    }
  };

  // Generate carousel + product/service/category/vendor/customer/banner images via AI and upload to B2
  type SeedMode = "all" | "carousel" | "products" | "services" | "categories" | "vendors" | "customers" | "banners";
  const [seeding, setSeeding] = useState<null | SeedMode>(null);
  const seedMedia = async (mode: SeedMode, limit = 8) => {
    setSeeding(mode);
    try {
      const { data, error } = await supabase.functions.invoke("seed-homepage-media", {
        body: { mode, limit },
      });
      if (error) throw error;
      const r = data as {
        accepted?: boolean;
        message?: string;
        carousel_added?: number;
        products_updated?: number;
        services_updated?: number;
        categories_updated?: number;
        vendors_updated?: number;
        customers_updated?: number;
        banners_updated?: number;
        errors?: string[];
      };
      if (r.accepted) {
        toast.success(r.message || "Generation started in background. Refresh in 1–3 minutes.");
      } else {
        const parts: string[] = [];
        if (r.carousel_added) parts.push(`${r.carousel_added} carousel banners`);
        if (r.products_updated) parts.push(`${r.products_updated} products`);
        if (r.services_updated) parts.push(`${r.services_updated} services`);
        if (r.categories_updated) parts.push(`${r.categories_updated} categories`);
        if (r.vendors_updated) parts.push(`${r.vendors_updated} vendors`);
        if (r.customers_updated) parts.push(`${r.customers_updated} customer avatars`);
        if (r.banners_updated) parts.push(`${r.banners_updated} banners`);
        toast.success(parts.length ? `Added ${parts.join(", ")}` : "Nothing to seed (already populated)");
        if (r.errors?.length) {
          console.warn("[seed-homepage-media] errors", r.errors);
          toast.warning(`${r.errors.length} item(s) failed — see console`);
        }
      }
    } catch (e: any) {
      toast.error(`Seed failed: ${e.message || e}`);
    } finally {
      setSeeding(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Populate Image URLs from B2</h2>
            <p className="text-sm text-muted-foreground">
              Scans every <code>&lt;Prefix&gt;/&lt;ID&gt;/</code> folder in the public Backblaze
              bucket, picks the first image inside, and writes the URL to the matching record.
              Only fills empty columns — safe to re-run.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={diagnoseB2} disabled={!!populating} variant="outline" className="gap-2">
              {populating === "diagnose" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Diagnose folders
            </Button>
            <Button onClick={() => populateFromB2({ dryRun: true })} disabled={!!populating} variant="outline" className="gap-2">
              {populating === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Preview (dry run)
            </Button>
            <Button onClick={() => populateFromB2({})} disabled={!!populating} className="gap-2">
              {populating === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Populate now
            </Button>
            <Button onClick={() => populateFromB2({ overwrite: true })} disabled={!!populating} variant="destructive" className="gap-2">
              {populating === "overwrite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Force overwrite
            </Button>
          </div>
        </div>
        {diag && (
          <div className="mt-4 border-t border-border/50 pt-3 space-y-2">
            <p className="text-sm font-medium">B2 folder scan</p>
            <div className="grid gap-2 md:grid-cols-2 text-xs font-mono">
              {diag.map((d) => (
                <div key={d.scope} className="rounded border border-border/40 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{d.prefix}/</span>
                    <Badge variant={d.folder_count > 0 ? "secondary" : "outline"}>{d.folder_count ?? 0} folders</Badge>
                  </div>
                  {d.error ? (
                    <p className="text-destructive mt-1">{d.error}</p>
                  ) : (
                    <>
                      {d.sample_first?.length ? <p className="text-muted-foreground mt-1 truncate">first: {d.sample_first.join(", ")}</p> : null}
                      {d.sample_last?.length ? <p className="text-muted-foreground truncate">last: {d.sample_last.join(", ")}</p> : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {gapReport && (
          <div className="mt-4 border-t border-border/50 pt-3 space-y-2">
            <p className="text-sm font-medium">Coverage gap report (per scope)</p>
            <p className="text-xs text-muted-foreground">
              Records flagged "Missing in B2" have no folder under their prefix — populate cannot fill them.
              Use the AI seeders below or upload via Media Library to fix.
            </p>
            <div className="grid gap-2 md:grid-cols-2 text-xs">
              {gapReport.map((r: any) => {
                const stillMissing = r.db_records_missing_image ?? 0;
                const noFolder = r.db_rows_without_folder ?? 0;
                return (
                  <div key={r.scope} className="rounded border border-border/40 p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold font-mono">{r.prefix}/</span>
                      <div className="flex gap-1">
                        <Badge variant="outline">{r.folders_found ?? 0} folders</Badge>
                        <Badge variant={r.updated > 0 ? "secondary" : "outline"}>{r.updated ?? 0} updated</Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      DB total: <span className="font-mono">{r.db_records_total ?? 0}</span> ·
                      Still missing image: <span className="font-mono">{stillMissing}</span> ·
                      Missing in B2: <span className={`font-mono ${noFolder > 0 ? "text-warning" : ""}`}>{noFolder}</span>
                    </p>
                    {r.db_rows_without_folder_sample?.length ? (
                      <p className="text-muted-foreground font-mono truncate">
                        e.g. {r.db_rows_without_folder_sample.join(", ")}
                      </p>
                    ) : null}
                    {r.errors?.length ? <p className="text-destructive truncate">{r.errors[0]}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 border-primary/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Generate Images for Missing Records (AI → B2)</h2>
            <p className="text-sm text-muted-foreground">
              Generates AI images and uploads them to the same B2 folder structure
              (e.g. <code>Categories/&lt;id&gt;/</code>) so the populator continues to find them.
              Only fills records whose image columns are empty.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => seedMedia("carousel")} disabled={!!seeding} variant="outline" className="gap-2">
              {seeding === "carousel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Carousel
            </Button>
            <Button onClick={() => seedMedia("products", 8)} disabled={!!seeding} variant="outline" className="gap-2">
              {seeding === "products" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Products (×8)
            </Button>
            <Button onClick={() => seedMedia("services", 8)} disabled={!!seeding} variant="outline" className="gap-2">
              {seeding === "services" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Services (×8)
            </Button>
            <Button onClick={() => seedMedia("categories", 20)} disabled={!!seeding} variant="outline" className="gap-2">
              {seeding === "categories" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Categories (×20)
            </Button>
            <Button onClick={() => seedMedia("vendors", 20)} disabled={!!seeding} variant="outline" className="gap-2">
              {seeding === "vendors" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Vendors (×20)
            </Button>
            <Button onClick={() => seedMedia("customers", 50)} disabled={!!seeding} variant="outline" className="gap-2">
              {seeding === "customers" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Customer avatars (×50)
            </Button>
            <Button onClick={() => seedMedia("banners", 10)} disabled={!!seeding} variant="outline" className="gap-2">
              {seeding === "banners" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Banners (×10)
            </Button>
            <Button onClick={() => seedMedia("all", 20)} disabled={!!seeding} className="gap-2">
              {seeding === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Generate everything
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Migrate Supabase Storage → Backblaze B2</h2>
            <p className="text-sm text-muted-foreground">
              Copies every file referenced by these tables to B2 and rewrites the URLs in the database.
              Safe to re-run — already-migrated rows are skipped automatically.
            </p>
          </div>
          <Button onClick={runAll} disabled={allRunning} className="gap-2">
            {allRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Migrate everything
          </Button>
        </div>
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        {SCOPES.map((s) => {
          const st = state[s.key];
          return (
            <Card key={s.key} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{s.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {st?.done && <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Done</Badge>}
                  {st?.errors ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {st.errors}</Badge> : null}
                  <Button size="sm" variant="outline" onClick={() => runScope(s.key, true)} disabled={st?.running || allRunning}>
                    {st?.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              {st && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Migrated: <span className="font-mono">{st.migrated}</span>
                    {st.remaining !== null && <> · Remaining: <span className="font-mono">{st.remaining}</span></>}
                  </p>
                  {st.remaining !== null && st.migrated + st.remaining > 0 && (
                    <Progress value={(st.migrated / Math.max(st.migrated + st.remaining, 1)) * 100} className="h-1" />
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
