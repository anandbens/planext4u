import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, setAuthToken } from "@/lib/api";

export type UserRole = 'admin' | 'finance' | 'sales';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Role-based credentials
const ROLE_CREDENTIALS: Record<string, { name: string; role: UserRole }> = {
  'admin@marketplace.com': { name: 'Super Admin', role: 'admin' },
  'finance@marketplace.com': { name: 'Finance Manager', role: 'finance' },
  'sales@marketplace.com': { name: 'Sales Executive', role: 'sales' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const savedUser = localStorage.getItem("admin_user");
    if (token && savedUser) {
      setAuthToken(token);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    const roleMeta = ROLE_CREDENTIALS[email.toLowerCase()] || { name: 'Admin', role: 'admin' as UserRole };
    const authUser: AuthUser = { id: res.user.id, name: roleMeta.name, email, role: roleMeta.role };
    setAuthToken(res.token);
    localStorage.setItem("admin_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem("admin_user");
    setUser(null);
  };

  const hasAccess = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has full access
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
