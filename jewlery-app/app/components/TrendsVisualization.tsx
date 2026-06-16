"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

interface Trend {
  id: number;
  score: number;
  status: string;
  product: {
    id: number;
    nome: string;
    descricao: string;
    categoria: string;
    imagem: string | null;
  };
}

export default function TrendsVisualization() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    try {
      const response = await fetch(`${apiUrl}/trends`);
      if (!response.ok) throw new Error("Erro ao buscar tendências");
      const data = await response.json();
      setTrends(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${apiUrl}/trends/refresh`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Erro ao atualizar tendências");
      const result = await response.json();
      setTrends(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      await fetchTrends();
      setLoading(false);
    };
    initLoad();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-2xl font-bold text-gray-600">
          Carregando tendências...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-2xl font-bold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔥 Tendências em Alta
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Descubra quais semi-joias estão em destaque agora no Google Trends
          </p>

          {/* Botão de Atualizar */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              refreshing
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
            }`}
          >
            {refreshing ? "⏳ Atualizando..." : "🔄 Atualizar Tendências"}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl font-bold text-red-500">
              {trends.filter((t) => t.status === "alta").length}
            </div>
            <div className="text-gray-600">em alta tendência</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl font-bold text-yellow-500">
              {trends.length}
            </div>
            <div className="text-gray-600">produtos monitorados</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl font-bold text-green-500">
              {Math.round(
                trends.reduce((acc, t) => acc + t.score, 0) / trends.length
              )}
            </div>
            <div className="text-gray-600">score médio</div>
          </div>
        </div>

        {/* Trends Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trends.map((trend) => (
            <div
              key={trend.id}
              className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Imagem */}
              <div className="relative h-64 bg-gray-200 overflow-hidden">
                {trend.product.imagem ? (
                  <Image
                    src={trend.product.imagem}
                    alt={trend.product.nome}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Imagem não disponível
                  </div>
                )}
                {/* Badge Status */}
                <div
                  className={`absolute top-4 right-4 px-4 py-2 rounded-full text-white font-bold text-sm ${
                    trend.status === "alta" ? "bg-red-500" : "bg-yellow-500"
                  }`}
                >
                  {trend.status === "alta" ? "🔥 Em Alta" : "📈 Moderado"}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Nome */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {trend.product.nome.charAt(0).toUpperCase() +
                    trend.product.nome.slice(1)}
                </h3>

                {/* Descrição */}
                <p className="text-gray-600 text-sm mb-4">
                  {trend.product.descricao}
                </p>

                {/* Score Bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Score de Tendência
                    </span>
                    <span className="text-sm font-bold text-purple-600">
                      {trend.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        trend.score > 70
                          ? "bg-red-500"
                          : trend.score > 40
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${trend.score}%` }}
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                    {trend.product.categoria}
                  </span>
                  <span className="text-xs text-gray-500">
                    ID: {trend.product.id}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {trends.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              Nenhuma tendência encontrada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
