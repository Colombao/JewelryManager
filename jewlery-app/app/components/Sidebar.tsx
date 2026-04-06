"use client";

import Link from "next/link";
import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

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
        {/* <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-slate-700 rounded transition"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6m6 0l-6 6" />
            <path d="M9 18l6-6M9 6l6 6" />
          </svg>
        </button> */}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {[
          { icon: "📊", label: "Dashboard", href: "/dashboard" },
          { icon: "💍", label: "Produtos", href: "/produtos" },
          { icon: "➕", label: "Cadastrar", href: "/cadastro" },
          { icon: "🎁", label: "Montar Kit", href: "/kit" },
          { icon: "👥", label: "Revendedores", href: "/usuarios" },
          { icon: "📈", label: "Tendencias", href: "/tendencias" },
          { icon: "📉", label: "Análise", href: "/analise" },
        ].map((item: any, index) => (
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
      {isOpen && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              JV
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">João Vitor</p>
              <p className="text-xs text-slate-400 truncate">user@email.com</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
