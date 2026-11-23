import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser authentication session coordination", () => {
  it.each(["admin", "customer", "vendor", "rider"])("reads simultaneous %s sessions without acquiring or stealing browser locks", async (portal) => {
    const request = vi.fn(() => Promise.reject(
      new Error('Lock "auth-token-admin" was released because another request stole it'),
    ));
    vi.stubGlobal("navigator", { locks: { request } });
    const storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    const client = createClient("https://auth-test.invalid", "test-public-key", {
      auth: {
        storage,
        storageKey: `auth-lock-regression-${portal}`,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    try {
      const results = await Promise.all([
        client.auth.getSession(),
        client.auth.getSession(),
        client.auth.getSession(),
      ]);
      for (const result of results) {
        expect(result.error).toBeNull();
        expect(result.data.session).toBeNull();
      }
      expect(request).not.toHaveBeenCalled();
    } finally {
      client.auth.stopAutoRefresh();
    }
  });

  it.each(["password", "otp"] as const)("supports %s login, background refresh, and logout without browser locks", async (method) => {
    const request = vi.fn(() => Promise.reject(new Error("Authentication lock stolen")));
    vi.stubGlobal("navigator", { locks: { request } });
    const values = new Map<string, string>();
    const user = {
      id: "00000000-0000-4000-8000-000000000001",
      aud: "authenticated", role: "authenticated", email: "test@example.invalid",
      app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z",
    };
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/logout")) return new Response(null, { status: 204 });
      return new Response(JSON.stringify({
        access_token: "test-access-token", refresh_token: "test-refresh-token",
        token_type: "bearer", expires_in: 3600, user,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const client = createClient("https://auth-test.invalid", "test-public-key", {
      global: { fetch },
      auth: {
        storage: {
          getItem: (key) => values.get(key) ?? null,
          setItem: (key, value) => { values.set(key, value); },
          removeItem: (key) => { values.delete(key); },
        },
        storageKey: `auth-flow-regression-${method}`,
        persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      },
    });
    try {
      const result = method === "password"
        ? await client.auth.signInWithPassword({ email: user.email, password: "synthetic-test-only" })
        : await client.auth.verifyOtp({ token_hash: "synthetic-test-only", type: "magiclink" });
      expect(result.error).toBeNull();
      expect(result.data.user?.id).toBe(user.id);
      const [session, refresh] = await Promise.all([client.auth.getSession(), client.auth.refreshSession()]);
      expect(session.data.session?.user.id).toBe(user.id);
      expect(refresh.error).toBeNull();
      expect(refresh.data.session?.user.id).toBe(user.id);
      expect((await client.auth.signOut()).error).toBeNull();
      expect((await client.auth.getSession()).data.session).toBeNull();
      expect(fetch).toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
    } finally {
      client.auth.stopAutoRefresh();
    }
  });
});