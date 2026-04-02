import { useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/lib/auth-context";
import { logActivity } from "@/lib/activity-log";
import type { AuthUser, CustomerUser, VendorUser, UserRole, AppRole } from "@/lib/auth-types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserRole = useCallback(async (supabaseUid: string, email: string, name: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, vendor_id, customer_id")
      .eq("user_id", supabaseUid);

    if (!roles || roles.length === 0) {
      // No role found — check if this is an OAuth user who needs linking
      const { data: { session } } = await supabase.auth.getSession();
      const provider = session?.user?.app_metadata?.provider;
      
      if (provider === 'google') {
        // Try to link via edge function
        try {
          const { data: linkData } = await supabase.functions.invoke("google-oauth-link");
          if (linkData?.success && linkData?.registered) {
            // Successfully linked - reload roles
            const { data: newRoles } = await supabase
              .from("user_roles")
              .select("role, vendor_id, customer_id")
              .eq("user_id", supabaseUid);
            if (newRoles && newRoles.length > 0) {
              // Continue with the found role below
              const roleRecord = newRoles[0];
              return await processRole(roleRecord, supabaseUid, email, name);
            }
          }
        } catch {}
        // Linking failed or user not registered
        await supabase.auth.signOut();
        return 'unregistered';
      }
      
      await supabase.auth.signOut();
      return 'unregistered';
    }

    return await processRole(roles[0], supabaseUid, email, name);
  }, []);

  const processRole = useCallback(async (roleRecord: any, supabaseUid: string, email: string, name: string) => {
    const role = roleRecord.role as AppRole;

    if (role === 'admin' || role === 'finance' || role === 'sales') {
      const authUser: AuthUser = {
        id: supabaseUid,
        name,
        email,
        role: role as UserRole,
        portal: 'admin',
        supabase_uid: supabaseUid,
      };
      setUser(authUser);
      localStorage.setItem("admin_user", JSON.stringify(authUser));
    } else if (role === 'vendor') {
      // Load vendor details
      const vendorId = roleRecord.vendor_id || 'VND-001';
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, name, business_name, email")
        .eq("id", vendorId)
        .single();

      const vu: VendorUser = {
        id: vendor?.id || vendorId,
        name: vendor?.name || name,
        email: vendor?.email || email,
        business_name: vendor?.business_name || '',
        vendor_id: vendorId,
        supabase_uid: supabaseUid,
      };
      setVendorUser(vu);
      localStorage.setItem("vendor_user", JSON.stringify(vu));
    } else if (role === 'customer') {
      const customerId = roleRecord.customer_id || 'USR-001';
      const { data: customer } = await supabase
        .from("customers")
        .select("id, name, email, mobile")
        .eq("id", customerId)
        .single();

      const cu: CustomerUser = {
        id: customer?.id || customerId,
        name: customer?.name || name,
        email: customer?.email || email,
        mobile: customer?.mobile || '',
        customer_id: customerId,
        supabase_uid: supabaseUid,
      };
      setCustomerUser(cu);
      localStorage.setItem("customer_user", JSON.stringify(cu));
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { id, email, user_metadata } = session.user;
        const name = user_metadata?.name || email?.split('@')[0] || '';
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          const result = await loadUserRole(id, email || '', name);
          if (result === 'unregistered' || result === 'pending') {
            setIsLoading(false);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCustomerUser(null);
        setVendorUser(null);
        localStorage.removeItem("admin_user");
        localStorage.removeItem("customer_user");
        localStorage.removeItem("vendor_user");
      }
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const { id, email, user_metadata } = session.user;
        const name = user_metadata?.name || email?.split('@')[0] || '';
        loadUserRole(id, email || '', name).finally(() => setIsLoading(false));
      } else {
        // Try to restore from localStorage as fallback
        try {
          const savedUser = localStorage.getItem("admin_user");
          const savedCustomer = localStorage.getItem("customer_user");
          const savedVendor = localStorage.getItem("vendor_user");
          if (savedUser) setUser(JSON.parse(savedUser));
          if (savedCustomer) setCustomerUser(JSON.parse(savedCustomer));
          if (savedVendor) setVendorUser(JSON.parse(savedVendor));
        } catch { /* ignore */ }
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserRole]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // Role loading happens in onAuthStateChange
  };

  const customerLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    logActivity('login', `Customer logged in with ${email}`);
  };

  const vendorLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
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
