"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { RiJewelryFill } from "react-icons/ri";

export default function ResellerLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/revendedora/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm">
              <RiJewelryFill size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Portal da revendedora
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.name || user?.email || "Revendedora"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
