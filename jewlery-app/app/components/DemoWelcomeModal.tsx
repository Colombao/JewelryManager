"use client";

import { Cormorant_Garamond } from "next/font/google";
import { useEffect, useState } from "react";
import { RiJewelryFill, RiSparkling2Line } from "react-icons/ri";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface DemoWelcomeModalProps {
  onUseCredentials: () => void;
}

export default function DemoWelcomeModal({
  onUseCredentials,
}: DemoWelcomeModalProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setOpen(true);
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 250);
  };

  const handleUseCredentials = () => {
    onUseCredentials();
    handleClose();
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-250 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-labelledby="demo-welcome-title"
        aria-modal="true"
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200/30 bg-white shadow-2xl shadow-amber-900/20 transition-all duration-250 ease-out ${
          visible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-3 opacity-0"
        }`}
      >
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-center">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -left-8 top-0 h-32 w-32 rounded-full bg-amber-400 blur-3xl" />
            <div className="absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-amber-600 blur-3xl" />
          </div>

          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-900/40">
            <RiJewelryFill className="h-7 w-7 text-white" />
          </div>

          <div className="relative flex items-center justify-center gap-1.5 text-amber-400">
            <RiSparkling2Line className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Demo Day
            </span>
            <RiSparkling2Line className="h-4 w-4" />
          </div>

          <h2
            id="demo-welcome-title"
            className={`${displayFont.className} relative mt-3 text-3xl font-semibold text-white`}
          >
            Bem-vindo ao Jewelry Manager
          </h2>

          <p className="relative mt-2 text-sm leading-relaxed text-slate-400">
            Explore a plataforma de gestão de joias com dados de demonstração.
          </p>
        </div>

        <div className="px-6 py-6">
          <p className="mb-4 text-center text-sm text-slate-600">
            Entre com as credenciais abaixo:
          </p>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </span>
              <code className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200">
                demo@demo
              </code>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Senha
              </span>
              <code className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200">
                demo
              </code>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={handleUseCredentials}
              className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-amber-200 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2"
            >
              Preencher e entrar
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
