import googleTrends from "google-trends-api";
import prisma from "../database/prismaClient.js";
import { mapProductForTrendResponse } from "./marketplace.matching.js";
import {
  getEffectiveDemand,
  getMarketplaceReference,
  getTrendStatus,
  parseCategoryMeta,
} from "./categoryTrends.utils.js";

const GOOGLE_BATCH_SIZE = 5;
const GOOGLE_DELAY_MS = 1200;
const MAX_GOOGLE_TERMS = 20;

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(fn, retries = 2) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await delay(2000);
    return fetchWithRetry(fn, retries - 1);
  }
}

async function loadKitUsageByProduct() {
  const kitItems = await prisma.kitItem.findMany({
    where: { productId: { not: null } },
    select: { productId: true, quantity: true },
  });

  const map = new Map();
  for (const item of kitItems) {
    if (!item.productId) continue;
    map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
  }
  return map;
}

async function loadCategoriesWithInventory() {
  const [categories, kitUsageByProduct] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        products: {
          where: { active: true },
          orderBy: { quantity: "desc" },
        },
      },
    }),
    loadKitUsageByProduct(),
  ]);

  return categories
    .map((category) => {
      const products = category.products;
      const inStock = products.filter((product) => product.quantity > 0);
      const meta = parseCategoryMeta(category.name);
      const marketplaceRef = getMarketplaceReference(meta.tipoPeca);

      let valorEstoque = 0;
      let estoqueBaixo = 0;
      let emKits = 0;
      const prices = [];

      for (const product of inStock) {
        const price = Number(product.adjustedPrice ?? product.priceLevel1 ?? 0);
        if (price > 0) prices.push(price);
        valorEstoque += price * product.quantity;
        if (product.quantity <= 5) estoqueBaixo += 1;
        if (kitUsageByProduct.has(product.id)) emKits += 1;
      }

      return {
        id: category.id,
        name: category.name,
        meta,
        marketplaceRef,
        totalProdutos: products.length,
        produtosEmEstoque: inStock.length,
        unidadesEstoque: inStock.reduce((sum, product) => sum + product.quantity, 0),
        semEstoque: products.length - inStock.length,
        estoqueBaixo,
        emKits,
        valorEstoque: Math.round(valorEstoque * 100) / 100,
        precoMedio:
          prices.length > 0
            ? Math.round(
                (prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100
              ) / 100
            : 0,
        precoMin:
          prices.length > 0 ? Math.min(...prices) : 0,
        precoMax:
          prices.length > 0 ? Math.max(...prices) : 0,
        topProdutos: inStock.slice(0, 5).map(mapProductForTrendResponse),
      };
    })
    .filter((category) => category.totalProdutos > 0);
}

async function fetchGoogleTrendBatch(searchTerms) {
  const results = new Map();
  if (searchTerms.length === 0) return results;

  const emptyResult = {
    value: 0,
    momentum: 0,
    googleDisponivel: false,
    timeline: [],
    status: "morta",
  };

  try {
    await delay(GOOGLE_DELAY_MS);

    const raw = await fetchWithRetry(() =>
      googleTrends.interestOverTime({
        keyword: searchTerms,
        geo: "BR",
      })
    );

    if (typeof raw === "string" && raw.startsWith("<")) {
      throw new Error("Google Trends bloqueou a requisição");
    }

    const parsed = JSON.parse(raw);
    const timelineData = parsed?.default?.timelineData;

    if (!timelineData?.length) {
      throw new Error("Sem dados de timeline");
    }

    searchTerms.forEach((term, index) => {
      const series = timelineData.map((point) => point?.value?.[index] || 0);
      const recentSeries = series.slice(-12);
      const value = recentSeries[recentSeries.length - 1] || 0;
      const previous = series.length > 1 ? series[series.length - 2] : 0;
      const momentum =
        previous > 0
          ? Math.round(((value - previous) / previous) * 100)
          : value > 0
            ? 100
            : 0;

      results.set(term, {
        value,
        momentum,
        googleDisponivel: value > 0,
        status: getTrendStatus(value),
        timeline: recentSeries.map((pointValue, pointIndex) => ({
          date:
            timelineData[timelineData.length - recentSeries.length + pointIndex]
              ?.formattedTime || "",
          value: pointValue,
        })),
      });
    });
  } catch (err) {
    console.log(`⚠️ Google Trends: ${err.message}`);
    for (const term of searchTerms) {
      results.set(term, { ...emptyResult });
    }
  }

  return results;
}

