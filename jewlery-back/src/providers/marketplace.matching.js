import prisma from "../database/prismaClient.js";
import {
  buildSearchPageUrl,
  fetchTopListingsForTerms,
  isMarketplaceScrapingEnabled,
} from "./marketplace.scraper.js";

export const JEWELRY_TREND_KEYWORDS = [
  {
    term: "brinco argola dourado",
    categories: ["BRINCO", "BRINCO OURO", "BRINCO RODIO", "Brinco", "BR-ALE"],
    crescimento: 92,
  },
  {
    term: "brinco ponto de luz",
    categories: ["BRINCO", "BRINCO OURO", "BRINCO RODIO", "Brinco", "BR-ALE"],
    crescimento: 88,
  },
  {
    term: "anel ajustável feminino",
    categories: ["ANEL", "ANEL OURO", "ANEL RODIO BRANCO", "Anel", "ANÉIS"],
    crescimento: 85,
  },
  {
    term: "colar feminino dourado",
    categories: [
      "COLAR",
      "CORRENTE OURO",
      "CORRENTE RODIO",
      "PINGENTE OURO",
      "Colar",
      "CORR-ALE",
    ],
    crescimento: 83,
  },
  {
    term: "pulseira feminina dourada",
    categories: ["PULSEIRA", "PULSEIRA OURO", "PULSEIRA RODIO", "Pulseira", "PUL-ALE"],
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

export function getCategoryFamilies(categoryName) {
  const text = normalizeText(categoryName || "");
  const families = new Set();

  if (text.includes("brinco") || text.startsWith("br-") || text.includes("brinco")) {
    families.add("BRINCO");
  }
  if (
    text.includes("anel") ||
    text.includes("aneis") ||
    text.includes("anéis") ||
    text.startsWith("anéis") ||
    text.includes("aneis-ale")
  ) {
    families.add("ANEL");
  }
  if (
    text.includes("colar") ||
    text.includes("corrente") ||
    text.startsWith("corr-") ||
    text.includes("corrente")
  ) {
    families.add("COLAR");
    families.add("CORRENTE");
  }
  if (text.includes("pulseira") || text.startsWith("pul-")) {
    families.add("PULSEIRA");
  }
  if (text.includes("pingente") || text.startsWith("ping-")) {
    families.add("PINGENTE");
  }
  if (text.includes("tornozeleira")) {
    families.add("TORNOZELEIRA");
  }
  if (text.includes("berloque")) {
    families.add("BERLOQUE");
  }
  if (text.includes("conjunto") || text.startsWith("cj ")) {
    families.add("CONJUNTO");
  }

  return [...families];
}

function expandCategoryTargets(categories) {
  const expanded = new Set();

  for (const category of categories) {
    const normalized = normalizeText(category).toUpperCase();
    expanded.add(normalized);
    for (const family of getCategoryFamilies(category)) {
      expanded.add(family);
    }
  }

  return [...expanded];
}

export function productMatchesCategories(product, categories) {
  const categoryName = product.category?.name || "";
  const category = getProductCategoryName(product);
  const productFamilies = getCategoryFamilies(categoryName);
  const targets = expandCategoryTargets(categories);

  if (targets.includes(category)) return true;

  return productFamilies.some((family) =>
    targets.some(
      (target) =>
        target === family ||
        target.startsWith(`${family} `) ||
        family.startsWith(target.split(" ")[0])
    )
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
  const activeProducts = products.filter((product) => product.active);
  const inStock = activeProducts.filter((product) => product.quantity > 0);

  const scoreAndSort = (list) =>
    list
      .sort((a, b) => {
        const stockDiff = (b.quantity > 0) - (a.quantity > 0);
        if (stockDiff !== 0) return stockDiff;
        return scoreProductForTrend(b, trendName) - scoreProductForTrend(a, trendName);
      })
      .slice(0, limit)
      .map(mapProductForTrendResponse);

  let filtered = inStock.filter((product) => {
    if (categories.length > 0 && !productMatchesCategories(product, categories)) {
      return false;
    }
    return scoreProductForTrend(product, trendName) > 0 || categories.length > 0;
  });

  if (filtered.length === 0 && trendName) {
    filtered = inStock.filter((product) => scoreProductForTrend(product, trendName) > 8);
  }

  if (filtered.length === 0 && categories.length > 0) {
    filtered = inStock.filter((product) =>
      productMatchesCategories(product, categories)
    );
  }

  const uniqueById = [];
  const seenKeys = new Set();
  for (const product of filtered) {
    const key =
      product.code?.trim() ||
      product.reference?.trim() ||
      product.sku?.trim() ||
      `id-${product.id}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    uniqueById.push(product);
  }

  return scoreAndSort(uniqueById);
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

    const trendSearchText = [trend.termoTendencia, trend.nome]
      .filter(Boolean)
      .join(" ");

    const produtosEstoque =
      trend.produtosEstoque?.length > 0
        ? trend.produtosEstoque
        : matchProductsToTrend(products, trendSearchText, categories, 5);

    return {
      ...trend,
      imagem: trend.imagem || null,
      categoriasSugeridas: categories,
      produtosEstoque,
      estoqueDisponivel: produtosEstoque.filter((item) => item.estoque > 0).length,
    };
  });
}

function pickImageFromCategory(products, categories) {
  const match = products.find(
    (product) => product.image && productMatchesCategories(product, categories)
  );
  return match?.image || null;
}

function buildTrendFromKeyword(
  keyword,
  stockMatches,
  mlListing = null,
  categoryImage = null
) {
  const pricedMatches = stockMatches.filter((item) => item.preco > 0);
  const avgPrice =
    pricedMatches.length > 0
      ? pricedMatches.reduce((sum, item) => sum + item.preco, 0) /
        pricedMatches.length
      : 89.9;
  const totalStock = stockMatches.reduce((sum, item) => sum + item.estoque, 0);
  const stockImage = stockMatches.find((item) => item.imagem)?.imagem ?? null;
  const mlVendidos = mlListing?.vendidos || 0;
  const crescimento = mlVendidos
    ? Math.min(99, 35 + Math.round(mlVendidos / 80))
    : keyword.crescimento;

  return {
    termoTendencia: keyword.term,
    nome: mlListing?.nome || keyword.term,
    vendidos: mlVendidos || Math.max(totalStock, 50),
    preco: mlListing?.preco || Math.round(avgPrice * 100) / 100,
    marketplace: mlListing ? "mercado-livre" : "estoque-analisado",
    categoria: keyword.categories[0],
    categoriasSugeridas: keyword.categories,
    imagem: mlListing?.imagem || stockImage || categoryImage || null,
    url: mlListing?.url || buildSearchPageUrl(keyword.term),
    urlBusca: buildSearchPageUrl(keyword.term),
    itemId: mlListing?.itemId || null,
    crescimento,
    rating: mlListing?.rating || 4.7,
    reviews: mlVendidos || totalStock,
    produtosEstoque: stockMatches,
    estoqueDisponivel: stockMatches.filter((item) => item.estoque > 0).length,
  };
}

export async function buildKeywordTrendsFallback(limit = 10) {
  const products = await loadActiveProducts();
  const inStock = products.filter((product) => product.quantity > 0);
  const keywords = JEWELRY_TREND_KEYWORDS.slice(0, limit);

  return keywords
    .map((keyword) => {
      const stockMatches = matchProductsToTrend(
        inStock,
        keyword.term,
        keyword.categories,
        5
      );
      const categoryImage = pickImageFromCategory(products, keyword.categories);
      return buildTrendFromKeyword(
        keyword,
        stockMatches,
        null,
        categoryImage
      );
    })
    .sort((a, b) => b.crescimento - a.crescimento);
}

export async function buildHybridTrends(limit = 10) {
  const products = await loadActiveProducts();
  const inStock = products.filter((product) => product.quantity > 0);
  const scrapeLimit =
    Number(process.env.MARKETPLACE_SCRAPE_LIMIT) ||
    (process.env.RAILWAY_ENVIRONMENT ? Math.min(limit, 5) : limit);
  const keywords = JEWELRY_TREND_KEYWORDS.slice(0, scrapeLimit);

  const mlByTerm = new Map();
  if (isMarketplaceScrapingEnabled()) {
    console.log(
      `🛒 Buscando ${keywords.length} anúncios reais no Mercado Livre...`
    );
    const listings = await fetchTopListingsForTerms(
      keywords.map((keyword) => keyword.term)
    );
    for (const listing of listings) {
      mlByTerm.set(listing.termoTendencia, listing);
    }
    console.log(`  ✅ ${listings.length}/${keywords.length} anúncios extraídos`);
  } else {
    console.warn("  ⚠️ Scraping ML desabilitado (Chrome não encontrado)");
  }

  const trends = keywords
    .map((keyword) => {
      const stockMatches = matchProductsToTrend(
        inStock,
        keyword.term,
        keyword.categories,
        5
      );
      const mlListing = mlByTerm.get(keyword.term) || null;
      if (!mlListing?.imagem) return null;

      return buildTrendFromKeyword(keyword, stockMatches, mlListing, null);
    })
    .filter(Boolean);

  return trends.sort((a, b) => {
    if (b.crescimento !== a.crescimento) return b.crescimento - a.crescimento;
    if (b.vendidos !== a.vendidos) return b.vendidos - a.vendidos;
    return b.preco - a.preco;
  });
}

export async function buildInventoryTrends(limit = 10) {
  return buildHybridTrends(limit);
}
