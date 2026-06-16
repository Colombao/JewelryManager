"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaClipboardList, FaPlus, FaToolbox, FaTrello } from "react-icons/fa";
import { GoGraph } from "react-icons/go";
import { HiX } from "react-icons/hi";
import { IoIosSettings, IoMdPeople } from "react-icons/io";
import { RiJewelryFill } from "react-icons/ri";
import { SiGoogleanalytics } from "react-icons/si";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { icon: <FaTrello />, label: "Fluxo", href: "/fluxo" },
  { icon: <RiJewelryFill />, label: "Produtos", href: "/produtos" },
  { icon: <FaPlus />, label: "Cadastrar", href: "/cadastro" },
  { icon: <FaToolbox />, label: "Montar Kit", href: "/kit" },
  { icon: <FaClipboardList />, label: "Kits Montados", href: "/kits" },
  { icon: <IoMdPeople />, label: "Revendedores", href: "/usuarios" },
  { icon: <GoGraph />, label: "Tendencias", href: "/tendencias" },
  { icon: <SiGoogleanalytics />, label: "Análise", href: "/analise" },
  { icon: <IoIosSettings />, label: "Configurações", href: "/configuracoes" },
];

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    onMobileClose();
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
      className={`w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-transform duration-300 min-h-screen fixed left-0 top-0 shadow-lg z-50 flex flex-col ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
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
          <span className="font-bold text-lg">Jewlery</span>
        </div>
        <button
          type="button"
          onClick={onMobileClose}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-700 transition"
          aria-label="Fechar menu"
        >
          <HiX size={22} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onMobileClose}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition text-sm group relative"
          >
            <span className="text-xl shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-slate-700 space-y-3 shrink-0">
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
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
