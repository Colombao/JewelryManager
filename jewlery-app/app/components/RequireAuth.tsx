"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/");
    }
  }, [isLoading, token, router]);

  if (isLoading || !token) return null;
  return <>{children}</>;
}
