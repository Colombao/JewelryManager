"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowUpRight,
  FiBarChart2,
  FiExternalLink,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";
import { apiUrl } from "@/lib/api";
import { resolveImageUrl, saveTrendKitPayload } from "../kit/kitUtils";

type TabId = "overview" | "oportunidades" | "repor" | "categorias";

interface TimelinePoint {
  date: string;
  value: number;
}

interface StockProductMatch {
  id: number;
  nome: string;
  referencia: string;
  categoria: string;
  estoque: number;
  preco: number;
  imagem: string | null;
}

interface GoogleTrendData {
  value: number;
  momentum: number;
  googleDisponivel: boolean;
  timeline: TimelinePoint[];
  status: string;
}

interface DemandaData {
  score: number;
  fonte: "google" | "mercado" | "nenhuma";
  label: string;
}

interface MarketplaceRef {
  demandaReferencia: number;
  termoReferencia: string | null;
}

interface CategoryEstoque {
  totalProdutos: number;
  produtosEmEstoque: number;
  unidadesEstoque: number;
  semEstoque: number;
  estoqueBaixo: number;
  emKits: number;
  valorEstoque: number;
  percentualEstoque: number;
  precoMedio: number;
  precoMin: number;
  precoMax: number;
}

interface CategoryTrend {
  categoryId: number;
  categoryName: string;
  tipoPeca: string;
  material: string;
  searchTerm: string;
  google: GoogleTrendData;
  demanda: DemandaData;
  marketplaceRef: MarketplaceRef;
  estoque: CategoryEstoque;
  topProdutos: StockProductMatch[];
  prioridade: number;
}

interface AnalysisData {
  timestamp: string;
  fonte: string;
  summary: {
    totalCategorias: number;
    comEstoque: number;
    semEstoque: number;
    totalProdutos: number;
    totalUnidades: number;
    valorTotalEstoque: number;
    googleConsultadas: number;
    googleComDados: number;
    oportunidades: number;
    repor: number;
  };
  insights: {
    oportunidades: CategoryTrend[];
    repor: CategoryTrend[];
    destaqueEstoque: CategoryTrend[];
    emAlta: CategoryTrend[];
  };
  categories: CategoryTrend[];
}

const EMPTY_INSIGHTS: AnalysisData["insights"] = {
  oportunidades: [],
  repor: [],
  destaqueEstoque: [],
  emAlta: [],
};

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "oportunidades", label: "Oportunidades" },
  { id: "repor", label: "Repor estoque" },
  { id: "categorias", label: "Todas categorias" },
];

function normalizeCategory(raw: Record<string, unknown>): CategoryTrend {
  const googleRaw = (raw.google as Partial<GoogleTrendData>) ?? {};
  const estoqueRaw = (raw.estoque as Partial<CategoryEstoque>) ?? {};
  const demandaRaw = (raw.demanda as Partial<DemandaData>) ?? {};
  const marketplaceRaw = (raw.marketplaceRef as Partial<MarketplaceRef>) ?? {};
  const topProdutos = (raw.topProdutos as StockProductMatch[]) ?? [];
  const timeline =
    googleRaw.timeline ??
    (raw.timeline as TimelinePoint[] | undefined) ??
    [];

  const google: GoogleTrendData = {
    value: googleRaw.value ?? (raw.value as number) ?? 0,
    momentum: googleRaw.momentum ?? (raw.momentum as number) ?? 0,
    googleDisponivel: googleRaw.googleDisponivel ?? false,
    timeline,
    status: googleRaw.status ?? "morta",
  };

  const demanda: DemandaData = {
    score:
      demandaRaw.score ??
      (google.googleDisponivel ? google.value : marketplaceRaw.demandaReferencia ?? 0),
    fonte: demandaRaw.fonte ?? (google.googleDisponivel ? "google" : "nenhuma"),
    label: demandaRaw.label ?? "Demanda",
  };

  const estoque: CategoryEstoque = {
    totalProdutos: estoqueRaw.totalProdutos ?? topProdutos.length,
    produtosEmEstoque:
      estoqueRaw.produtosEmEstoque ??
      (raw.estoqueDisponivel as number) ??
      topProdutos.filter((p) => p.estoque > 0).length,
    unidadesEstoque:
      estoqueRaw.unidadesEstoque ??
      topProdutos.reduce((sum, p) => sum + p.estoque, 0),
    semEstoque: estoqueRaw.semEstoque ?? 0,
    estoqueBaixo: estoqueRaw.estoqueBaixo ?? 0,
    emKits: estoqueRaw.emKits ?? 0,
    valorEstoque: estoqueRaw.valorEstoque ?? 0,
    percentualEstoque: estoqueRaw.percentualEstoque ?? 0,
    precoMedio: estoqueRaw.precoMedio ?? 0,
    precoMin: estoqueRaw.precoMin ?? 0,
    precoMax: estoqueRaw.precoMax ?? 0,
  };

  return {
    categoryId: (raw.categoryId as number) ?? 0,
    categoryName:
      (raw.categoryName as string) ?? (raw.keyword as string) ?? "Sem categoria",
    tipoPeca: (raw.tipoPeca as string) ?? "Outros",
    material: (raw.material as string) ?? "Geral",
    searchTerm:
      (raw.searchTerm as string) ??
      (raw.keyword as string) ??
      (raw.categoryName as string) ??
      "",
    google,
    demanda,
    marketplaceRef: {
      demandaReferencia: marketplaceRaw.demandaReferencia ?? 0,
      termoReferencia: marketplaceRaw.termoReferencia ?? null,
    },
    estoque,
    topProdutos:
      topProdutos.length > 0
        ? topProdutos
        : ((raw.produtosEstoque as StockProductMatch[]) ?? []),
    prioridade: (raw.prioridade as number) ?? demanda.score,
  };
}

