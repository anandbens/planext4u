import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthToken } from "@/lib/api";

export type UserRole = 'admin' | 'finance' | 'sales';
export type PortalType = 'admin' | 'vendor' | 'customer';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  portal: PortalType;
}

interface CustomerUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
}

interface VendorUser {
  id: string;
  name: string;
  email: string;
  business_name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  customerUser: CustomerUser | null;
  vendorUser: VendorUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  customerLogin: (identifier: string, otp: string) => Promise<void>;
  vendorLogin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  customerLogout: () => void;
  vendorLogout: () => void;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Strict admin credentials - ONLY these can login to admin
const ADMIN_CREDENTIALS: Record<string, { password: string; name: string; role: UserRole }> = {
  'admin@planext4u.com': { password: 'P4u@Admin2026', name: 'Super Admin', role: 'admin' },
  'finance@planext4u.com': { password: 'P4u@Finance2026', name: 'Finance Manager', role: 'finance' },
  'sales@planext4u.com': { password: 'P4u@Sales2026', name: 'Sales Executive', role: 'sales' },
};

// Vendor test credentials
const VENDOR_CREDENTIALS: Record<string, { password: string; name: string; business: string; id: string }> = {
  'vendor@planext4u.com': { password: 'P4u@Vendor2026', name: 'Ravi Kumar', business: 'TechMart', id: 'VND-001' },
  'ravi@techmart.com': { password: 'vendor123', name: 'Ravi Kumar', business: 'TechMart', id: 'VND-001' },
};

// Demo OTP
const DEMO_OTP = '226688';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const savedUser = localStorage.getItem("admin_user");
    const savedCustomer = localStorage.getItem("customer_user");
    const savedVendor = localStorage.getItem("vendor_user");
    if (token && savedUser) { setAuthToken(token); setUser(JSON.parse(savedUser)); }
    if (savedCustomer) setCustomerUser(JSON.parse(savedCustomer));
    if (savedVendor) setVendorUser(JSON.parse(savedVendor));
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const cred = ADMIN_CREDENTIALS[email.toLowerCase()];
    if (!cred || cred.password !== password) {
      throw new Error('Invalid admin credentials');
    }
    const authUser: AuthUser = { id: '1', name: cred.name, email, role: cred.role, portal: 'admin' };
    setAuthToken('mock-admin-jwt-token');
    localStorage.setItem("admin_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const customerLogin = async (identifier: string, otp: string) => {
    if (otp !== DEMO_OTP) throw new Error('Invalid OTP');
    const cu: CustomerUser = {
      id: 'USR-001', name: 'Rahul Sharma',
      email: identifier.includes('@') ? identifier : 'customer@planext4u.com',
      mobile: identifier.includes('@') ? '+91 98765 43210' : identifier,
    };
    localStorage.setItem("customer_user", JSON.stringify(cu));
    setCustomerUser(cu);
    // Log activity
    logActivity('login', `Customer ${cu.name} logged in`);
  };

  const vendorLogin = async (email: string, password: string) => {
    const cred = VENDOR_CREDENTIALS[email.toLowerCase()];
    if (!cred || cred.password !== password) throw new Error('Invalid vendor credentials');
    const vu: VendorUser = { id: cred.id, name: cred.name, email, business_name: cred.business };
    localStorage.setItem("vendor_user", JSON.stringify(vu));
    setVendorUser(vu);
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem("admin_user");
    setUser(null);
  };

  const customerLogout = () => {
    localStorage.removeItem("customer_user");
    setCustomerUser(null);
  };

  const vendorLogout = () => {
    localStorage.removeItem("vendor_user");
    setVendorUser(null);
  };

  const hasAccess = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user, customerUser, vendorUser,
      isAuthenticated: !!user, isLoading,
      login, customerLogin, vendorLogin,
      logout, customerLogout, vendorLogout,
      hasAccess,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Activity logger
function logActivity(type: string, description: string) {
  try {
    const activities = JSON.parse(localStorage.getItem('app_db_activities') || '[]');
    activities.unshift({ id: `ACT-${Date.now()}`, type, description, timestamp: new Date().toISOString() });
    if (activities.length > 100) activities.length = 100;
    localStorage.setItem('app_db_activities', JSON.stringify(activities));
  } catch {}
}

export { logActivity };
