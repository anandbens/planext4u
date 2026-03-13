import { useContext } from "react";
import { AuthContext } from "@/lib/auth-context";
import type { AuthContextType } from "@/lib/auth-types";

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
