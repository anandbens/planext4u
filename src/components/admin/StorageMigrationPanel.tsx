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
          body: { scope, limit: 50 },
        });
        if (error) throw error;
        const r = data as { migrated: number; remaining: number; error_count: number; errors?: any[] };
        totalMigrated += r.migrated;
        totalErrors += r.error_count || 0;
        remaining = r.remaining ?? 0;
        setState((s) => ({ ...s, [scope]: { running: true, remaining, migrated: totalMigrated, errors: totalErrors, done: false } }));
        if (!runUntilZero) break;
        safety++;
        if (safety > 200) throw new Error("Safety stop after 200 batches");
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

  return (
    <div className="space-y-4">
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
