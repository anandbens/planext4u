import { useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/lib/auth-context";
import { logActivity } from "@/lib/activity-log";
import { initPushNotifications, linkPushTokenToUser } from "@/lib/push-notifications";
import { persistentStore } from "@/lib/storage-adapter";
import type { AuthUser, CustomerUser, VendorUser, UserRole, AppRole } from "@/lib/auth-types";

const ACTIVE_VENDOR_STATUSES = new Set(["active", "verified", "level2_approved", "approved"]);
const VENDOR_PROFILE_SELECT = "id, name, business_name, email, mobile, status";

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
    const [{ data: productVendor }, { data: serviceVendor }] = await Promise.all([
      supabase.from("vendors").select(VENDOR_PROFILE_SELECT).eq("id", vendorId).maybeSingle(),
      supabase.from("service_vendors" as any).select(VENDOR_PROFILE_SELECT).eq("id", vendorId).maybeSingle(),
    ]);

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
    } else if (role === 'customer') {
      const customerId = roleRecord.customer_id;
      if (!customerId) {
        console.warn('[auth] customer role has no customer_id — orphan record');
        return 'orphan_role';
      }
      const { data: customer } = await supabase.from("customers").select("id, name, email, mobile, status").eq("id", customerId).maybeSingle();

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
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, vendor_id, customer_id, password_set")
      .eq("user_id", supabaseUid);

    if (!roles || roles.length === 0) {
      const { data: { session } } = await supabase.auth.getSession();
      const provider = session?.user?.app_metadata?.provider;
      
      if (provider === 'google') {
        try {
          const { data: linkData } = await supabase.functions.invoke("google-oauth-link");
          if (linkData?.success && linkData?.registered) {
            const { data: newRoles } = await supabase
              .from("user_roles")
              .select("role, vendor_id, customer_id, password_set")
              .eq("user_id", supabaseUid);
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

  useEffect(() => {
    let cancelled = false;
    const isNative = Capacitor.isNativePlatform();

    // Restore cached profiles immediately (sync localStorage) to prevent flash redirects.
    // On native, also re-hydrate from Capacitor Preferences (survives app kill even when WebView storage is purged).
    const hydrate = async () => {
      try {
        const [savedUser, savedCustomer, savedVendor] = await Promise.all([
          persistentStore.get("admin_user"),
          persistentStore.get("customer_user"),
          persistentStore.get("vendor_user"),
        ]);
        if (cancelled) return;
        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedCustomer) setCustomerUser(JSON.parse(savedCustomer));
        if (savedVendor) setVendorUser(JSON.parse(savedVendor));
      } catch { /* ignore */ }
    };
    hydrate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        const { id, email, user_metadata } = session.user;
        const name = user_metadata?.name || email?.split('@')[0] || '';
        const isFreshLogin = isFreshLoginRef.current;
        isFreshLoginRef.current = false;
        setTimeout(async () => {
          await loadUserRole(id, email || '', name, isFreshLogin);
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
        setIsLoading(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        // On web, no session means any cached portal profile is stale and must be cleared.
        // On native, keep the cache briefly because the async storage adapter may hydrate late.
        if (!isNative) {
          setUser(null);
          setCustomerUser(null);
          setVendorUser(null);
          persistentStore.remove("admin_user");
          persistentStore.remove("customer_user");
          persistentStore.remove("vendor_user");
        }
        setIsLoading(false);
      }
    });

    // Native safety net: Capacitor Preferences storage is async, so the session
    // may not be ready when INITIAL_SESSION first fires. Re-check after the
    // adapter has had time to read the persisted token.
    if (isNative) {
      setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          // If we already have a hydrated profile, no further action needed —
          // onAuthStateChange will have populated state. This is just a guard
          // to force a re-emit if nothing fired.
          if (!user && !customerUser && !vendorUser) {
            const { id, email, user_metadata } = session.user;
            const name = user_metadata?.name || email?.split('@')[0] || '';
            loadUserRole(id, email || '', name, false).finally(() => setIsLoading(false));
          }
        });
      }, 800);
    }

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [loadUserRole]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    isFreshLoginRef.current = true;
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      isFreshLoginRef.current = false;
      throw new Error(error.message);
    }
    if (signInData?.user) {
      await supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", signInData.user.id);
    }
    await new Promise<void>((resolve) => {
      loginResolveRef.current = resolve;
      setTimeout(() => { if (loginResolveRef.current) { loginResolveRef.current(); loginResolveRef.current = null; } }, 5000);
    });
  };

  const customerLogin = async (email: string, password: string) => {
    setIsLoading(true);
    isFreshLoginRef.current = true;
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      isFreshLoginRef.current = false;
      throw new Error(error.message);
    }
    if (signInData?.user) {
      await supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", signInData.user.id);
    }
    await new Promise<void>((resolve) => {
      loginResolveRef.current = resolve;
      setTimeout(() => { if (loginResolveRef.current) { loginResolveRef.current(); loginResolveRef.current = null; } }, 5000);
    });
    logActivity('login', `Customer logged in with ${email}`);
  };

  const vendorLogin = async (email: string, password: string) => {
    setIsLoading(true);
    isFreshLoginRef.current = true;
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
      setIsLoading(false);
      isFreshLoginRef.current = false;
      throw lastError || new Error("Invalid email or password");
    }

    if (signInData?.user) {
      await supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", signInData.user.id);
    }
    await new Promise<void>((resolve) => {
      loginResolveRef.current = resolve;
      setTimeout(() => { if (loginResolveRef.current) { loginResolveRef.current(); loginResolveRef.current = null; } }, 5000);
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    persistentStore.remove("admin_user");
  };

  const customerLogout = async () => {
    await supabase.auth.signOut();
    setCustomerUser(null);
    persistentStore.remove("customer_user");
  };

  const vendorLogout = async () => {
    await supabase.auth.signOut();
    setVendorUser(null);
    persistentStore.remove("vendor_user");
  };

  const hasAccess = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return allowedRoles.includes(user.role);
  };

  const seedDemoUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('seed-users');
      if (error) throw error;
      console.log('Demo users seeded:', data);
    } catch (err) {
      console.error('Failed to seed demo users:', err);
      throw err;
    }
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
