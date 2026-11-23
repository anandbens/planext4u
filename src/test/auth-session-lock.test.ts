import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser authentication session coordination", () => {
  it("reads simultaneous sessions without acquiring or stealing browser locks", async () => {
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
        storageKey: "auth-lock-regression-admin",
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
});