async function fetchGoogleTrendsBySearchTerms(searchTerms) {
  const uniqueTerms = [...new Set(searchTerms)].slice(0, MAX_GOOGLE_TERMS);
  const trendByTerm = new Map();

  for (const batch of chunkArray(uniqueTerms, GOOGLE_BATCH_SIZE)) {
    const batchResults = await fetchGoogleTrendBatch(batch);
    for (const [term, data] of batchResults) {
      trendByTerm.set(term, data);
    }
  }

  return { trendByTerm, googleConsultadas: uniqueTerms.length };
}

function calculatePriorityScore(category, demanda) {
  const estoqueScore = Math.min(category.unidadesEstoque, 80);
  const valorScore = Math.min(category.valorEstoque / 50, 40);
  const kitScore = category.emKits * 5;
  const demandaScore = demanda.score * 0.4;
  const momentumBonus =
    category.google?.momentum > 0
      ? Math.min(category.google.momentum, 20)
      : 0;
  const penaltyBaixo = category.estoqueBaixo * 2;

  return Math.round(
    demandaScore + estoqueScore * 0.25 + valorScore + kitScore + momentumBonus - penaltyBaixo
  );
}

function buildInsights(categories, totalUnidades) {
  const oportunidades = categories
    .filter(
      (item) =>
        item.estoque.produtosEmEstoque > 0 &&
        (item.demanda.score >= 25 ||
          item.estoque.unidadesEstoque >= 8 ||
          item.estoque.valorEstoque >= 200)
    )
    .sort((a, b) => b.prioridade - a.prioridade)
    .slice(0, 10);

  const repor = categories
    .filter(
      (item) =>
        item.estoque.semEstoque > 0 ||
        item.estoque.estoqueBaixo >= 2 ||
        (item.demanda.score >= 40 && item.estoque.unidadesEstoque <= 5)
    )
    .sort((a, b) => {
      const scoreA = a.estoque.semEstoque * 10 + a.estoque.estoqueBaixo;
      const scoreB = b.estoque.semEstoque * 10 + b.estoque.estoqueBaixo;
      return scoreB - scoreA;
    })
    .slice(0, 10);

  const destaqueEstoque = categories
    .filter((item) => item.estoque.unidadesEstoque > 0)
    .sort((a, b) => b.estoque.valorEstoque - a.estoque.valorEstoque)
    .slice(0, 6);

  const emAlta = categories
    .filter(
      (item) =>
        item.google.momentum >= 8 ||
        (item.demanda.fonte === "mercado" && item.demanda.score >= 70)
    )
    .sort((a, b) => {
      const scoreA = a.google.momentum || a.demanda.score;
      const scoreB = b.google.momentum || b.demanda.score;
      return scoreB - scoreA;
    })
    .slice(0, 6);

  const categoriesWithShare = categories.map((item) => ({
    ...item,
    estoque: {
      ...item.estoque,
      percentualEstoque:
        totalUnidades > 0
          ? Math.round((item.estoque.unidadesEstoque / totalUnidades) * 1000) / 10
          : 0,
    },
  }));

  return {
    oportunidades,
    repor,
    destaqueEstoque,
    emAlta,
    categoriesWithShare,
  };
}

