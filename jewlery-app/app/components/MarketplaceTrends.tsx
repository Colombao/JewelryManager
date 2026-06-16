"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";
import { resolveImageUrl, saveTrendKitPayload } from "../kit/kitUtils";

interface StockProductMatch {
  id: number;
  nome: string;
  referencia: string;
  categoria: string;
  estoque: number;
  preco: number;
  imagem: string | null;
}

interface MarketplaceTrend {
  posicao: number;
  termoTendencia?: string;
  nome: string;
  vendidos: number;
  preco: number;
  marketplace: string;
  categoria: string;
  categoriasSugeridas?: string[];
  imagem: string | null;
  url?: string | null;
  urlBusca?: string | null;
  itemId?: string | null;
  crescimento: number;
  rating: number;
  score: number;
  produtosEstoque?: StockProductMatch[];
  estoqueDisponivel?: number;
}

interface MarketplaceData {
  timestamp: string;
  fonte: string;
  totalProdutos: number;
  topTrends: MarketplaceTrend[];
}

function getMarketplaceIcon(marketplace: string): string {
  const icons: Record<string, string> = {
    "mercado-livre": "Mercado Livre",
    "estoque-analisado": "Seu estoque",
    amazon: "Amazon",
    facebook: "Facebook Marketplace",
  };
  return icons[marketplace] || marketplace;
}

function getCrescimentoColor(crescimento: number): string {
  if (crescimento >= 50) return "text-green-600 bg-green-100";
  if (crescimento >= 30) return "text-blue-600 bg-blue-100";
  return "text-orange-600 bg-orange-100";
}

function getTrendDisplayImage(trend: MarketplaceTrend): string | null {
  if (!trend.imagem) return null;
  if (trend.imagem.startsWith("http")) return trend.imagem;
  return resolveImageUrl(trend.imagem);
}

function getMercadoLivreLink(trend: MarketplaceTrend): string | null {
  return trend.url || trend.urlBusca || null;
}

function ProductThumbnail({
  image,
  alt,
  sizeClass = "w-20 h-20",
}: {
  image: string | null;
  alt: string;
  sizeClass?: string;
}) {
  const imageUrl = image?.startsWith("http") ? image : resolveImageUrl(image);

  return (
    <div
      className={`relative ${sizeClass} rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 flex items-center justify-center`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-[10px] text-slate-400 text-center px-1">Sem foto</span>
      )}
    </div>
  );
}

