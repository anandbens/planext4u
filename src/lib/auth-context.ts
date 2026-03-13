import { createContext } from "react";
import type { AuthContextType } from "@/lib/auth-types";

export const AuthContext = createContext<AuthContextType | null>(null);
