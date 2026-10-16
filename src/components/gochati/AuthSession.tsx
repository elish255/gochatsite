import { createContext, useContext } from "react";
import type { AppUser as User } from "@/integrations/netlify/client";

export const AuthSession = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export const useAuthSession = () => useContext(AuthSession);