export default function MarketplaceTrends() {
  const router = useRouter();
  const [trends, setTrends] = useState<MarketplaceTrend[]>([]);
  const [meta, setMeta] = useState<{ fonte: string; timestamp: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiUrl}/marketplace/trends-alta?limit=10`
      );
      const data: MarketplaceData & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar tendências");
      }

      setTrends(data.topTrends || []);
      setMeta({ fonte: data.fonte, timestamp: data.timestamp });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setTrends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const stats = useMemo(() => {
    if (trends.length === 0) {
      return { avgGrowth: 0, avgRating: 0, withStock: 0 };
    }

    return {
      avgGrowth: Math.round(
        trends.reduce((acc, trend) => acc + trend.crescimento, 0) /
          trends.length
      ),
      avgRating:
        trends.reduce((acc, trend) => acc + trend.rating, 0) / trends.length,
      withStock: trends.filter((trend) => (trend.estoqueDisponivel ?? 0) > 0)
        .length,
    };
  }, [trends]);

  function handleBuildKit(trend: MarketplaceTrend) {
    const inStock = (trend.produtosEstoque || []).filter(
      (product) => product.estoque > 0
    );

    if (inStock.length === 0) {
      alert("Nenhum produto em estoque corresponde a esta tendência.");
      return;
    }

    saveTrendKitPayload({
      trendName: trend.nome,
      categories: trend.categoriasSugeridas || [trend.categoria],
      productIds: inStock.map((product) => product.id),
      maxKitValue: 1600,
    });

    router.push("/kit");
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔥</div>
          <div className="text-2xl font-bold text-gray-600">
            Buscando anúncios reais no Mercado Livre...
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Isso pode levar até 1 minuto na primeira carga.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center max-w-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-2xl font-bold text-red-600 mb-4">{error}</div>
          <button
            type="button"
            onClick={fetchTrends}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            Tendências em Alta
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Produtos em destaque no mercado cruzados com o que você tem em
            estoque para montar kits mais assertivos.
          </p>
          {meta && (
            <p className="text-sm text-slate-500 mt-3">
              Fonte: {meta.fonte} · Atualizado em{" "}
              {new Date(meta.timestamp).toLocaleString("pt-BR")}
            </p>
          )}
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={fetchTrends}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-purple-400"
            >
              Atualizar
            </button>
            <Link
              href="/kit"
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
            >
              Ir para montar kit
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {trends.map((trend) => {
            const stockMatches = trend.produtosEstoque || [];
            const hasStock = (trend.estoqueDisponivel ?? 0) > 0;

            return (
              <div
                key={`${trend.marketplace}-${trend.posicao}-${trend.nome}`}
                className="group bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 hover:border-purple-500 rounded-lg overflow-hidden transition hover:shadow-xl"
              >
                <div className="flex flex-col lg:flex-row gap-6 p-6">
                  <div className="flex gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          #{trend.posicao}
                        </span>
                      </div>
                    </div>

                    {getMercadoLivreLink(trend) ? (
                      <a
                        href={getMercadoLivreLink(trend)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver anúncio no Mercado Livre"
                      >
                        <ProductThumbnail
                          image={getTrendDisplayImage(trend)}
                          alt={trend.nome}
                          sizeClass="w-20 h-20"
                        />
                      </a>
                    ) : (
                      <ProductThumbnail
                        image={getTrendDisplayImage(trend)}
                        alt={trend.nome}
                        sizeClass="w-20 h-20"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">
                        {trend.nome}
                      </h3>
                      {trend.termoTendencia &&
                        trend.termoTendencia !== trend.nome && (
                          <p className="text-xs text-purple-300 mb-2">
                            Tendência buscada: {trend.termoTendencia}
                          </p>
                        )}
                      <div className="text-sm text-slate-400 mb-3">
                        {getMarketplaceIcon(trend.marketplace)}
                        {trend.categoria ? ` · ${trend.categoria}` : ""}
                      </div>

                      {getMercadoLivreLink(trend) && (
                        <a
                          href={getMercadoLivreLink(trend)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-yellow-400 hover:text-yellow-300 mb-3"
                        >
                          Ver anúncio no Mercado Livre ↗
                        </a>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-slate-400 mb-1">Demanda</div>
                          <div className="text-lg font-bold text-green-400">
                            {trend.vendidos.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Preço ref.</div>
                          <div className="text-lg font-bold text-white">
                            R$ {trend.preco.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Crescimento</div>
                          <div
                            className={`text-sm font-bold px-2 py-1 rounded inline-block ${getCrescimentoColor(
                              trend.crescimento
                            )}`}
                          >
                            +{trend.crescimento}%
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Score</div>
                          <div className="text-lg font-bold text-purple-300">
                            {trend.score}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-72 flex flex-col gap-3">
                    <div
                      className={`rounded-lg p-3 border ${
                        hasStock
                          ? "border-green-500/40 bg-green-500/10"
                          : "border-orange-500/40 bg-orange-500/10"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">
                        Seu estoque
                      </p>
                      <p className="text-lg font-bold text-white">
                        {hasStock
                          ? `${trend.estoqueDisponivel} produto(s) compatível(is)`
                          : "Sem match no estoque"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBuildKit(trend)}
                      disabled={!hasStock}
                      className="w-full px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Montar kit com esta tendência
                    </button>
                  </div>
                </div>

                {stockMatches.length > 0 && (
                  <div className="px-6 pb-5 border-t border-slate-600/60 pt-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
                      Produtos do seu cadastro relacionados
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {stockMatches.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 rounded-md bg-slate-900/40 border border-slate-600/50 p-2"
                        >
                          <ProductThumbnail
                            image={product.imagem}
                            alt={product.nome}
                            sizeClass="w-12 h-12"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {product.referencia}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {product.nome}
                            </p>
                            <p className="text-xs text-green-400">
                              Estoque: {product.estoque} · R${" "}
                              {product.preco.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-1 bg-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(trend.crescimento, 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">Tendências exibidas</div>
            <div className="text-4xl font-bold text-white">{trends.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">
              Com produtos no estoque
            </div>
            <div className="text-4xl font-bold text-green-400">
              {stats.withStock}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">Crescimento médio</div>
            <div className="text-4xl font-bold text-yellow-400">
              +{stats.avgGrowth}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