function normalizeAnalysisResponse(raw: Record<string, unknown>): AnalysisData {
  const categoriesSource =
    (raw.categories as Record<string, unknown>[] | undefined) ??
    (raw.allTrends as Record<string, unknown>[] | undefined) ??
    [];

  const categories = categoriesSource.map(normalizeCategory);
  const rawInsights = (raw.insights as Partial<AnalysisData["insights"]>) ?? {};
  const rawSummary = (raw.summary as Partial<AnalysisData["summary"]>) ?? {};

  const insights: AnalysisData["insights"] = {
    oportunidades:
      rawInsights.oportunidades?.map((item) =>
        normalizeCategory(item as unknown as Record<string, unknown>)
      ) ?? EMPTY_INSIGHTS.oportunidades,
    repor:
      rawInsights.repor?.map((item) =>
        normalizeCategory(item as unknown as Record<string, unknown>)
      ) ?? EMPTY_INSIGHTS.repor,
    destaqueEstoque:
      rawInsights.destaqueEstoque?.map((item) =>
        normalizeCategory(item as unknown as Record<string, unknown>)
      ) ?? EMPTY_INSIGHTS.destaqueEstoque,
    emAlta:
      rawInsights.emAlta?.map((item) =>
        normalizeCategory(item as unknown as Record<string, unknown>)
      ) ?? EMPTY_INSIGHTS.emAlta,
  };

  return {
    timestamp: (raw.timestamp as string) ?? new Date().toISOString(),
    fonte:
      (raw.fonte as string) ?? "Categorias do cadastro + Google Trends · Brasil",
    summary: {
      totalCategorias: rawSummary.totalCategorias ?? categories.length,
      comEstoque:
        rawSummary.comEstoque ??
        categories.filter((c) => c.estoque.produtosEmEstoque > 0).length,
      semEstoque:
        rawSummary.semEstoque ??
        categories.filter((c) => c.estoque.produtosEmEstoque === 0).length,
      totalProdutos:
        rawSummary.totalProdutos ??
        categories.reduce((sum, c) => sum + c.estoque.totalProdutos, 0),
      totalUnidades:
        rawSummary.totalUnidades ??
        categories.reduce((sum, c) => sum + c.estoque.unidadesEstoque, 0),
      valorTotalEstoque:
        rawSummary.valorTotalEstoque ??
        categories.reduce((sum, c) => sum + c.estoque.valorEstoque, 0),
      googleConsultadas: rawSummary.googleConsultadas ?? 0,
      googleComDados:
        rawSummary.googleComDados ??
        categories.filter((c) => c.google.googleDisponivel).length,
      oportunidades:
        rawSummary.oportunidades ?? insights.oportunidades.length,
      repor: rawSummary.repor ?? insights.repor.length,
    },
    insights,
    categories,
  };
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getDemandLabel(value: number): string {
  if (value >= 75) return "Alta demanda";
  if (value >= 50) return "Demanda média";
  if (value >= 25) return "Demanda baixa";
  if (value > 0) return "Demanda moderada";
  return "Sem referência";
}

function TagBadge({ children, color = "slate" }: { children: string; color?: string }) {
  const colors: Record<string, string> = {
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    slate: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colors[color]}`}>
      {children}
    </span>
  );
}

function getDemandColor(value: number): string {
  if (value >= 75) return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
  if (value >= 50) return "text-blue-400 bg-blue-500/15 border-blue-500/30";
  if (value >= 25) return "text-amber-400 bg-amber-500/15 border-amber-500/30";
  return "text-slate-400 bg-slate-500/15 border-slate-500/30";
}

function getBarGradient(value: number): string {
  if (value >= 75) return "from-emerald-500 to-teal-400";
  if (value >= 50) return "from-blue-500 to-cyan-400";
  if (value >= 25) return "from-amber-500 to-orange-400";
  return "from-slate-500 to-slate-400";
}

function Sparkline({ data, className = "" }: { data: TimelinePoint[]; className?: string }) {
  if (!data?.length) {
    return (
      <div className={`h-10 flex items-center text-xs text-slate-500 ${className}`}>
        Sem histórico
      </div>
    );
  }

  const values = data.map((point) => point.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 120;
  const height = 36;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const trending = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full max-w-[120px] h-9 ${className}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={trending ? "#34d399" : "#f87171"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function ProductThumb({
  image,
  alt,
  size = "w-10 h-10",
}: {
  image: string | null;
  alt: string;
  size?: string;
}) {
  const url = image?.startsWith("http") ? image : resolveImageUrl(image);

  return (
    <div
      className={`${size} rounded-md overflow-hidden bg-slate-700 flex-shrink-0 flex items-center justify-center`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <FiPackage className="text-slate-500" size={14} />
      )}
    </div>
  );
}

function MomentumBadge({ momentum }: { momentum: number }) {
  if (!momentum) return null;

  const positive = momentum > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
        positive
          ? "text-emerald-300 bg-emerald-500/15"
          : "text-red-300 bg-red-500/15"
      }`}
    >
      {positive ? <FiTrendingUp size={12} /> : null}
      {positive ? "+" : ""}
      {momentum}%
    </span>
  );
}

