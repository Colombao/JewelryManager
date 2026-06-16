"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { Cormorant_Garamond } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RiJewelryFill } from "react-icons/ri";
import TextInput from "../../components/TextInput";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RevendedoraLoginPage() {
  const router = useRouter();
  const { login, token, user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoading && token) {
      router.replace(user?.role === "reseller" ? "/revendedora" : "/fluxo");
    }
  }, [isLoading, token, user?.role, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/reseller-portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível entrar.");
      }

      login(data.token, data.user);
      router.replace("/revendedora");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível entrar."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-slate-800">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute top-16 -left-16 h-72 w-72 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-blue-600 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
              <RiJewelryFill className="h-5 w-5 text-white" />
            </div>
            <span
              className={`${displayFont.className} text-2xl font-semibold tracking-wide text-white`}
            >
              Jewelry
            </span>
          </div>

          <div className="space-y-5">
            <h1
              className={`${displayFont.className} text-4xl xl:text-5xl font-semibold leading-tight text-white`}
            >
              Seu kit,
              <br />
              <span className="text-blue-300">suas vendas</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-400">
              Acesse o kit consignado, marque o que vendeu e acompanhe quanto
              precisa acertar com a empresa.
            </p>
          </div>

          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} Jewelry App
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h2
              className={`${displayFont.className} text-3xl font-semibold text-slate-900`}
            >
              Entrar como revendedora
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Use o e-mail e a senha cadastrados pela empresa.
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
                  placeholder="revendedora@email.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  className="border-slate-200 bg-slate-50/50 focus:ring-blue-400/40 focus:border-blue-400"
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
                  onChange={(e: any) => setPassword(e.target.value)}
                  className="border-slate-200 bg-slate-50/50 focus:ring-blue-400/40 focus:border-blue-400"
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
                className="w-full h-12 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-md cursor-pointer transition-all hover:from-blue-500 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Entrando..." : "Acessar meu kit"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              É da equipe administrativa?{" "}
              <Link href="/" className="font-medium text-blue-600 hover:underline">
                Login da empresa
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
