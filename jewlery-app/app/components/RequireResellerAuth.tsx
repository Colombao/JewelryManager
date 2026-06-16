"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function RequireResellerAuth({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { token, user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.replace("/revendedora/login", { scroll: false });
      return;
    }

    if (user?.role !== "reseller") {
      router.replace(user?.role === "admin" ? "/fluxo" : "/", { scroll: false });
    }
  }, [isLoading, token, user?.role, router]);

  if (isLoading) return null;
  if (!token || user?.role !== "reseller") return null;

  return <>{children}</>;
}