function CategoryRow({
  category,
  rank,
  onBuildKit,
}: {
  category: CategoryTrend;
  rank?: number;
  onBuildKit: (category: CategoryTrend) => void;
}) {
  const hasStock = category.estoque.produtosEmEstoque > 0;
  const demandScore = category.demanda.score;

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/80 hover:border-slate-600 transition overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {rank !== undefined && (
            <span className="text-lg font-bold text-purple-400 w-8 flex-shrink-0">
              #{rank}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{category.categoryName}</h3>
              <TagBadge color="purple">{category.tipoPeca}</TagBadge>
              <TagBadge color="amber">{category.material}</TagBadge>
              <MomentumBadge momentum={category.google.momentum} />
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Busca: &quot;{category.searchTerm}&quot;
              {category.marketplaceRef.termoReferencia && (
                <> · Ref. ML: {category.marketplaceRef.termoReferencia}</>
              )}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-slate-900/50 p-2">
                <p className="text-slate-500">Unidades</p>
                <p className="text-emerald-400 font-semibold">
                  {category.estoque.unidadesEstoque}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900/50 p-2">
                <p className="text-slate-500">Valor estoque</p>
                <p className="text-white font-semibold">
                  {formatBRL(category.estoque.valorEstoque)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900/50 p-2">
                <p className="text-slate-500">% do total</p>
                <p className="text-white font-semibold">
                  {category.estoque.percentualEstoque}%
                </p>
              </div>
              <div className="rounded-lg bg-slate-900/50 p-2">
                <p className="text-slate-500">Prioridade</p>
                <p className="text-purple-300 font-semibold">{category.prioridade}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
              <span>{category.estoque.totalProdutos} produto(s)</span>
              {category.estoque.semEstoque > 0 && (
                <span className="text-orange-400">
                  {category.estoque.semEstoque} zerado(s)
                </span>
              )}
              {category.estoque.estoqueBaixo > 0 && (
                <span className="text-amber-400">
                  {category.estoque.estoqueBaixo} estoque baixo
                </span>
              )}
              {category.estoque.emKits > 0 && (
                <span className="text-blue-400">{category.estoque.emKits} em kits</span>
              )}
              {category.estoque.precoMedio > 0 && (
                <span>
                  R$ {category.estoque.precoMin.toFixed(0)}–
                  {category.estoque.precoMax.toFixed(0)} (méd.{" "}
                  {category.estoque.precoMedio.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[140px]">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getBarGradient(demandScore)}`}
                style={{ width: `${Math.min(demandScore, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white w-8">{demandScore}</span>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full border ${getDemandColor(
              demandScore
            )}`}
          >
            {getDemandLabel(demandScore)}
          </span>
          <span className="text-[10px] text-slate-500">{category.demanda.label}</span>
          {category.google.googleDisponivel ? (
            <Sparkline data={category.google.timeline} />
          ) : (
            <span className="text-[10px] text-slate-600">Google indisponível</span>
          )}
          {hasStock && (
            <button
              type="button"
              onClick={() => onBuildKit(category)}
              className="w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-500"
            >
              Montar kit
            </button>
          )}
        </div>
      </div>

      {category.topProdutos.length > 0 && (
        <div className="px-4 pb-4 border-t border-slate-700/60 pt-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
            Top produtos
          </p>
          <div className="flex flex-wrap gap-2">
            {category.topProdutos.slice(0, 4).map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 rounded-md bg-slate-900/40 border border-slate-700/50 px-2 py-1"
              >
                <ProductThumb image={product.imagem} alt={product.nome} size="w-8 h-8" />
                <div className="min-w-0">
                  <p className="text-xs text-white truncate max-w-[100px]">
                    {product.referencia}
                  </p>
                  <p className="text-[10px] text-emerald-400">{product.estoque} un.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  variant,
  onBuildKit,
}: {
  category: CategoryTrend;
  variant: "oportunidade" | "repor";
  onBuildKit: (category: CategoryTrend) => void;
}) {
  const products = category.topProdutos.filter((p) => p.estoque > 0);
  const isOpportunity = variant === "oportunidade";

  return (
    <div
      className={`rounded-xl border p-5 ${
        isOpportunity
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-orange-500/30 bg-orange-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white">{category.categoryName}</h3>
            <TagBadge color="purple">{category.tipoPeca}</TagBadge>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {category.estoque.unidadesEstoque} un. ·{" "}
            {formatBRL(category.estoque.valorEstoque)} em estoque
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Demanda {category.demanda.score} ({category.demanda.label})
            {" · "}
            <MomentumBadge momentum={category.google.momentum} />
          </p>
        </div>
        {category.google.googleDisponivel && (
          <Sparkline data={category.google.timeline} />
        )}
      </div>

      {products.length > 0 ? (
        <div className="space-y-2 mb-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {isOpportunity ? "Produtos em estoque" : "Estoque baixo — repor"}
          </p>
          {products.slice(0, 3).map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-2 rounded-lg bg-slate-900/50 p-2"
            >
              <ProductThumb image={product.imagem} alt={product.nome} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{product.referencia}</p>
                <p className="text-xs text-slate-400 truncate">{product.nome}</p>
              </div>
              <span
                className={`text-xs ${
                  product.estoque <= 3 ? "text-orange-400" : "text-emerald-400"
                }`}
              >
                {product.estoque} un.
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-orange-200/80 mb-4">
          Categoria sem produtos em estoque. Cadastre ou reabasteça peças desta
          linha.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {products.length > 0 && isOpportunity && (
          <button
            type="button"
            onClick={() => onBuildKit(category)}
            className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-500"
          >
            Montar kit
          </button>
        )}
        <a
          href={`https://trends.google.com/trends/explore?geo=BR&q=${encodeURIComponent(
            category.searchTerm
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500"
        >
          Google Trends
          <FiExternalLink size={14} />
        </a>
        {!isOpportunity && (
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-orange-500/40 text-orange-200 hover:bg-orange-500/10"
          >
            Cadastrar produto
            <FiArrowUpRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function TrendsAnalysis() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [search, setSearch] = useState("");

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/trends/analysis`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar análise");
      }
      setAnalysis(normalizeAnalysisResponse(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const filteredCategories = useMemo(() => {
    if (!analysis) return [];
    const query = search.trim().toLowerCase();
    if (!query) return analysis.categories;
    return analysis.categories.filter((cat) =>
      cat.categoryName.toLowerCase().includes(query)
    );
  }, [analysis, search]);

  const topCategories = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.categories]
      .sort((a, b) => b.prioridade - a.prioridade)
      .slice(0, 10);
  }, [analysis]);

  function handleBuildKit(category: CategoryTrend) {
    const inStock = category.topProdutos.filter((p) => p.estoque > 0);
    if (inStock.length === 0) {
      alert("Nenhum produto em estoque nesta categoria.");
      return;
    }

    saveTrendKitPayload({
      trendName: category.categoryName,
      categories: [category.categoryName],
      productIds: inStock.map((p) => p.id),
      maxKitValue: 1600,
    });
    router.push("/kit");
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 mb-6">
            <FiBarChart2 className="text-purple-400 animate-pulse" size={28} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Analisando suas categorias
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Cruzando categorias do cadastro com estoque e consultando Google
            Trends. Pode levar alguns segundos.
          </p>
          <div className="mt-6 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchAnalysis}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const { summary } = analysis;
  const insights = analysis.insights ?? EMPTY_INSIGHTS;
  const emAlta = insights.emAlta ?? [];
  const oportunidades = insights.oportunidades ?? [];
  const repor = insights.repor ?? [];
  const destaqueEstoque = insights.destaqueEstoque ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-sm text-purple-300 font-medium mb-1 flex items-center gap-1.5">
              <FiBarChart2 size={14} />
              Inteligência de mercado
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Análise por Categoria
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm sm:text-base">
              Suas categorias cadastradas cruzadas com estoque e interesse de
              busca no Google Trends.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {analysis.fonte} · Atualizado em{" "}
              {new Date(analysis.timestamp).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchAnalysis}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-purple-400 text-sm"
            >
              <FiRefreshCw size={14} />
              Atualizar
            </button>
            <Link
              href="/tendencias"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-sm"
            >
              <FiTrendingUp size={14} />
              Tendências Mercado Livre
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            {
              label: "Categorias ativas",
              value: summary.totalCategorias,
              sub: `${summary.totalProdutos} produtos`,
              color: "text-blue-300",
            },
            {
              label: "Valor em estoque",
              value: formatBRL(summary.valorTotalEstoque),
              sub: `${summary.totalUnidades} unidades`,
              color: "text-emerald-300",
              isText: true,
            },
            {
              label: "Oportunidades",
              value: summary.oportunidades,
              sub: "estoque + demanda",
              color: "text-purple-300",
            },
            {
              label: "Repor estoque",
              value: summary.repor,
              sub: "zerados ou baixo",
              color: "text-orange-300",
            },
            {
              label: "Google Trends",
              value: summary.googleComDados,
              sub: `de ${summary.googleConsultadas} consultadas`,
              color: "text-cyan-300",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5"
            >
              <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
              <p
                className={`${"isText" in kpi && kpi.isText ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"} font-bold ${kpi.color}`}
              >
                {kpi.value}
              </p>
              <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {summary.googleConsultadas > 0 && (
          <p className="text-xs text-slate-500">
            Google Trends consultado para {summary.googleConsultadas} categorias
            ({summary.googleComDados} com dados retornados).
          </p>
        )}

        <div className="flex flex-wrap gap-2 border-b border-slate-700/80 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                activeTab === tab.id
                  ? "text-white bg-slate-800 border border-slate-700 border-b-transparent -mb-px"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
              {tab.id === "oportunidades" && summary.oportunidades > 0 && (
                <span className="ml-1.5 text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">
                  {summary.oportunidades}
                </span>
              )}
              {tab.id === "repor" && summary.repor > 0 && (
                <span className="ml-1.5 text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full">
                  {summary.repor}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {emAlta.length > 0 && (
              <section className="rounded-xl bg-white/5 border border-white/10 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiTrendingUp className="text-emerald-400" />
                  Categorias em crescimento no Google
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {emAlta.map((cat) => (
                    <div
                      key={cat.categoryId}
                      className="rounded-lg bg-slate-800/60 border border-slate-700 p-4"
                    >
                      <p className="font-medium text-white truncate">
                        {cat.categoryName}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <MomentumBadge momentum={cat.google.momentum} />
                        <span className="text-sm text-slate-400">
                          demanda {cat.demanda.score}
                        </span>
                      </div>
                      <Sparkline data={cat.google.timeline} className="mt-3 max-w-full" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {destaqueEstoque.length > 0 && (
              <section className="rounded-xl bg-white/5 border border-white/10 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Maior volume em estoque
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {destaqueEstoque.map((cat) => (
                    <div
                      key={cat.categoryId}
                      className="rounded-lg bg-slate-800/60 border border-slate-700 p-4"
                    >
                      <p className="font-medium text-white">{cat.categoryName}</p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">
                        {formatBRL(cat.estoque.valorEstoque)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {cat.estoque.unidadesEstoque} un. ·{" "}
                        {cat.estoque.percentualEstoque}% do estoque
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-xl bg-white/5 border border-white/10 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Top categorias — prioridade comercial
              </h2>
              <div className="space-y-3">
                {topCategories.map((cat, index) => (
                  <CategoryRow
                    key={cat.categoryId}
                    category={cat}
                    rank={index + 1}
                    onBuildKit={handleBuildKit}
                  />
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-5">
                <h3 className="font-semibold text-emerald-300 mb-2">
                  Melhor ação agora
                </h3>
                <p className="text-sm text-slate-300 mb-3">
                  {oportunidades.length > 0
                    ? `${oportunidades.length} categoria(s) com boa demanda e estoque disponível.`
                    : "Revise categorias com estoque para montar kits."}
                </p>
                {oportunidades[0] && (
                  <button
                    type="button"
                    onClick={() => handleBuildKit(oportunidades[0])}
                    className="text-sm text-emerald-300 hover:text-emerald-200 underline"
                  >
                    Montar kit: {oportunidades[0].categoryName} →
                  </button>
                )}
              </section>
              <section className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-5">
                <h3 className="font-semibold text-orange-300 mb-2">
                  Atenção ao estoque
                </h3>
                <p className="text-sm text-slate-300 mb-3">
                  {repor.length > 0
                    ? `${repor.length} categoria(s) com alta busca mas estoque baixo.`
                    : "Estoque equilibrado nas categorias monitoradas."}
                </p>
                {repor[0] && (
                  <p className="text-sm text-orange-200">
                    Ex.: {repor[0].categoryName} — {repor[0].estoque.semEstoque}{" "}
                    zerado(s), {repor[0].estoque.estoqueBaixo} com estoque baixo
                  </p>
                )}
              </section>
            </div>
          </div>
        )}

        {activeTab === "oportunidades" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Categorias com estoque e boa demanda ou volume — prontas para kit.
            </p>
            {oportunidades.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Nenhuma oportunidade encontrada nesta análise.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {oportunidades.map((cat) => (
                  <CategoryCard
                    key={cat.categoryId}
                    category={cat}
                    variant="oportunidade"
                    onBuildKit={handleBuildKit}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "repor" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Categorias com alta busca no Google, mas com poucas unidades em
              estoque.
            </p>
            {repor.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Nenhuma categoria precisa de reposição urgente.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {repor.map((cat) => (
                  <CategoryCard
                    key={cat.categoryId}
                    category={cat}
                    variant="repor"
                    onBuildKit={handleBuildKit}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "categorias" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoria..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <p className="text-xs text-slate-500">
              {filteredCategories.length} categoria(s)
            </p>
            <div className="space-y-3">
              {filteredCategories.map((cat, index) => (
                <CategoryRow
                  key={cat.categoryId}
                  category={cat}
                  rank={index + 1}
                  onBuildKit={handleBuildKit}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
