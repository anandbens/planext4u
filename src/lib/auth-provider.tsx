import { useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/lib/auth-context";
import { logActivity } from "@/lib/activity-log";
import { initPushNotifications, linkPushTokenToUser } from "@/lib/push-notifications";
import { persistentStore } from "@/lib/storage-adapter";
import type { AuthUser, CustomerUser, VendorUser, UserRole, AppRole } from "@/lib/auth-types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginResolveRef = useRef<(() => void) | null>(null);
  const isFreshLoginRef = useRef(false);

  // Helper: filter out synthetic Firebase phone-auth emails
  const cleanEmail = (email: string | null | undefined): string => {
    if (!email || email.includes('@phone.planext4u.local')) return '';
    return email;
  };

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
      const vendorId = roleRecord.vendor_id || 'VND-001';
      const { data: vendor } = await supabase.from("vendors").select("id, name, business_name, email, status").eq("id", vendorId).single();
      
      // Check if vendor is verified
      if (vendor && vendor.status !== 'active' && vendor.status !== 'verified') {
        await supabase.auth.signOut();
        return 'vendor_not_verified';
      }
      
      const vu: VendorUser = {
        id: vendor?.id || vendorId, name: vendor?.name || name, email: cleanEmail(vendor?.email) || cleanEmail(email),
        business_name: vendor?.business_name || '', vendor_id: vendorId, supabase_uid: supabaseUid,
        password_set: !!roleRecord.password_set,
        just_logged_in: isFreshLogin && !roleRecord.password_set,
      };
      setVendorUser(vu);
      persistentStore.set("vendor_user", JSON.stringify(vu));
    } else if (role === 'customer') {
      const customerId = roleRecord.customer_id || 'USR-001';
      const { data: customer } = await supabase.from("customers").select("id, name, email, mobile").eq("id", customerId).single();
      const cu: CustomerUser = {
        id: customer?.id || customerId, name: customer?.name || name, email: cleanEmail(customer?.email) || cleanEmail(email),
        mobile: customer?.mobile || '', customer_id: customerId, supabase_uid: supabaseUid,
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
  }, []);

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
              const picked = pickPreferredRole(newRoles, portal);
              return await processRole(picked, supabaseUid, email, name, isFreshLogin);
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
    const picked = pickPreferredRole(roles, portal);
    return await processRole(picked, supabaseUid, email, name, isFreshLogin);
  }, [processRole, detectActivePortal, pickPreferredRole]);

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
        // No session at all - keep cached profile state, just stop loading
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
