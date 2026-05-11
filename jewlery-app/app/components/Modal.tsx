"use client";

import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: ReactNode;
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-2xl md:max-w-3xl bg-white rounded-lg shadow-2xl p-6 mx-4 md:mx-6 mt-12 md:mt-0">
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
          <div className="max-h-[70vh] overflow-auto pr-2">{children}</div>
        </div>
    </div>
  );
}