export async function getTrendsAnalysis() {
  const inventory = await loadCategoriesWithInventory();

  if (inventory.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      fonte: "Cadastro interno",
      modo: "categorias",
      summary: {
        totalCategorias: 0,
        comEstoque: 0,
        semEstoque: 0,
        totalProdutos: 0,
        totalUnidades: 0,
        valorTotalEstoque: 0,
        googleConsultadas: 0,
        googleComDados: 0,
        oportunidades: 0,
        repor: 0,
      },
      insights: {
        oportunidades: [],
        repor: [],
        destaqueEstoque: [],
        emAlta: [],
      },
      categories: [],
      allTrends: [],
    };
  }

  const searchTerms = inventory.map((cat) => cat.meta.searchTerm);
  const { trendByTerm, googleConsultadas } =
    await fetchGoogleTrendsBySearchTerms(searchTerms);

  const totalUnidades = inventory.reduce(
    (sum, cat) => sum + cat.unidadesEstoque,
    0
  );
  const valorTotalEstoque = inventory.reduce(
    (sum, cat) => sum + cat.valorEstoque,
    0
  );

  const categories = inventory.map((category) => {
    const google = trendByTerm.get(category.meta.searchTerm) || {
      value: 0,
      momentum: 0,
      googleDisponivel: false,
      timeline: [],
      status: "morta",
    };

    const demanda = getEffectiveDemand(google, category.marketplaceRef);
    const prioridade = calculatePriorityScore(
      { ...category, google },
      demanda
    );

    return {
      categoryId: category.id,
      categoryName: category.name,
      tipoPeca: category.meta.tipoPeca,
      material: category.meta.material,
      searchTerm: category.meta.searchTerm,
      searchKey: category.meta.searchKey,
      google,
      demanda,
      marketplaceRef: category.marketplaceRef,
      estoque: {
        totalProdutos: category.totalProdutos,
        produtosEmEstoque: category.produtosEmEstoque,
        unidadesEstoque: category.unidadesEstoque,
        semEstoque: category.semEstoque,
        estoqueBaixo: category.estoqueBaixo,
        emKits: category.emKits,
        valorEstoque: category.valorEstoque,
        precoMedio: category.precoMedio,
        precoMin: category.precoMin,
        precoMax: category.precoMax,
        percentualEstoque: 0,
      },
      topProdutos: category.topProdutos,
      prioridade,
      keyword: category.name,
      value: demanda.score,
      momentum: google.momentum,
      status: getTrendStatus(demanda.score),
      category: "cadastro",
      timeline: google.timeline,
      categoriasSugeridas: [category.name],
      produtosEstoque: category.topProdutos,
      estoqueDisponivel: category.produtosEmEstoque,
    };
  });

  categories.sort((a, b) => b.prioridade - a.prioridade);

  const insightsResult = buildInsights(categories, totalUnidades);
  const finalCategories = insightsResult.categoriesWithShare;

  const googleComDados = finalCategories.filter(
    (item) => item.google.googleDisponivel
  ).length;

  return {
    timestamp: new Date().toISOString(),
    fonte: "Categorias do cadastro + Google Trends + Mercado Livre",
    modo: "categorias",
    summary: {
      totalCategorias: finalCategories.length,
      comEstoque: finalCategories.filter(
        (item) => item.estoque.produtosEmEstoque > 0
      ).length,
      semEstoque: finalCategories.filter(
        (item) => item.estoque.produtosEmEstoque === 0
      ).length,
      totalProdutos: finalCategories.reduce(
        (sum, item) => sum + item.estoque.totalProdutos,
        0
      ),
      totalUnidades,
      valorTotalEstoque: Math.round(valorTotalEstoque * 100) / 100,
      googleConsultadas,
      googleComDados,
      oportunidades: insightsResult.oportunidades.length,
      repor: insightsResult.repor.length,
    },
    insights: {
      oportunidades: insightsResult.oportunidades,
      repor: insightsResult.repor,
      destaqueEstoque: insightsResult.destaqueEstoque,
      emAlta: insightsResult.emAlta,
    },
    categories: finalCategories,
    topTrends: finalCategories.slice(0, 10),
    allTrends: finalCategories,
  };
}

// compat export
export function categoryToSearchTerm(categoryName) {
  return parseCategoryMeta(categoryName).searchTerm;
}
