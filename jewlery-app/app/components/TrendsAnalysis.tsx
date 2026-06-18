"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";

interface Trend {
  keyword: string;
  value: number;
  status: string;
  category: string;
  imagem: string;
}

interface CategoryAnalysis {
  total: number;
  mediaScore: number;
  maxScore: number;
  minScore: number;
  trending: number;
  topKeyword: { keyword: string; value: number };
}

interface AnalysisData {
  timestamp: string;
  summary: {
    totalKeywords: number;
    trendingFound: number;
    mediaGeral: number;
  };
  byCategory: {
    [key: string]: CategoryAnalysis;
  };
  allTrends: Trend[];
}

function getTrendColor(value: number): string {
  if (value >= 75) return "from-green-500 to-emerald-500";
  if (value >= 50) return "from-blue-500 to-cyan-500";
  if (value >= 25) return "from-yellow-500 to-orange-500";
  return "from-red-500 to-pink-500";
}

function getStatusBadge(value: number): string {
  if (value >= 75) return "🔥 Alta";
  if (value >= 50) return "📈 Média";
  if (value >= 25) return "📉 Baixa";
  return "⏸️ Morta";
}

export default function TrendsAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/trends/analysis`);
      if (!response.ok) throw new Error("Erro ao buscar análise");
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryKeywords = (category: string): Trend[] => {
    return analysis?.allTrends.filter((t) => t.category === category) || [];
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      produtos: "🛍️",
      materiais: "💎",
      tendencias: "✨",
      compra: "💳",
    };
    return icons[category] || "📌";
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      produtos: "Produtos",
      materiais: "Materiais",
      tendencias: "Tendências de Estilo",
      compra: "Intenção de Compra",
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Análise Google Trends de Tendências
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 px-2">
            {analysis ? (
              <>
                Inteligência de mercado: Monitoramento de{" "}
                <span className="font-bold text-purple-300">
                  {analysis.summary.totalKeywords}
                </span>{" "}
                keywords em{" "}
                <span className="font-bold text-pink-300">
                  {Object.keys(analysis.byCategory).length}
                </span>{" "}
                categorias
              </>
            ) : (
              "Inteligência de mercado em tempo real"
            )}
          </p>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`px-8 py-4 rounded-lg font-semibold transition text-lg ${
              loading
                ? "bg-slate-600 text-white cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
            }`}
          >
            {loading ? "⏳ Analisando..." : "🔍 Gerar Análise Completa"}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 text-red-200 rounded-lg border border-red-500">
              {error}
            </div>
          )}
        </div>

        {analysis && (
          <div className="space-y-8">
            {/* RESUMO EXECUTIVO */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                📈 Resumo Executivo
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 rounded-lg p-6">
                  <div className="text-sm text-blue-300 mb-2">
                    Total de Keywords Monitoradas
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-100">
                    {analysis.summary.totalKeywords}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/30 rounded-lg p-6">
                  <div className="text-sm text-purple-300 mb-2">
                    Palavras em Tendência
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-100">
                    {analysis.summary.trendingFound}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-400/30 rounded-lg p-6">
                  <div className="text-sm text-pink-300 mb-2">
                    Score Médio Geral
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-pink-100">
                    {analysis.summary.mediaGeral}
                  </div>
                </div>
              </div>
            </div>

            {/* ANÁLISE POR CATEGORIA */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                🎯 Análise por Categoria
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(analysis.byCategory).map(([category, data]) => (
                  <div
                    key={category}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-6"
                  >
                    <h3 className="text-xl font-bold text-white capitalize mb-4">
                      {getCategoryIcon(category)} {getCategoryLabel(category)}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total:</span>
                        <span className="text-white font-semibold">
                          {data.total}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Score Médio:</span>
                        <span className="text-white font-semibold">
                          {data.mediaScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Maior Score:</span>
                        <span className="text-green-400 font-semibold">
                          {data.maxScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Em Alta:</span>
                        <span className="text-pink-400 font-semibold">
                          {data.trending}
                        </span>
                      </div>

                      {data.topKeyword && (
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <div className="text-sm text-slate-400 mb-2">
                            🔥 Top Keyword
                          </div>
                          <div className="text-white font-semibold">
                            {data.topKeyword.keyword}
                          </div>
                          <div className="text-sm text-purple-300">
                            Score: {data.topKeyword.value}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KEYWORDS MONITORADAS POR CATEGORIA */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                📋 Keywords Monitoradas por Categoria
              </h2>

              <div className="space-y-6">
                {Object.entries(analysis.byCategory).map(([category, data]) => {
                  const keywords = getCategoryKeywords(category);
                  const isExpanded = expandedCategory === category;

                  return (
                    <div key={category}>
                      <button
                        onClick={() =>
                          setExpandedCategory(isExpanded ? null : category)
                        }
                        className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-2xl">
                            {getCategoryIcon(category)}
                          </span>
                          <div>
                            <div className="text-lg font-semibold text-white">
                              {getCategoryLabel(category)}
                            </div>
                            <div className="text-sm text-slate-400">
                              {keywords.length} keywords monitoradas
                            </div>
                          </div>
                        </div>
                        <div className="text-slate-400">
                          {isExpanded ? "▼" : "▶"}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                          {keywords
                            .sort((a, b) => b.value - a.value)
                            .map((keyword, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3"
                              >
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-white font-medium">
                                      {keyword.keyword}
                                    </span>
                                    <span className="text-white font-bold ml-2">
                                      {keyword.value}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full bg-gradient-to-r ${getTrendColor(
                                        keyword.value
                                      )} transition-all`}
                                      style={{ width: `${keyword.value}%` }}
                                    />
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">
                                    {getStatusBadge(keyword.value)}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOP 10 KEYWORDS GLOBAIS */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                🏆 Top 10 Keywords Globais
              </h2>

              <div className="space-y-3">
                {analysis.allTrends
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 10)
                  .map((trend, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl font-bold text-purple-400 w-8">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-white font-semibold">
                            {trend.keyword}
                          </div>
                          <div className="text-xs text-slate-400">
                            {getCategoryIcon(trend.category)}{" "}
                            {getCategoryLabel(trend.category)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getTrendColor(
                              trend.value
                            )}`}
                            style={{ width: `${trend.value}%` }}
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">
                            {trend.value}
                          </div>
                          <div className="text-xs text-slate-400">
                            {getStatusBadge(trend.value)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* TIMESTAMP */}
            <div className="text-center text-slate-400 text-sm">
              Análise gerada em:{" "}
              {new Date(analysis.timestamp).toLocaleString("pt-BR")}
            </div>
          </div>
        )}

        {!analysis && !loading && (
          <div className="text-center text-slate-400 py-12">
            <p className="text-lg">
              Clique no botão acima para gerar a análise completa
            </p>
            <p className="text-sm mt-2">
              A análise levará alguns segundos para processar 42 keywords...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
