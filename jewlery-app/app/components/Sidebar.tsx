"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

export default function Sidebar() {
  const [isOpen] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-20"
      } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 min-h-screen fixed left-0 top-0 shadow-lg`}
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-700">
        <div
          className={`flex items-center gap-3 ${!isOpen && "justify-center"}`}
        >
          <div className="w-8 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
            <svg
              width="20"
              height="20"
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
          {isOpen && <span className="font-bold text-lg">Jewlery</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {(
          [
            { icon: "📊", label: "Dashboard", href: "/dashboard" },
            { icon: "💍", label: "Produtos", href: "/produtos" },
            { icon: "➕", label: "Cadastrar", href: "/cadastro" },
            { icon: "🎁", label: "Montar Kit", href: "/kit" },
            { icon: "👥", label: "Revendedores", href: "/usuarios" },
            { icon: "📈", label: "Tendencias", href: "/tendencias" },
            { icon: "📉", label: "Análise", href: "/analise" },
          ] as NavItem[]
        ).map((item, index) => (
          <Link
            key={`nav-${index}-${item.label}`}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition text-sm group relative"
          >
            <span className="text-xl">{item.icon}</span>
            {isOpen && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {!isOpen && item.badge && (
              <span className="absolute right-0 top-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div className="border-t border-slate-700 my-4"></div>

      {/* User Profile */}
      {isOpen && user && (
        <div className="absolute bottom-4 left-4 right-4 space-y-3">
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name || "Usuário"}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition text-sm font-medium"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      )}
    </aside>
  );
}
