"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { Cormorant_Garamond } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RiJewelryFill } from "react-icons/ri";
import TextInput from "./components/TextInput";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Home() {
  const router = useRouter();
  const { login, token, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoading && token) {
      router.replace("/fluxo");
    }
  }, [isLoading, token, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível entrar.");
      }

      login(data.token, data.user);
      router.replace("/fluxo");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível entrar."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-amber-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-amber-600 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-900/40">
              <RiJewelryFill className="h-5 w-5 text-white" />
            </div>
            <span
              className={`${displayFont.className} text-2xl font-semibold tracking-wide text-white`}
            >
              Jewelry
            </span>
          </div>

          <div className="space-y-6">
            <h1
              className={`${displayFont.className} text-5xl xl:text-6xl font-semibold leading-tight text-white`}
            >
              Gestão elegante
              <br />
              <span className="text-amber-400">para joias</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-400">
              Controle kits, revendedoras e fluxo de vendas com precisão e
              sofisticação.
            </p>
          </div>

          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} Jewelry App
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center lg:items-start">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-200 lg:hidden">
              <RiJewelryFill className="h-6 w-6 text-white" />
            </div>
            <h2
              className={`${displayFont.className} text-3xl font-semibold text-slate-900`}
            >
              Bem-vindo
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Insira suas credenciais para acessar sua conta.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
            <form className="space-y-5" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </span>
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-slate-200 bg-slate-50/50 focus:ring-amber-400/40 focus:border-amber-400"
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 8.5v7A2.5 2.5 0 0 0 5.5 18h13A2.5 2.5 0 0 0 21 15.5v-7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 8.5l-9 6-9-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Senha
                </span>
                <TextInput
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-200 bg-slate-50/50 focus:ring-amber-400/40 focus:border-amber-400"
                  icon={
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 11V8a5 5 0 0 1 10 0v3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
              </label>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white font-medium shadow-md shadow-slate-900/20 cursor-pointer transition-all hover:from-slate-800 hover:to-slate-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
