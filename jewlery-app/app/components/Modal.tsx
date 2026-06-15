"use client";

import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: ReactNode;
  size?: "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  md: "max-w-2xl md:max-w-3xl",
  lg: "max-w-3xl md:max-w-4xl",
  xl: "max-w-4xl md:max-w-5xl",
  "2xl": "max-w-5xl md:max-w-6xl lg:max-w-7xl",
};

export default function Modal({
  open,
  title,
  onClose,
  children,
  size = "md",
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        open ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-xl shadow-2xl p-6 mx-4 md:mx-6 mt-12 md:mt-0 transition-all duration-300 ease-out ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>

          <button
            onClick={onClose}
            aria-label="Fechar"
            className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 shadow-sm"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[90vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
