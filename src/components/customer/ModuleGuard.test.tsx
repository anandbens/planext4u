/**
 * Module gating — UI-level tests.
 *
 * Verifies that <ModuleGuard /> hides the real children and renders the
 * Coming Soon screen when the matching `module_*_enabled` flag is `false`,
 * regardless of how the route was reached (direct URL, deep link, etc.).
 *
 * `useModuleStatus` is mocked at the hook boundary so we don't need a live
 * Supabase connection — the flag is the input, the rendered output is the
 * contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModuleGuard } from "@/components/customer/ModuleGuard";
import * as moduleStatusHook from "@/hooks/useModuleStatus";
import type { ModuleKey } from "@/hooks/useModuleStatus";

vi.mock("@/components/customer/CustomerLayout", () => ({
  // Strip the layout chrome so assertions focus on the gate itself.
  CustomerLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const REAL_TEXT = "REAL_MODULE_BODY_DO_NOT_RENDER_WHEN_DISABLED";

const renderGuard = (moduleKey: ModuleKey, enabled: boolean, route = "/") => {
  vi.spyOn(moduleStatusHook, "useModuleStatus").mockReturnValue({
    modules: {
      shop: true, socio: true, services: true,
      homes: true, classifieds: true, food: true,
      [moduleKey]: enabled,
    },
    isLoading: false,
  });

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <ModuleGuard moduleKey={moduleKey}>
          <div>{REAL_TEXT}</div>
        </ModuleGuard>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const MODULES: { key: ModuleKey; label: string; deepLink: string }[] = [
  { key: "services",    label: "Services",    deepLink: "/app/services" },
  { key: "homes",       label: "Find Home",   deepLink: "/app/find-home/abc-123" },
  { key: "classifieds", label: "Classifieds", deepLink: "/app/classifieds/xyz" },
  { key: "shop",        label: "Shop",        deepLink: "/app/browse" },
  { key: "socio",       label: "Socio",       deepLink: "/app/social/post/42" },
  { key: "food",        label: "Food",        deepLink: "/app/food/restaurant/9" },
];

describe("ModuleGuard", () => {
  beforeEach(() => vi.clearAllMocks());

  describe.each(MODULES)("$label module", ({ key, label, deepLink }) => {
    it(`renders the real page when ${key} is enabled`, () => {
      renderGuard(key, true, deepLink);
      expect(screen.getByText(REAL_TEXT)).toBeInTheDocument();
      expect(screen.queryByText(`${label} — Coming Soon`)).not.toBeInTheDocument();
    });

    it(`renders Coming Soon and never mounts the real page when ${key} is disabled (deep link: ${deepLink})`, () => {
      renderGuard(key, false, deepLink);
      expect(screen.queryByText(REAL_TEXT)).not.toBeInTheDocument();
      expect(screen.getByText(`${label} — Coming Soon`)).toBeInTheDocument();
    });

    it(`renders Coming Soon when reached via direct root URL with ${key} disabled`, () => {
      renderGuard(key, false, "/");
      expect(screen.queryByText(REAL_TEXT)).not.toBeInTheDocument();
      expect(screen.getByText(`${label} — Coming Soon`)).toBeInTheDocument();
    });
  });

  it("does not render the gated children while module status is still loading", () => {
    vi.spyOn(moduleStatusHook, "useModuleStatus").mockReturnValue({
      modules: {
        shop: true, socio: true, services: true,
        homes: true, classifieds: true, food: true,
      },
      isLoading: true,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ModuleGuard moduleKey="services">
            <div>{REAL_TEXT}</div>
          </ModuleGuard>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.queryByText(REAL_TEXT)).not.toBeInTheDocument();
  });
});
