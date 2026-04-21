/**
 * Homepage Widget Registry
 *
 * Each entry maps a `widget_type` (stored in homepage_layout_sections.widget_type)
 * to a small spec used by:
 *   • Admin layout builder — to list available widgets and render config fields
 *   • HomepageRenderer — to know which React component to render for each section
 *
 * Widgets fetch their own data so the renderer stays simple.
 */
import { ReactNode } from "react";

export type WidgetModule = "ecommerce" | "food" | "homes" | "socio";

export type WidgetConfigField =
  | { key: string; label: string; type: "text" | "number" | "url" }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] };

export interface WidgetSpec {
  type: string;
  label: string;
  description: string;
  modules: WidgetModule[];
  /** category shown in the admin "add widget" picker */
  group: "Banners & promos" | "Catalog" | "Vendor & social" | "Content" | "Module hero" | "Module specific";
  /** config fields editable in admin */
  fields?: WidgetConfigField[];
  /** Render the widget. `config` is the raw JSON blob from DB. */
  render: (props: { id: string; title?: string; config: Record<string, any> }) => ReactNode;
}

// Lazy import map — populated by registerWidget below
const REGISTRY: Record<string, WidgetSpec> = {};

export function registerWidget(spec: WidgetSpec) {
  REGISTRY[spec.type] = spec;
}

export function getWidget(type: string): WidgetSpec | undefined {
  return REGISTRY[type];
}

export function listWidgetsForModule(module: WidgetModule): WidgetSpec[] {
  return Object.values(REGISTRY).filter((w) => w.modules.includes(module));
}

export function listAllWidgets(): WidgetSpec[] {
  return Object.values(REGISTRY);
}
