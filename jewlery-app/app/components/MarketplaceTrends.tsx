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
    "estoque-analisado": "Tendência de mercado",
    amazon: "Amazon",
    facebook: "Facebook Marketplace",
  };
  return icons[marketplace] || marketplace;
}

const CATEGORY_PLACEHOLDERS: Array<{
  match: RegExp;
  emoji: string;
  gradient: string;
}> = [
  { match: /brinco/i, emoji: "✨", gradient: "from-amber-400 to-orange-500" },
  { match: /anel/i, emoji: "💍", gradient: "from-purple-500 to-pink-500" },
  { match: /colar|corrente|pingente/i, emoji: "📿", gradient: "from-rose-400 to-red-500" },
  { match: /pulseira/i, emoji: "⌚", gradient: "from-yellow-400 to-amber-500" },
  { match: /tornozeleira/i, emoji: "🦶", gradient: "from-teal-400 to-cyan-500" },
  { match: /berloque/i, emoji: "🔮", gradient: "from-indigo-400 to-violet-500" },
  { match: /conjunto|mix/i, emoji: "🎁", gradient: "from-fuchsia-400 to-purple-500" },
];

function getCategoryPlaceholder(categoria: string) {
  const found = CATEGORY_PLACEHOLDERS.find((item) =>
    item.match.test(categoria)
  );
  return found || { emoji: "💎", gradient: "from-slate-500 to-slate-700" };
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
  category,
}: {
  image: string | null;
  alt: string;
  sizeClass?: string;
  category?: string;
}) {
  const imageUrl = image?.startsWith("http") ? image : resolveImageUrl(image);
  const placeholder = getCategoryPlaceholder(category || alt);

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
        <div
          className={`h-full w-full bg-gradient-to-br ${placeholder.gradient} flex items-center justify-center`}
        >
          <span className="text-2xl" aria-hidden>
            {placeholder.emoji}
          </span>
        </div>
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchTrends = useCallback(async (options?: { refresh?: boolean }) => {
    const isRefresh = Boolean(options?.refresh && hasLoaded);

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({ limit: "10" });
      if (!hasLoaded || options?.refresh) {
        params.set("refresh", "1");
      }

      const response = await fetch(
        `${apiUrl}/marketplace/trends-alta?${params.toString()}`,
        { cache: "no-store" }
      );
      const data: MarketplaceData & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar tendências");
      }

      const hasMercadoLivreData = (data.topTrends || []).some(
        (trend) => trend.marketplace === "mercado-livre" && trend.imagem
      );

      if ((data.topTrends?.length ?? 0) > 0 && !hasMercadoLivreData) {
        throw new Error(
          "O backend retornou dados antigos (sem fotos do Mercado Livre). Pare o processo na porta 3001, rode npm run dev em jewlery-back e clique em Atualizar."
        );
      }

      setTrends(data.topTrends || []);
      setMeta({ fonte: data.fonte, timestamp: data.timestamp });
      setError(null);
      setHasLoaded(true);
    } catch (err) {
      if (!hasLoaded) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setTrends([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasLoaded]);

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

  if (loading && !hasLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔥</div>
          <div className="text-2xl font-bold text-gray-600">
            Buscando anúncios reais no Mercado Livre...
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Extraindo fotos, preços e vendidos dos top anúncios. Isso pode levar
            até 2 minutos na primeira carga.
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
            onClick={() => fetchTrends()}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isMercadoLivreUnavailable = meta?.fonte?.includes("indisponível");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className={`max-w-7xl mx-auto transition-opacity ${refreshing ? "opacity-70" : ""}`}>
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Tendências em Alta
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto px-2">
            Produtos em destaque no mercado cruzados com o que você tem em
            estoque para montar kits mais assertivos.
          </p>
          {meta && (
            <p className="text-sm text-slate-500 mt-3">
              Fonte: {meta.fonte} · Atualizado em{" "}
              {new Date(meta.timestamp).toLocaleString("pt-BR")}
            </p>
          )}
          {isMercadoLivreUnavailable && (
            <p className="text-sm text-amber-300 mt-2 max-w-2xl mx-auto px-2">
              Não foi possível conectar ao Mercado Livre agora. Clique em
              Atualizar para tentar de novo.
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fetchTrends({ refresh: true })}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-purple-400 disabled:opacity-60 disabled:cursor-wait"
            >
              {refreshing ? "Atualizando..." : "Atualizar"}
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
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
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
                          category={trend.categoria}
                          sizeClass="w-20 h-20"
                        />
                      </a>
                    ) : (
                      <ProductThumbnail
                        image={getTrendDisplayImage(trend)}
                        alt={trend.nome}
                        category={trend.categoria}
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
                        {trend.marketplace === "mercado-livre" && trend.itemId
                          ? ` · ${trend.itemId}`
                          : ""}
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

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <div className="text-slate-400 mb-1">Demanda</div>
                          <div className="text-lg font-bold text-green-400">
                            {trend.vendidos.toLocaleString("pt-BR")}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Preço ref.</div>
                          <div className="text-lg font-bold text-white">
                            R$ {trend.preco.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Avaliação</div>
                          <div className="text-lg font-bold text-yellow-400">
                            ★ {trend.rating.toFixed(1)}
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
                          : "border-slate-500/40 bg-slate-500/10"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">
                        Seu estoque
                      </p>
                      <p className="text-lg font-bold text-white">
                        {hasStock
                          ? `${trend.estoqueDisponivel} produto(s) compatível(is)`
                          : "Nenhum produto compatível ainda"}
                      </p>
                      {!hasStock && (
                        <p className="text-xs text-slate-400 mt-1">
                          Cadastre itens em {trend.categoria} para cruzar com esta tendência.
                        </p>
                      )}
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

        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">Tendências exibidas</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{trends.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">
              Com produtos no estoque
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400">
              {stats.withStock}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-sm text-slate-400 mb-2">Crescimento médio</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400">
              +{stats.avgGrowth}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
