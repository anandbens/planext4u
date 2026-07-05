import { useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/lib/auth-context";
import { logActivity } from "@/lib/activity-log";
import { initPushNotifications, linkPushTokenToUser } from "@/lib/push-notifications";
import { persistentStore } from "@/lib/storage-adapter";
import { stampSession, clearSessionStamp } from "@/lib/session-stamp";
import type { AuthUser, CustomerUser, VendorUser, UserRole, AppRole } from "@/lib/auth-types";

const ACTIVE_VENDOR_STATUSES = new Set(["active", "verified", "level2_approved", "approved"]);
const VENDOR_PROFILE_SELECT = "id, name, business_name, email, mobile, status";
const AUTH_QUERY_TIMEOUT_MS = 7000;
const AUTH_QUERY_RETRY_DELAY_MS = 700;

function isTransientAuthError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || error || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("connection") ||
    message.includes("544") ||
    message.includes("522") ||
    message.includes("503") ||
    message.includes("504")
  );
}

function authTimeoutError(label: string) {
  return Object.assign(new Error(`${label} timed out. Please try again in a moment.`), { code: "auth/query-timeout" });
}

async function withAuthTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs = AUTH_QUERY_TIMEOUT_MS): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(authTimeoutError(label)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

async function withAuthRetry<T>(label: string, task: () => PromiseLike<T>): Promise<T> {
  try {
    return await withAuthTimeout(task(), label);
  } catch (error) {
    if (!isTransientAuthError(error)) throw error;
    console.warn(`[auth] ${label} failed; retrying once`, error);
    await new Promise((resolve) => window.setTimeout(resolve, AUTH_QUERY_RETRY_DELAY_MS));
    return await withAuthTimeout(task(), `${label} retry`);
  }
}

const buildVendorAuthEmailCandidates = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  const localDigits = digits.length > 10 ? digits.slice(-10) : digits;
  const candidates = new Set<string>();

  if (trimmed) candidates.add(trimmed);
  if (digits) candidates.add(`${digits}@phone.planext4u.local`);
  if (localDigits) candidates.add(`${localDigits}@phone.planext4u.local`);

  return Array.from(candidates);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginResolveRef = useRef<(() => void) | null>(null);
  const isFreshLoginRef = useRef(false);
  // Captures the most recent role-load outcome so login() can surface a friendly
  // message when the user was signed out due to status (deleted/suspended/etc.)
  const lastAuthErrorRef = useRef<string | null>(null);

  // Helper: filter out synthetic Firebase phone-auth emails
  const cleanEmail = (email: string | null | undefined): string => {
    if (!email || email.includes('@phone.planext4u.local')) return '';
    return email;
  };

  const getVendorProfile = useCallback(async (vendorId: string) => {
    const [{ data: productVendor, error: productError }, { data: serviceVendor, error: serviceError }] = await withAuthRetry(
      "vendor profile lookup",
      () => Promise.all([
        supabase.from("vendors").select(VENDOR_PROFILE_SELECT).eq("id", vendorId).maybeSingle(),
        supabase.from("service_vendors" as any).select(VENDOR_PROFILE_SELECT).eq("id", vendorId).maybeSingle(),
      ]),
    );

    if (productError && serviceError) {
      throw new Error(productError.message || serviceError.message || "Unable to load vendor profile.");
    }

    return (productVendor || serviceVendor || null) as {
      id: string;
      name: string | null;
      business_name: string | null;
      email: string | null;
      mobile?: string | null;
      status: string;
    } | null;
  }, []);

  const processRole = useCallback(async (roleRecord: any, supabaseUid: string, email: string, name: string, isFreshLogin: boolean): Promise<string> => {
    if (!roleRecord) {
      console.warn('[auth] processRole called with null role record');
      await supabase.auth.signOut();
      return 'unregistered';
    }
    const role = roleRecord.role as AppRole;

    if (role === 'admin' || role === 'finance' || role === 'sales') {
      const authUser: AuthUser = {
        id: supabaseUid, name, email, role: role as UserRole, portal: 'admin', supabase_uid: supabaseUid,
      };
      setUser(authUser);
      persistentStore.set("admin_user", JSON.stringify(authUser));
      stampSession("admin");
    } else if (role === 'vendor') {
      const vendorId = roleRecord.vendor_id;
      if (!vendorId) {
        console.warn('[auth] vendor role has no vendor_id — orphan record');
        return 'orphan_role';
      }
      const vendor = await getVendorProfile(vendorId);

      // Orphan: role row exists but vendor record is missing → signal caller to try other roles
      if (!vendor) {
        console.warn(`[auth] vendor profile ${vendorId} not found for user ${supabaseUid} — orphan role`);
        return 'orphan_role';
      }

      // Vendor exists but is not yet allowed into the vendor portal
      if (!ACTIVE_VENDOR_STATUSES.has(vendor.status)) {
        await supabase.auth.signOut();
        const s = (vendor.status || '').toLowerCase();
        if (s === 'deleted') {
          lastAuthErrorRef.current = 'Your vendor account has been deleted. Please contact support if this is a mistake.';
        } else if (s === 'suspended') {
          lastAuthErrorRef.current = 'Your vendor account has been suspended. Please contact support to restore access.';
        } else if (s === 'inactive' || s === 'deactivated') {
          lastAuthErrorRef.current = 'Your vendor account is inactive. Please contact support to reactivate.';
        } else if (s === 'rejected') {
          lastAuthErrorRef.current = 'Your vendor application was rejected. Please contact support.';
        } else {
          lastAuthErrorRef.current = 'Your vendor profile is not yet approved. You will be notified once approved.';
        }
        return 'vendor_not_verified';
      }

      const vu: VendorUser = {
        id: vendor.id, name: vendor.name || name, email: cleanEmail(vendor.email) || cleanEmail(email),
        business_name: vendor.business_name || '', vendor_id: vendorId, supabase_uid: supabaseUid,
        password_set: !!roleRecord.password_set,
        just_logged_in: isFreshLogin && !roleRecord.password_set,
      };
      setVendorUser(vu);
      persistentStore.set("vendor_user", JSON.stringify(vu));
      stampSession("vendor");
    } else if (role === 'customer') {
      const customerId = roleRecord.customer_id;
      if (!customerId) {
        console.warn('[auth] customer role has no customer_id — orphan record');
        return 'orphan_role';
      }
      const { data: customer, error: customerError } = await withAuthRetry(
        "customer profile lookup",
        () => supabase.from("customers").select("id, name, email, mobile, status").eq("id", customerId).maybeSingle(),
      );

      if (customerError) {
        throw new Error(customerError.message || "Unable to load customer profile.");
      }

      // Orphan: role row exists but customer record is missing → signal caller to try other roles
      if (!customer) {
        console.warn(`[auth] customer profile ${customerId} not found for user ${supabaseUid} — orphan role`);
        return 'orphan_role';
      }

      // Customer must be active
      if (customer.status && customer.status !== 'active') {
        await supabase.auth.signOut();
        const s = (customer.status || '').toLowerCase();
        if (s === 'deleted') {
          lastAuthErrorRef.current = 'Your account has been deleted. Please contact support if this is a mistake.';
        } else if (s === 'suspended') {
          lastAuthErrorRef.current = 'Your account has been suspended. Please contact support to restore access.';
        } else if (s === 'deactivated') {
          lastAuthErrorRef.current = 'Your account is deactivated. Please contact support to reactivate.';
        } else if (s === 'inactive') {
          lastAuthErrorRef.current = 'Your account is inactive. Please contact support to reactivate.';
        } else {
          lastAuthErrorRef.current = `Your account is ${s} and cannot sign in.`;
        }
        return 'customer_not_active';
      }

      const cu: CustomerUser = {
        id: customer.id, name: customer.name || name, email: cleanEmail(customer.email) || cleanEmail(email),
        mobile: customer.mobile || '', customer_id: customerId, supabase_uid: supabaseUid,
        password_set: !!roleRecord.password_set,
        just_logged_in: isFreshLogin && !roleRecord.password_set,
      };
      setCustomerUser(cu);
      persistentStore.set("customer_user", JSON.stringify(cu));
      stampSession("customer");
    }

    // Log login event for fresh logins
    if (isFreshLogin) {
      try {
        await supabase.from("login_logs").insert({
          user_id: supabaseUid,
          role: role,
          portal: role === 'admin' || role === 'finance' || role === 'sales' ? 'admin' : role,
          login_method: 'phone_otp',
        } as any);
      } catch {}
    }

    return 'loaded';
  }, [getVendorProfile]);

  // Detect which portal the user is currently signing into so that when a single
  // Supabase auth user has BOTH vendor and customer roles (same email/phone shared
  // between a vendor account and a customer account), we load the correct profile.
  const detectActivePortal = useCallback((): 'admin' | 'vendor' | 'customer' => {
    if (typeof window === 'undefined') return 'customer';
    try {
      const path = window.location.pathname || '';
      if (path.startsWith('/vendor')) return 'vendor';
      if (path === '/login' || path.startsWith('/admin') || path.startsWith('/dashboard')) return 'admin';
      if (path.startsWith('/app')) return 'customer';
      // Native APK fallback — vendor APK stores this flag
      const nativePortal = sessionStorage.getItem('p4u_native_portal');
      if (nativePortal === 'vendor') return 'vendor';
    } catch {}
    return 'customer';
  }, []);

  const pickPreferredRole = useCallback((roles: any[], portal: 'admin' | 'vendor' | 'customer') => {
    if (!roles || roles.length === 0) return null;
    if (roles.length === 1) return roles[0];
    // Prefer a role matching the portal the user is signing into
    if (portal === 'vendor') {
      const v = roles.find(r => r.role === 'vendor');
      if (v) return v;
    } else if (portal === 'customer') {
      const c = roles.find(r => r.role === 'customer');
      if (c) return c;
    } else if (portal === 'admin') {
      const a = roles.find(r => ['admin', 'finance', 'sales'].includes(r.role));
      if (a) return a;
    }
    return roles[0];
  }, []);

  // Try roles in order, falling back to the next one if the picked role is orphaned
  // (e.g. user_roles row points to a customer_id/vendor_id that no longer exists).
  const tryRolesWithFallback = useCallback(async (
    roles: any[],
    portal: 'admin' | 'vendor' | 'customer',
    supabaseUid: string,
    email: string,
    name: string,
    isFreshLogin: boolean,
  ): Promise<string> => {
    if (!roles || roles.length === 0) return 'unregistered';

    // Build an ordered candidate list: preferred first, then the rest (deduped)
    const preferred = pickPreferredRole(roles, portal);
    const ordered = [preferred, ...roles.filter(r => r !== preferred)].filter(Boolean);

    let lastResult = 'unregistered';
    for (const candidate of ordered) {
      const result = await processRole(candidate, supabaseUid, email, name, isFreshLogin);
      lastResult = result;
      // 'orphan_role' = no underlying customer/vendor row → try next role
      if (result !== 'orphan_role') return result;
    }
    // All roles were orphans — sign out and report
    console.error(`[auth] All roles for user ${supabaseUid} are orphaned`);
    await supabase.auth.signOut();
    return lastResult === 'orphan_role' ? 'unregistered' : lastResult;
  }, [processRole, pickPreferredRole]);

  const loadUserRole = useCallback(async (supabaseUid: string, email: string, name: string, isFreshLogin: boolean) => {
    const { data: roles, error: rolesError } = await withAuthRetry(
      "role lookup",
      () => supabase
        .from("user_roles")
        .select("role, vendor_id, customer_id, password_set")
        .eq("user_id", supabaseUid),
    );

    if (rolesError) {
      console.error('[auth] role lookup failed:', rolesError.message || rolesError);
      lastAuthErrorRef.current = "Login was accepted, but your role could not be loaded. Please try again in a moment.";
      return 'role_lookup_failed';
    }

    if (!roles || roles.length === 0) {
      const { data: { session } } = await supabase.auth.getSession();
      const provider = session?.user?.app_metadata?.provider;
      
      if (provider === 'google') {
        try {
          const { data: linkData } = await supabase.functions.invoke("google-oauth-link");
          if (linkData?.success && linkData?.registered) {
            const { data: newRoles, error: newRolesError } = await withAuthRetry(
              "linked role lookup",
              () => supabase
                .from("user_roles")
                .select("role, vendor_id, customer_id, password_set")
                .eq("user_id", supabaseUid),
            );
            if (newRolesError) {
              console.error('[auth] linked role lookup failed:', newRolesError.message || newRolesError);
              lastAuthErrorRef.current = "Login was accepted, but your role could not be loaded. Please try again in a moment.";
              return 'role_lookup_failed';
            }
            if (newRoles && newRoles.length > 0) {
              const portal = detectActivePortal();
              return await tryRolesWithFallback(newRoles, portal, supabaseUid, email, name, isFreshLogin);
            }
          }
        } catch {}
        await supabase.auth.signOut();
        return 'unregistered';
      }
      
      await supabase.auth.signOut();
      return 'unregistered';
    }

    const portal = detectActivePortal();
    return await tryRolesWithFallback(roles, portal, supabaseUid, email, name, isFreshLogin);
  }, [tryRolesWithFallback, detectActivePortal]);

  // SECURITY: Purge any cached profile that does not belong to the supplied
  // Supabase auth UID. Prevents UI from showing a previous user's identity
  // when a different account is currently signed in (account-switch bug).
  //
  // Only touches the cache for the *current* portal (admin / vendor / customer).
  // Each browser tab now has its own isolated Supabase session (see
  // src/integrations/supabase/client.ts), so a customer tab must NOT clear
  // the admin tab's cached admin_user entry, and vice versa.
  const purgeMismatchedCaches = useCallback((currentUid: string | null) => {
    const safeParse = (raw: string | null): { supabase_uid?: string } | null => {
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    };

    const checkAndClear = (key: string, setter: (v: any) => void) => {
      try {
        const raw = localStorage.getItem(key);
        const parsed = safeParse(raw);
        if (!parsed) return;
        const cachedUid = parsed.supabase_uid || null;
        // No session, or session UID does not match cache UID → wipe it.
        if (!currentUid || (cachedUid && cachedUid !== currentUid)) {
          persistentStore.remove(key);
          setter(null);
        }
      } catch { /* ignore */ }
    };

    const portal = detectActivePortal();
    if (portal === 'admin') checkAndClear("admin_user", setUser);
    else if (portal === 'vendor') checkAndClear("vendor_user", setVendorUser);
    else checkAndClear("customer_user", setCustomerUser);
  }, [detectActivePortal]);

  useEffect(() => {
    let cancelled = false;
    const isNative = Capacitor.isNativePlatform();

    // Hard safety net: if no auth event fires within a short window (e.g. slow
    // network on cold start), still flip isLoading=false so the router can
    // render the login screen instead of an infinite spinner. Any subsequent
    // SIGNED_IN / INITIAL_SESSION event will still hydrate the user normally.
    const loadingFallback = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, isNative ? 1500 : 800);

    // Restore cached profiles ONLY if they belong to the current Supabase session.
    // Without this guard, a stale cache from a previous user can be displayed
    // while queries actually run as the new user (silent account-switch).
    const hydrate = async () => {
      try {
        const [{ data: { session } }, savedUser, savedCustomer, savedVendor] = await Promise.all([
          supabase.auth.getSession(),
          persistentStore.get("admin_user"),
          persistentStore.get("customer_user"),
          persistentStore.get("vendor_user"),
        ]);
        if (cancelled) return;

        const sessionUid = session?.user?.id || null;

        const tryRestore = (raw: string | null, setter: (v: any) => void, key: string) => {
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            const cachedUid = parsed?.supabase_uid || null;
            // Only restore if cache UID matches session UID. Legacy caches without
            // supabase_uid are treated as untrusted and discarded when there is
            // no session, but kept temporarily on native if session is still loading.
            if (sessionUid && cachedUid && cachedUid === sessionUid) {
              setter(parsed);
            } else if (sessionUid && !cachedUid && isNative) {
              // Legacy cache, native still hydrating — keep until loadUserRole rewrites it.
              setter(parsed);
            } else {
              persistentStore.remove(key);
            }
          } catch {
            persistentStore.remove(key);
          }
        };

        tryRestore(savedUser, setUser, "admin_user");
        tryRestore(savedCustomer, setCustomerUser, "customer_user");
        tryRestore(savedVendor, setVendorUser, "vendor_user");
      } catch { /* ignore */ }
    };
    hydrate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        const { id, email, user_metadata } = session.user;
        const name = user_metadata?.name || email?.split('@')[0] || '';

        // SECURITY: Before loading the new role, purge any cached profile whose
        // supabase_uid does not match the current session. Without this, the UI
        // briefly shows the previous user's name/identity until loadUserRole
        // overwrites it — and on TOKEN_REFRESHED for a different account, would
        // never overwrite the unrelated portal caches at all.
        purgeMismatchedCaches(id);

        const isFreshLogin = isFreshLoginRef.current;
        isFreshLoginRef.current = false;
        setTimeout(async () => {
          try {
            const result = await loadUserRole(id, email || '', name, isFreshLogin);
            if (result === 'role_lookup_failed') {
              await supabase.auth.signOut();
            }
          } catch (error: any) {
            console.error('[auth] role hydration failed:', error?.message || error);
            lastAuthErrorRef.current = isTransientAuthError(error)
              ? "Login was accepted, but the backend is taking too long to load your role. Please try again."
              : (error?.message || "Login failed while loading your role.");
            await supabase.auth.signOut();
          }
          setIsLoading(false);
          initPushNotifications(id);
          linkPushTokenToUser(id);
          if (loginResolveRef.current) {
            loginResolveRef.current();
            loginResolveRef.current = null;
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCustomerUser(null);
        setVendorUser(null);
        persistentStore.remove("admin_user");
        persistentStore.remove("customer_user");
        persistentStore.remove("vendor_user");
        clearSessionStamp("admin");
        clearSessionStamp("customer");
        clearSessionStamp("vendor");
        setIsLoading(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No session — any cached portal profile is stale and must be cleared.
        // (Previously skipped on native, which let stale caches from a prior user
        // leak into the UI before the new session loaded.)
        purgeMismatchedCaches(null);
        setIsLoading(false);
      }
    });

    // Native safety net: Capacitor Preferences storage is async, so the session
    // may not be ready when INITIAL_SESSION first fires. Re-check after the
    // adapter has had time to read the persisted token.
    if (isNative) {
      setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            purgeMismatchedCaches(null);
            return;
          }
          // Always reconcile the cache against the actual session UID.
          purgeMismatchedCaches(session.user.id);
          if (!user && !customerUser && !vendorUser) {
            const { id, email, user_metadata } = session.user;
            const name = user_metadata?.name || email?.split('@')[0] || '';
            loadUserRole(id, email || '', name, false).finally(() => setIsLoading(false));
          }
        });
      }, 800);
    }

    return () => { cancelled = true; clearTimeout(loadingFallback); subscription.unsubscribe(); };
  }, [loadUserRole, purgeMismatchedCaches]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    isFreshLoginRef.current = true;
    lastAuthErrorRef.current = null;
    const hydrationPromise = new Promise<void>((resolve) => {
      loginResolveRef.current = resolve;
      setTimeout(() => { if (loginResolveRef.current) { loginResolveRef.current(); loginResolveRef.current = null; } }, 7000);
    });
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      loginResolveRef.current = null;
      setIsLoading(false);
      isFreshLoginRef.current = false;
      throw new Error(error.message);
    }
    if (signInData?.user) {
      withAuthTimeout(
        supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", signInData.user.id),
        "password flag update",
        2500,
      ).catch((error) => console.warn('[auth] password flag update skipped:', error?.message || error));
    }
    await hydrationPromise;
    if (lastAuthErrorRef.current) {
      const msg = lastAuthErrorRef.current;
      lastAuthErrorRef.current = null;
      throw new Error(msg);
    }
  };

  const customerLogin = async (email: string, password: string) => {
    setIsLoading(true);
    isFreshLoginRef.current = true;
    lastAuthErrorRef.current = null;
    const hydrationPromise = new Promise<void>((resolve) => {
      loginResolveRef.current = resolve;
      setTimeout(() => { if (loginResolveRef.current) { loginResolveRef.current(); loginResolveRef.current = null; } }, 7000);
    });
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      loginResolveRef.current = null;
      setIsLoading(false);
      isFreshLoginRef.current = false;
      throw new Error(error.message);
    }
    if (signInData?.user) {
      withAuthTimeout(
        supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", signInData.user.id),
        "password flag update",
        2500,
      ).catch((error) => console.warn('[auth] password flag update skipped:', error?.message || error));
    }
    await hydrationPromise;
    if (lastAuthErrorRef.current) {
      const msg = lastAuthErrorRef.current;
      lastAuthErrorRef.current = null;
      throw new Error(msg);
    }
    logActivity('login', `Customer logged in with ${email}`);
  };

  const vendorLogin = async (email: string, password: string) => {
    setIsLoading(true);
    isFreshLoginRef.current = true;
    lastAuthErrorRef.current = null;
    const hydrationPromise = new Promise<void>((resolve) => {
      loginResolveRef.current = resolve;
      setTimeout(() => { if (loginResolveRef.current) { loginResolveRef.current(); loginResolveRef.current = null; } }, 7000);
    });
    let signInData: any = null;
    let lastError: Error | null = null;

    for (const candidateEmail of buildVendorAuthEmailCandidates(email)) {
      const { error, data } = await supabase.auth.signInWithPassword({ email: candidateEmail, password });
      if (!error) {
        signInData = data;
        lastError = null;
        break;
      }
      lastError = new Error(error.message);
    }

    if (!signInData?.user) {
      loginResolveRef.current = null;
      setIsLoading(false);
      isFreshLoginRef.current = false;
      throw lastError || new Error("Invalid email or password");
    }

    if (signInData?.user) {
      withAuthTimeout(
        supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", signInData.user.id),
        "password flag update",
        2500,
      ).catch((error) => console.warn('[auth] password flag update skipped:', error?.message || error));
    }
    await hydrationPromise;
    if (lastAuthErrorRef.current) {
      const msg = lastAuthErrorRef.current;
      lastAuthErrorRef.current = null;
      throw new Error(msg);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    persistentStore.remove("admin_user");
    clearSessionStamp("admin");
  };

  const customerLogout = async () => {
    await supabase.auth.signOut();
    setCustomerUser(null);
    persistentStore.remove("customer_user");
    clearSessionStamp("customer");
  };

  const vendorLogout = async () => {
    await supabase.auth.signOut();
    setVendorUser(null);
    persistentStore.remove("vendor_user");
    clearSessionStamp("vendor");
  };

  const hasAccess = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return allowedRoles.includes(user.role);
  };

  // (seedDemoUsers removed — demo seeding is no longer supported.)
  const seedDemoUsers = async () => {
    throw new Error("Demo seeding has been removed from this application.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customerUser,
        vendorUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        customerLogin,
        vendorLogin,
        logout,
        customerLogout,
        vendorLogout,
        hasAccess,
        seedDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
