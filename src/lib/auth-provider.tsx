import { useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/lib/auth-context";
import { logActivity } from "@/lib/activity-log";
import { initPushNotifications, linkPushTokenToUser } from "@/lib/push-notifications";
import type { AuthUser, CustomerUser, VendorUser, UserRole, AppRole } from "@/lib/auth-types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginResolveRef = useRef<(() => void) | null>(null);
  const isFreshLoginRef = useRef(false);

  const processRole = useCallback(async (roleRecord: any, supabaseUid: string, email: string, name: string, isFreshLogin: boolean): Promise<string> => {
    const role = roleRecord.role as AppRole;

    if (role === 'admin' || role === 'finance' || role === 'sales') {
      const authUser: AuthUser = {
        id: supabaseUid, name, email, role: role as UserRole, portal: 'admin', supabase_uid: supabaseUid,
      };
      setUser(authUser);
      localStorage.setItem("admin_user", JSON.stringify(authUser));
    } else if (role === 'vendor') {
      const vendorId = roleRecord.vendor_id || 'VND-001';
      const { data: vendor } = await supabase.from("vendors").select("id, name, business_name, email, status").eq("id", vendorId).single();
      
      // Check if vendor is verified
      if (vendor && vendor.status !== 'active' && vendor.status !== 'verified') {
        await supabase.auth.signOut();
        return 'vendor_not_verified';
      }
      
      const vu: VendorUser = {
        id: vendor?.id || vendorId, name: vendor?.name || name, email: vendor?.email || email,
        business_name: vendor?.business_name || '', vendor_id: vendorId, supabase_uid: supabaseUid,
        password_set: !!roleRecord.password_set,
        just_logged_in: isFreshLogin && !roleRecord.password_set,
      };
      setVendorUser(vu);
      localStorage.setItem("vendor_user", JSON.stringify(vu));
    } else if (role === 'customer') {
      const customerId = roleRecord.customer_id || 'USR-001';
      const { data: customer } = await supabase.from("customers").select("id, name, email, mobile").eq("id", customerId).single();
      const cu: CustomerUser = {
        id: customer?.id || customerId, name: customer?.name || name, email: customer?.email || email,
        mobile: customer?.mobile || '', customer_id: customerId, supabase_uid: supabaseUid,
        password_set: !!roleRecord.password_set,
        just_logged_in: isFreshLogin && !roleRecord.password_set,
      };
      setCustomerUser(cu);
      localStorage.setItem("customer_user", JSON.stringify(cu));
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
              return await processRole(newRoles[0], supabaseUid, email, name, isFreshLogin);
            }
          }
        } catch {}
        await supabase.auth.signOut();
        return 'unregistered';
      }
      
      await supabase.auth.signOut();
      return 'unregistered';
    }

    return await processRole(roles[0], supabaseUid, email, name, isFreshLogin);
  }, [processRole]);

  useEffect(() => {
    // Restore from localStorage immediately to prevent flash redirects
    try {
      const savedUser = localStorage.getItem("admin_user");
      const savedCustomer = localStorage.getItem("customer_user");
      const savedVendor = localStorage.getItem("vendor_user");
      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedCustomer) setCustomerUser(JSON.parse(savedCustomer));
      if (savedVendor) setVendorUser(JSON.parse(savedVendor));
    } catch { /* ignore */ }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        const { id, email, user_metadata } = session.user;
        const name = user_metadata?.name || email?.split('@')[0] || '';
        setTimeout(async () => {
          const result = await loadUserRole(id, email || '', name);
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
        localStorage.removeItem("admin_user");
        localStorage.removeItem("customer_user");
        localStorage.removeItem("vendor_user");
        setIsLoading(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No session at all - keep localStorage state, just stop loading
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserRole]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    // Mark password_set since they used email+password
    if (signInData?.user) {
      await supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", signInData.user.id);
    }
    // Wait for onAuthStateChange to finish loading the role
    await new Promise<void>((resolve) => {
      loginResolveRef.current = resolve;
      // Safety timeout
      setTimeout(() => { if (loginResolveRef.current) { loginResolveRef.current(); loginResolveRef.current = null; } }, 5000);
    });
  };

  const customerLogin = async (email: string, password: string) => {
    setIsLoading(true);
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    // Mark password_set since they used email+password
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
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    // Mark password_set since they used email+password
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
    localStorage.removeItem("admin_user");
  };

  const customerLogout = async () => {
    await supabase.auth.signOut();
    setCustomerUser(null);
    localStorage.removeItem("customer_user");
  };

  const vendorLogout = async () => {
    await supabase.auth.signOut();
    setVendorUser(null);
    localStorage.removeItem("vendor_user");
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
