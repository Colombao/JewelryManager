"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

interface MarketplaceTrend {
  posicao: number;
  nome: string;
  vendidos: number;
  preco: number;
  marketplace: string;
  categoria: string;
  imagem: string;
  crescimento: number;
  rating: number;
  score: number;
}

interface MarketplaceData {
  timestamp: string;
  fonte: string;
  totalProdutos: number;
  topTrends: MarketplaceTrend[];
}

function getMarketplaceIcon(marketplace: string): string {
  const icons: Record<string, string> = {
    "mercado-livre": "🟡 Mercado Livre",
    amazon: "🟠 Amazon",
    facebook: "🔵 Facebook Marketplace",
  };
  return icons[marketplace] || marketplace;
}

function getCrescimentoColor(crescimento: number): string {
  if (crescimento >= 50) return "text-green-600 bg-green-100";
  if (crescimento >= 30) return "text-blue-600 bg-blue-100";
  return "text-orange-600 bg-orange-100";
}

export default function MarketplaceTrends() {
  const [trends, setTrends] = useState<MarketplaceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiUrl}/marketplace/trends-alta?limit=10`
      );
      if (!response.ok) throw new Error("Erro ao buscar tendências");
      const data: MarketplaceData = await response.json();
      setTrends(data.topTrends);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setTrends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔥</div>
          <div className="text-2xl font-bold text-gray-600">
            Carregando tendências em alta...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-2xl font-bold text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🔥 Tendências em Alta
          </h1>
          <p className="text-xl text-slate-300">
            Os produtos semi-joia mais vendidos e com maior crescimento nos
            principais marketplaces
          </p>
        </div>

        {/* GRID DE TENDÊNCIAS */}
        <div className="space-y-4">
          {trends.map((trend) => (
            <div
              key={`${trend.marketplace}-${trend.nome}`}
              className="group bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 hover:border-purple-500 rounded-lg overflow-hidden transition transform hover:scale-102 hover:shadow-xl"
            >
              <div className="flex gap-6 p-6">
                {/* Posição Badge */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      #{trend.posicao}
                    </span>
                  </div>
                </div>

                {/* Imagem do Produto */}
                <div className="flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden bg-slate-600">
                  <Image
                    src={trend.imagem}
                    alt={trend.nome}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Informações Principais */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {trend.nome}
                      </h3>
                      <div className="text-sm text-slate-400">
                        {getMarketplaceIcon(trend.marketplace)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* Vendidos */}
                    <div>
                      <div className="text-slate-400 mb-1">Vendidos</div>
                      <div className="text-lg font-bold text-green-400">
                        {trend.vendidos.toLocaleString()}
                      </div>
                    </div>

                    {/* Preço */}
                    <div>
                      <div className="text-slate-400 mb-1">Preço</div>
                      <div className="text-lg font-bold text-white">
                        R$ {trend.preco.toFixed(2)}
                      </div>
                    </div>

                    {/* Crescimento */}
                    <div>
                      <div className="text-slate-400 mb-1">Crescimento</div>
                      <div
                        className={`text-lg font-bold px-3 py-1 rounded inline-block ${getCrescimentoColor(
                          trend.crescimento
                        )}`}
                      >
                        +{trend.crescimento}%
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <div className="text-slate-400 mb-1">Avaliação</div>
                      <div className="text-lg font-bold text-yellow-400">
                        ⭐ {trend.rating}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Visual */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2">
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Score</div>
                    <div className="text-3xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {trend.score}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center bg-slate-700/50">
                    <div
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-30"
                      style={{
                        width: `${(trend.score / 100) * 40 + 8}px`,
                        height: `${(trend.score / 100) * 40 + 8}px`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Progress Bar - Crescimento Visual */}
              <div className="h-1 bg-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(trend.crescimento * 2, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stats Footer */}
        <div className="mt-12 grid grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">Total de Produtos</div>
            <div className="text-4xl font-bold text-white">{trends.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">Crescimento Médio</div>
            <div className="text-4xl font-bold text-green-400">
              +
              {Math.round(
                trends.reduce((acc, t) => acc + t.crescimento, 0) /
                  trends.length
              )}
              %
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">Avaliação Média</div>
            <div className="text-4xl font-bold text-yellow-400">
              ⭐{" "}
              {(
                trends.reduce((acc, t) => acc + t.rating, 0) / trends.length
              ).toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
