/**
 * HomepageRenderer
 *
 * Loads the active layout for a module and renders each visible section using
 * the widget registry. Renders nothing while loading (parent pages keep their
 * own placeholders) and silently skips unknown widget types.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWidget, WidgetModule } from "./widget-registry";
// Side-effect import: registers every widget at module load time
import "./widgets";

export function HomepageRenderer({ module, layoutName = "default" }: { module: WidgetModule; layoutName?: string }) {
  const { data: layout } = useQuery({
    queryKey: ["homepage_layout", module, layoutName],
    queryFn: async () => {
      const { data: l } = await supabase.from("homepage_layouts" as any)
        .select("id").eq("module", module).eq("name", layoutName).eq("is_active", true).maybeSingle();
      if (!l) return null;
      const { data: secs } = await supabase.from("homepage_layout_sections" as any)
        .select("*").eq("layout_id", (l as any).id).eq("is_visible", true).order("display_order");
      return { id: (l as any).id, sections: (secs || []) as any[] };
    },
  });

  if (!layout) return null;

  return (
    <>
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
