import { useAuth } from "@/app/contexts/AuthContext";

export function useAuthSession() {
  return useAuth();
}
