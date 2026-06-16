import prisma from "../database/prismaClient.js";
import {
  buildSearchPageUrl,
  fetchTopListingsForTerms,
  isMarketplaceScrapingEnabled,
} from "./marketplace.scraper.js";

export const JEWELRY_TREND_KEYWORDS = [
  {
    term: "brinco argola dourado",
    categories: ["BRINCO", "BRINCO OURO", "BRINCO RODIO"],
    crescimento: 92,
  },
  {
    term: "brinco ponto de luz",
    categories: ["BRINCO", "BRINCO OURO", "BRINCO RODIO"],
    crescimento: 88,
  },
  {
    term: "anel ajustável feminino",
    categories: ["ANEL", "ANEL OURO", "ANEL RODIO BRANCO"],
    crescimento: 85,
  },
  {
    term: "colar feminino dourado",
    categories: ["COLAR", "CORRENTE OURO", "CORRENTE RODIO", "PINGENTE OURO"],
    crescimento: 83,
  },
  {
    term: "pulseira feminina dourada",
    categories: ["PULSEIRA", "PULSEIRA OURO", "PULSEIRA RODIO"],
    crescimento: 80,
  },
  {
    term: "tornozeleira feminina",
    categories: ["TORNOZELEIRA OURO", "TORNOZELEIRA RODIO"],
    crescimento: 76,
  },
  {
    term: "conjunto semi joias",
    categories: ["CONJUNTO OURO", "CJ OURO", "CJ RODIO"],
    crescimento: 74,
  },
  {
    term: "berloque personalizado",
    categories: ["BERLOQUE"],
    crescimento: 70,
  },
  {
    term: "joias minimalistas",
    categories: ["ANEL", "BRINCO", "COLAR", "PULSEIRA"],
    crescimento: 68,
  },
  {
    term: "semi joias delicadas",
    categories: ["ANEL", "BRINCO", "COLAR", "PULSEIRA", "BERLOQUE"],
    crescimento: 65,
  },
];

