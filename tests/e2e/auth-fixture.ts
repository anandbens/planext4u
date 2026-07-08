/**
 * Playwright fixture that injects the Lovable-managed Supabase session
 * (customer portal by default) into the browser so authenticated flows can run.
 *
 * Env vars are populated by the Lovable sandbox when the user is signed in
 * via the preview. When AUTH_STATUS !== "injected", the fixture leaves the
 * page unauthenticated and tests using `authenticatedPage` are expected to
 * call `test.skip(!hasSession, ...)`.
 *
 * Portal selection: the Supabase client in src/integrations/supabase/client.ts
 * splits storage keys by portal (admin | vendor | customer). The env-provided
 * storage key targets ONE portal (whichever the user signed into last). For
 * multi-portal validation, sign in per portal on the preview between runs.
 */
import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";

type SessionEnv = {
  status: string;
  storageKey?: string;
  sessionJson?: string;
  cookiesJson?: string;
  accessToken?: string;
};

export function readSessionEnv(): SessionEnv {
  return {
    status: process.env.LOVABLE_BROWSER_AUTH_STATUS || "no_supabase",
    storageKey: process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY,
    sessionJson: process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON,
    cookiesJson: process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON,
    accessToken: process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN,
  };
}

export const hasInjectedSession = () => readSessionEnv().status === "injected";

/**
 * Attach cookies (for SSR clients) and localStorage (for classic SPA client)
 * so both auth code paths pick up the Supabase session on next navigation.
 * MUST be called after navigating to a localhost origin at least once.
 */
export async function restoreSession(context: BrowserContext, page: Page) {
  const env = readSessionEnv();
  if (env.status !== "injected") return false;

  if (env.cookiesJson) {
    try {
      const cookies = JSON.parse(env.cookiesJson);
      for (const c of cookies) c.url = BASE_URL;
      await context.addCookies(cookies);
    } catch {
      /* swallow — cookies are optional for the classic SPA client */
    }
  }

  // Establish localhost origin so the localStorage write lands on the correct origin.
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

  if (env.storageKey && env.sessionJson) {
    await page.evaluate(
      ({ k, v }) => window.localStorage.setItem(k, v),
      { k: env.storageKey, v: env.sessionJson },
    );
  }
  return true;
}

type Fixtures = {
  authenticatedPage: Page;
  networkLog: { url: string; method: string; status: number; ok: boolean }[];
};

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ context, page }, use) => {
    await restoreSession(context, page);
    await use(page);
  },
  networkLog: async ({ page }, use) => {
    const log: Fixtures["networkLog"] = [];
    page.on("response", (r) => {
      const url = r.url();
      // Only capture calls to Supabase (PostgREST + edge functions) — that's
      // where every mutation assertion lives.
      if (!/supabase\.co\/(rest|functions|auth)\//.test(url)) return;
      log.push({ url, method: r.request().method(), status: r.status(), ok: r.ok() });
    });
    await use(log);
  },
});

export { expect };
