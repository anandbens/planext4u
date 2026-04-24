import type { CSSProperties } from "react";

/**
 * Per-category cosmetic theming.
 *
 * Categories optionally carry `theme_color` and `theme_accent` HSL triplets
 * (e.g. "178 90% 32%") configured by admins via the Category modal. When a
 * shopper drills into a category, we surface those values as CSS variables
 * on a wrapper element so any descendant can opt in via:
 *
 *     style={{ background: 'hsl(var(--cat-primary, var(--primary)))' }}
 *
 * Subcategories without their own theme inherit from the resolved parent.
 */
export interface ThemeableCategory {
  id: string;
  parent_id?: string | null;
  theme_color?: string | null;
  theme_accent?: string | null;
}

/**
 * Resolve the theme for a category, falling back to its parent if the
 * subcategory has no theme of its own.
 */
export function resolveCategoryTheme(
  category: ThemeableCategory | null | undefined,
  parent: ThemeableCategory | null | undefined,
): { primary: string | null; accent: string | null } {
  const primary = category?.theme_color || parent?.theme_color || null;
  const accent = category?.theme_accent || parent?.theme_accent || null;
  return { primary, accent };
}

/**
 * Build the inline style object that exposes the theme as CSS variables.
 * Returns an empty object when no theme is set so we never override the
 * global primary unintentionally.
 */
export function categoryThemeStyle(theme: {
  primary: string | null;
  accent: string | null;
}): CSSProperties {
  const style: Record<string, string> = {};
  if (theme.primary) style["--cat-primary"] = theme.primary;
  if (theme.accent) style["--cat-accent"] = theme.accent;
  return style as CSSProperties;
}
