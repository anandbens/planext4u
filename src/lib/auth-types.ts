export type UserRole = 'admin' | 'finance' | 'sales';
export type AppRole = 'admin' | 'finance' | 'sales' | 'vendor' | 'customer';
export type PortalType = 'admin' | 'vendor' | 'customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  portal: PortalType;
  supabase_uid?: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  customer_id?: string;
  supabase_uid?: string;
}

export interface VendorUser {
  id: string;
  name: string;
  email: string;
  business_name: string;
  vendor_id?: string;
  supabase_uid?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  customerUser: CustomerUser | null;
  vendorUser: VendorUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  customerLogin: (email: string, password: string) => Promise<void>;
  vendorLogin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  customerLogout: () => void;
  vendorLogout: () => void;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
  seedDemoUsers: () => Promise<void>;
}