export function normalizeText(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getProductCategoryName(product) {
  return normalizeText(product.category?.name || "OUTROS").toUpperCase();
}

export function getProductSearchText(product) {
  return normalizeText(
    [
      product.name,
      product.description,
      product.code,
      product.reference,
      product.sku,
      product.category?.name,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function productMatchesCategories(product, categories) {
  const category = getProductCategoryName(product);
  return categories.some(
    (item) => normalizeText(item).toUpperCase() === category
  );
}

export function scoreProductForTrend(product, trendName) {
  const trendWords = normalizeText(trendName)
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const haystack = getProductSearchText(product);
  let score = 0;

  for (const word of trendWords) {
    if (haystack.includes(word)) score += 12;
  }

  if (product.quantity > 0) score += Math.min(product.quantity, 20);
  if (product.active) score += 5;

  const price = Number(product.adjustedPrice ?? product.priceLevel1 ?? 0);
  if (price > 0 && price <= 120) score += 8;
  if (price > 120 && price <= 250) score += 4;

  return score;
}

export function mapProductForTrendResponse(product) {
  const price = Number(
    product.adjustedPrice ?? product.priceLevel1 ?? product.priceLevel2 ?? 0
  );

  return {
    id: product.id,
    nome: product.name,
    referencia: product.code || product.reference || product.sku || `P${product.id}`,
    categoria: getProductCategoryName(product),
    estoque: product.quantity,
    preco: price,
    imagem: product.image,
  };
}

export function matchProductsToTrend(products, trendName, categories = [], limit = 5) {
  const filtered = products.filter((product) => {
    if (!product.active) return false;
    if (categories.length > 0 && !productMatchesCategories(product, categories)) {
      return false;
    }
    return scoreProductForTrend(product, trendName) > 0 || categories.length > 0;
  });

  return filtered
    .sort((a, b) => {
      const stockDiff = (b.quantity > 0) - (a.quantity > 0);
      if (stockDiff !== 0) return stockDiff;
      return scoreProductForTrend(b, trendName) - scoreProductForTrend(a, trendName);
    })
    .slice(0, limit)
    .map(mapProductForTrendResponse);
}

export function inferCategoriesFromTrendName(trendName) {
  const text = normalizeText(trendName);
  const hints = [];

  if (text.includes("brinco")) hints.push("BRINCO", "BRINCO OURO", "BRINCO RODIO");
  if (text.includes("anel")) hints.push("ANEL", "ANEL OURO", "ANEL RODIO BRANCO");
  if (text.includes("colar") || text.includes("corrente")) {
    hints.push("COLAR", "CORRENTE OURO", "CORRENTE RODIO", "PINGENTE OURO");
  }
  if (text.includes("pulseira")) hints.push("PULSEIRA", "PULSEIRA OURO", "PULSEIRA RODIO");
  if (text.includes("tornozeleira")) {
    hints.push("TORNOZELEIRA OURO", "TORNOZELEIRA RODIO");
  }
  if (text.includes("berloque")) hints.push("BERLOQUE");
  if (text.includes("conjunto") || text.includes("mix")) {
    hints.push("CONJUNTO OURO", "CJ OURO", "CJ RODIO");
  }

  return [...new Set(hints)];
}

export async function loadActiveProducts() {
  return prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { quantity: "desc" },
  });
}

export async function enrichTrendsWithStock(trends) {
  const products = await loadActiveProducts();

  return trends.map((trend) => {
    const categories =
      trend.categoriasSugeridas?.length > 0
        ? trend.categoriasSugeridas
        : inferCategoriesFromTrendName(trend.nome);

    const produtosEstoque = matchProductsToTrend(
      products,
      trend.nome,
      categories,
      5
    );

    return {
      ...trend,
      imagem: trend.imagem || null,
      categoriasSugeridas: categories,
      produtosEstoque,
      estoqueDisponivel: produtosEstoque.filter((item) => item.estoque > 0).length,
    };
  });
}

export async function buildHybridTrends(limit = 10) {
  const products = await loadActiveProducts();
  const inStock = products.filter((product) => product.quantity > 0);
  const scrapeLimit =
    Number(process.env.MARKETPLACE_SCRAPE_LIMIT) ||
    (process.env.RAILWAY_ENVIRONMENT ? Math.min(limit, 5) : limit);
  const keywords = JEWELRY_TREND_KEYWORDS.slice(0, scrapeLimit);
  const termsToFetch = [];

  for (const keyword of keywords) {
    const stockMatches = matchProductsToTrend(
      inStock,
      keyword.term,
      keyword.categories,
      5
    );
    if (stockMatches.length > 0) termsToFetch.push(keyword);
  }

  const mlByTerm = new Map();
  if (isMarketplaceScrapingEnabled() && termsToFetch.length > 0) {
    console.log(`🛒 Buscando ${termsToFetch.length} anúncios reais no Mercado Livre...`);
    const listings = await fetchTopListingsForTerms(
      termsToFetch.map((keyword) => keyword.term)
    );
    for (const listing of listings) {
      mlByTerm.set(listing.termoTendencia, listing);
    }
  }

  const trends = [];

  for (const keyword of termsToFetch) {
    const stockMatches = matchProductsToTrend(
      inStock,
      keyword.term,
      keyword.categories,
      5
    );
    const mlListing = mlByTerm.get(keyword.term) || null;

    const avgPrice =
      stockMatches.reduce((sum, item) => sum + item.preco, 0) / stockMatches.length;
    const totalStock = stockMatches.reduce((sum, item) => sum + item.estoque, 0);

    trends.push({
      termoTendencia: keyword.term,
      nome: mlListing?.nome || keyword.term,
      vendidos: mlListing?.vendidos || totalStock,
      preco: mlListing?.preco || Math.round(avgPrice * 100) / 100,
      marketplace: mlListing ? "mercado-livre" : "estoque-analisado",
      categoria: keyword.categories[0],
      categoriasSugeridas: keyword.categories,
      imagem: mlListing?.imagem || null,
      url: mlListing?.url || buildSearchPageUrl(keyword.term),
      urlBusca: buildSearchPageUrl(keyword.term),
      itemId: mlListing?.itemId || null,
      crescimento: keyword.crescimento,
      rating: 4.7,
      reviews: mlListing?.vendidos || totalStock,
      produtosEstoque: stockMatches,
      estoqueDisponivel: stockMatches.filter((item) => item.estoque > 0).length,
    });
  }

  return trends.sort((a, b) => b.crescimento - a.crescimento);
}

export async function buildInventoryTrends(limit = 10) {
  return buildHybridTrends(limit);
}
