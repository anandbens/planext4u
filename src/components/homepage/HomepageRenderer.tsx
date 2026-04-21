/**
 * HomepageRenderer
 *
 * Loads the active layout for a module and renders each visible section.
 *
 * By default it renders the **published snapshot** (`homepage_layouts.published_snapshot`),
 * so admin edits in the builder don't go live until they click Publish.
 *
 * When the URL contains `?preview=draft` AND the current viewer is an admin
 * (admin / finance / sales role), the renderer falls back to the live draft
 * sections from `homepage_layout_sections` for an in-app preview.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWidget, WidgetModule } from "./widget-registry";
// Side-effect import: registers every widget at module load time
import "./widgets";

const ADMIN_ROLES = ["admin", "finance", "sales"] as const;

function useIsPreviewAdmin() {
  const wantsPreview = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "draft";
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!wantsPreview) { setAllowed(false); return; }
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { if (!cancelled) setAllowed(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .in("role", ADMIN_ROLES);
      if (!cancelled) setAllowed(!!roles && roles.length > 0);
    })();
    return () => { cancelled = true; };
  }, [wantsPreview]);
  return wantsPreview && allowed;
}

export function HomepageRenderer({ module, layoutName = "default" }: { module: WidgetModule; layoutName?: string }) {
  const previewDraft = useIsPreviewAdmin();

  const { data: layout } = useQuery({
    queryKey: ["homepage_layout", module, layoutName, previewDraft ? "draft" : "published"],
    queryFn: async () => {
      const { data: l } = await supabase.from("homepage_layouts" as any)
        .select("id, published_snapshot")
        .eq("module", module).eq("name", layoutName).eq("is_active", true).maybeSingle();
      if (!l) return null;

      // Preview mode: read live draft from sections table
      if (previewDraft) {
        const { data: secs } = await supabase.from("homepage_layout_sections" as any)
          .select("*").eq("layout_id", (l as any).id).eq("is_visible", true).order("display_order");
        return { id: (l as any).id, sections: (secs || []) as any[], isPreview: true };
      }

      // Default: render the published snapshot. Filter to visible sections only.
      const snapshot = ((l as any).published_snapshot || []) as any[];
      const visible = snapshot.filter((s) => s && s.is_visible !== false);
      return { id: (l as any).id, sections: visible, isPreview: false };
    },
  });

  if (!layout) return null;

  return (
    <>
      {previewDraft && (
        <div className="sticky top-0 z-50 bg-warning text-warning-foreground text-xs font-semibold text-center py-1.5 px-3 shadow-md">
          Preview mode — viewing unpublished draft
        </div>
      )}
      {layout.sections.map((s: any) => {
        const spec = getWidget(s.widget_type);
        if (!spec) return null;
        return (
          <div key={s.id} data-widget={s.widget_type}>
            {spec.render({ id: s.id, title: s.title || undefined, config: s.config || {} })}
          </div>
        );
      })}
    </>
  );
}
