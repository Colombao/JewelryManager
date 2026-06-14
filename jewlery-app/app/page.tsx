"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TextInput from "./components/TextInput";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));

      router.push("/fluxo");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível entrar."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f7ff] flex items-center justify-center font-sans px-4">
      <div className="flex flex-col items-center w-full max-w-3xl">
        <div className="mt-14 mb-6">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
            <polygon
              points="28,4 48,24 28,52 8,24"
              fill="url(#g)"
              stroke="#1e40af"
              strokeWidth="1"
            />
            <path
              d="M28 4 L36 24 L28 32 L20 24 Z"
              fill="#93c5fd"
              opacity="0.9"
            />
            <path
              d="M28 32 L36 24 L48 24 L28 52 Z"
              fill="#3b82f6"
              opacity="0.08"
            />
            <path
              d="M28 4 L20 24 L8 24 L28 52 Z"
              fill="#60a5fa"
              opacity="0.06"
            />
          </svg>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-center text-2xl font-semibold text-slate-700">
              Bem-vindo
            </h2>
            <p className="text-center text-sm text-slate-400 mt-2">
              Insira suas credenciais para acessar sua conta.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <label className="block">
                <span className="sr-only">Email</span>
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Digite seu email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 8.5l-9 6-9-6"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
              </label>

              <label className="block">
                <span className="sr-only">Password</span>
                <TextInput
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 11V8a5 5 0 0 1 10 0v3"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
              </label>

              {errorMessage && (
                <p className="text-sm text-red-600 text-center">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-b from-blue-500 to-blue-600 text-white rounded-md font-medium shadow-sm cursor-pointer hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            {/* <div className="text-center mt-6 text-sm text-slate-400">
              Esqueceu sua senha?{" "}
              <a href="#" className="text-blue-600 font-medium">
                Redefinir senha
              </a>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
