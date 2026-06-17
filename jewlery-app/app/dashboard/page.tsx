"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiBox,
  FiCheckCircle,
  FiPackage,
  FiRefreshCw,
  FiTrendingUp,
  FiTool,
} from "react-icons/fi";
import { LuLayoutDashboard } from "react-icons/lu";
import { apiUrl } from "@/lib/api";
import MainLayout from "../components/MainLayout";
import RequireAuth from "../components/RequireAuth";
import { formatBRL } from "../kit/kitUtils";

interface DashboardStats {
  estoque: {
    quantidade: number;
    valorCusto: number;
    valorVenda: number;
    produtosAtivos: number;
    produtosSemEstoque: number;
  };
  kitsMontados: {
    count: number;
    pecas: number;
    valorTotal: number;
  };
  kitsNoFluxo: {
    count: number;
    pecas: number;
    valorTotal: number;
  };
  kitsFinalizados: {
    count: number;
    pecas: number;
    valorTotal: number;
  };
  acertos: {
    pendentes: number;
    valorPendente: number;
  };
  baixoEstoque: {
    id: number;
    name: string;
    code: string | null;
    quantity: number;
  }[];
  recentKits: {
    id: number;
    kitNumber: number;
    status: string;
    grandTotal: number;
    issueDate: string;
    resellerName: string | null;
  }[];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function getStatusLabel(status: string) {
  if (status === "no_fluxo") return "No fluxo";
  if (status === "montado") return "Montado";
  if (status === "finalizado") return "Finalizado";
  if (status === "vinculado") return "Vinculado";
  return status;
}

function getStatusClass(status: string) {
  if (status === "no_fluxo") return "bg-blue-100 text-blue-800";
  if (status === "finalizado") return "bg-emerald-100 text-emerald-800";
  return "bg-amber-100 text-amber-800";
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  href?: string;
}

function KpiCard({ title, value, subtitle, icon, accent, href }: KpiCardProps) {
  const content = (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${href ? "cursor-pointer" : ""}`}
    >
      <div
        className={`absolute -right-3 -top-3 h-20 w-20 rounded-full opacity-10 ${accent}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white ${accent}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    try {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await fetch(`${apiUrl}/dashboard/stats`);
      if (!res.ok) throw new Error("Erro ao carregar dashboard");
      setStats(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar dashboard");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <LuLayoutDashboard className="text-lg" />
                <span className="text-sm font-medium">Visão geral</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Resumo do estoque, kits e operação da loja.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadStats(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <FiRefreshCw className={isRefreshing ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-white shadow-sm"
                />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <KpiCard
                  title="Itens em estoque"
                  value={stats.estoque.quantidade.toLocaleString("pt-BR")}
                  subtitle={`${stats.estoque.produtosAtivos} produtos ativos · ${stats.estoque.produtosSemEstoque} zerados`}
                  icon={<FiBox size={20} />}
                  accent="bg-slate-700"
                  href="/cadastro"
                />
                <KpiCard
                  title="Valor do estoque"
                  value={formatBRL(stats.estoque.valorCusto)}
                  subtitle={`Venda: ${formatBRL(stats.estoque.valorVenda)}`}
                  icon={<FiTrendingUp size={20} />}
                  accent="bg-emerald-600"
                  href="/cadastro"
                />
                <KpiCard
                  title="Kits montados"
                  value={String(stats.kitsMontados.count)}
                  subtitle={`${stats.kitsMontados.pecas} peças · ${formatBRL(stats.kitsMontados.valorTotal)}`}
                  icon={<FiTool size={20} />}
                  accent="bg-amber-500"
                  href="/kits"
                />
                <KpiCard
                  title="Valor kits montados"
                  value={formatBRL(stats.kitsMontados.valorTotal)}
                  subtitle={`${stats.kitsMontados.count} kits aguardando envio`}
                  icon={<FiPackage size={20} />}
                  accent="bg-amber-600"
                  href="/kits"
                />
                <KpiCard
                  title="Kits finalizados"
                  value={String(stats.kitsFinalizados.count)}
                  subtitle={`${stats.kitsFinalizados.pecas} peças · ${formatBRL(stats.kitsFinalizados.valorTotal)}`}
                  icon={<FiCheckCircle size={20} />}
                  accent="bg-blue-600"
                  href="/kits"
                />
                <KpiCard
                  title="Kits no fluxo"
                  value={String(stats.kitsNoFluxo.count)}
                  subtitle={`${stats.kitsNoFluxo.pecas} peças · ${formatBRL(stats.kitsNoFluxo.valorTotal)}`}
                  icon={<LuLayoutDashboard size={20} />}
                  accent="bg-indigo-600"
                  href="/fluxo"
                />
              </div>

              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Acertos pendentes
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.acertos.pendentes}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Valor a receber:{" "}
                    <span className="font-semibold text-slate-800">
                      {formatBRL(stats.acertos.valorPendente)}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Capital em circulação
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatBRL(
                      stats.kitsMontados.valorTotal + stats.kitsNoFluxo.valorTotal
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Soma dos kits montados e no fluxo (fora do estoque físico)
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h2 className="font-semibold text-slate-800">Kits recentes</h2>
                    <Link
                      href="/kits"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Ver todos
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Kit</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Revendedora</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentKits.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              Nenhum kit cadastrado.
                            </td>
                          </tr>
                        ) : (
                          stats.recentKits.map((kit) => (
                            <tr
                              key={kit.id}
                              className="border-t border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                <Link
                                  href="/kits"
                                  className="font-medium text-slate-800 hover:text-blue-600"
                                >
                                  #{kit.kitNumber}
                                </Link>
                                <p className="text-xs text-slate-500">
                                  {formatDate(kit.issueDate)}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(kit.status)}`}
                                >
                                  {getStatusLabel(kit.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {kit.resellerName ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                                {formatBRL(kit.grandTotal)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h2 className="font-semibold text-slate-800">
                      Estoque baixo
                    </h2>
                    <Link
                      href="/cadastro"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Gerenciar
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3 text-right">Qtd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.baixoEstoque.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              Nenhum produto com estoque baixo.
                            </td>
                          </tr>
                        ) : (
                          stats.baixoEstoque.map((product) => (
                            <tr
                              key={product.id}
                              className="border-t border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {product.name}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {product.code ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                                    product.quantity === 0
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {product.quantity}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              Não foi possível carregar os dados. Tente atualizar a página.
            </div>
          )}
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
