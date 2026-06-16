"use client";

import { useState } from "react";
import { HiMenuAlt3 } from "react-icons/hi";
import Sidebar from "./Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-1 rounded-lg hover:bg-slate-100 transition text-slate-700"
            aria-label="Abrir menu"
          >
            <HiMenuAlt3 size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-b from-blue-400 to-blue-600 rounded-md flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 56 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  points="28,4 48,24 28,52 8,24"
                  fill="#fff"
                  opacity="0.9"
                />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-900">Jewlery</span>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden transition-all duration-300 text-black">
          {children}
        </main>
      </div>
    </div>
  );
}
