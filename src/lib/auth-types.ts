export type UserRole = 'admin' | 'finance' | 'sales';
export type PortalType = 'admin' | 'vendor' | 'customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  portal: PortalType;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
}

export interface VendorUser {
  id: string;
  name: string;
  email: string;
  business_name: string;
}

export interface AuthContextType {
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
