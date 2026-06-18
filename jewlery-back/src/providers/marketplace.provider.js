// Marketplace trends: Mercado Livre (API/scraping) + fallback por estoque cadastrado
import fs from "fs";
import path from "path";
import { load as cheerioLoad } from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
  buildHybridTrends,
  enrichTrendsWithStock,
  inferCategoriesFromTrendName,
} from "./marketplace.matching.js";
import { isChromeAvailableForScraping } from "./marketplace.scraper.js";

puppeteer.use(StealthPlugin());

let cacheMarketplace = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 10 * 60 * 1000,
};

export function clearMarketplaceCache() {
  cacheMarketplace = {
    ...cacheMarketplace,
    data: null,
    timestamp: null,
  };
}

const SEARCH_TERMS = [
  "semi joia",
  "brinco semi joia",
  "anel semi joia",
  "colar semi joia",
  "pulseira semi joia",
];

function formatSearchUrl(term) {
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function parsePrice(priceText) {
  if (!priceText) return 0;
  const cleaned = priceText.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(",", ".")) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function normalizeExternalImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("//")) return `https:${image}`;
  if (image.startsWith("http://")) return image.replace("http://", "https://");
  return image;
}

function isBlockedHtml(html) {
  return /suspicious-traffic|account-verification|captcha|challenge-form/i.test(
    html
  );
}

function calculateTrendScore({ crescimento, vendidos, rating, preco }) {
  const priceBoost = preco > 0 && preco <= 150 ? 8 : preco <= 300 ? 4 : 0;
  return Math.round(
    (crescimento * 0.45 +
      Math.min(vendidos, 500) * 0.08 +
      Number(rating || 0) * 8 +
      priceBoost) /
      1.2
  );
}

function mapRawTrend(item, index) {
  const crescimento = Math.max(
    20,
    Math.min(99, Math.round(item.crescimento || 40 + index * 3))
  );

  return {
    termoTendencia: item.termoTendencia || item.nome,
    nome: item.nome,
    vendidos: item.vendidos || 0,
    preco: item.preco || 0,
    marketplace: item.marketplace || "mercado-livre",
    categoria: item.categoria || inferCategoriesFromTrendName(item.nome)[0] || "produtos",
    categoriasSugeridas:
      item.categoriasSugeridas || inferCategoriesFromTrendName(item.nome),
    imagem: normalizeExternalImageUrl(item.imagem),
    crescimento,
    rating: Number(item.rating || 4.5),
    reviews: item.reviews || item.vendidos || 0,
    url: item.url || item.urlBusca || null,
    urlBusca: item.urlBusca || null,
    itemId: item.itemId || null,
    score: calculateTrendScore({
      crescimento,
      vendidos: item.vendidos || 0,
      rating: item.rating || 4.5,
      preco: item.preco || 0,
    }),
  };
}

async function fetchFromMercadoLivreApi() {
  const products = [];

  for (const term of SEARCH_TERMS.slice(0, 3)) {
    try {
      const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(term)}&limit=20`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Referer: "https://lista.mercadolivre.com.br/",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      for (const item of data.results || []) {
        products.push({
          id: item.id,
          nome: item.title,
          preco: item.price,
          vendidos: item.sold_quantity || 0,
          crescimento: Math.min(
            95,
            35 + Math.round((item.sold_quantity || 0) / 20)
          ),
          rating: 4.5,
          reviews: item.sold_quantity || 0,
          imagem: item.thumbnail,
          url: item.permalink,
          marketplace: "mercado-livre",
          categoria: inferCategoriesFromTrendName(item.title)[0] || "produtos",
        });
      }
    } catch (err) {
      console.warn(`⚠️ API ML falhou para "${term}": ${err.message}`);
    }
  }

  return products;
}

function extractProductsFromHtml(html, term) {
  if (isBlockedHtml(html)) return [];

  const $ = cheerioLoad(html);
  const selectors = [
    "li.ui-search-layout__item",
    ".ui-search-layout__item",
    ".ui-search-result",
    ".poly-card",
    "[data-item-id]",
  ];

  let items = [];
  for (const selector of selectors) {
    const found = $(selector);
    if (found.length > 0) {
      items = found.slice(0, 25);
      break;
    }
  }

  const extracted = [];

  items.each((idx, el) => {
    const $item = $(el);

    const title =
      $item
        .find(
          ".poly-component__title, .ui-search-item__title, .ui-search-result__title, h2"
        )
        .first()
        .text()
        .trim() ||
      $item.find("a[title]").first().attr("title") ||
      $item.find("a").first().text().trim();

    const priceText = $item
      .find(
        ".andes-money-amount__fraction, .poly-price__current, .ui-search-price__second-line, [class*='price']"
      )
      .first()
      .text()
      .trim();

    const link =
      $item.find("a[href*='mercadolivre']").first().attr("href") ||
      $item.find("a").first().attr("href");

    const image = normalizeExternalImageUrl(
      $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("src")
    );

    const price = parsePrice(priceText);
    if (!title || title.length < 5 || price <= 5) return;

    extracted.push({
      id: `ml_${formatSearchUrl(term)}_${idx}`,
      nome: title.substring(0, 120),
      preco: price,
      vendidos: Math.max(10, Math.round(120 - idx * 3)),
      crescimento: Math.max(30, 85 - idx * 4),
      rating: 4.6,
      reviews: Math.max(5, 80 - idx * 2),
      imagem: image,
      url: link || `https://lista.mercadolivre.com.br/${formatSearchUrl(term)}`,
      marketplace: "mercado-livre",
      categoria: inferCategoriesFromTrendName(title)[0] || "produtos",
    });
  });

  return extracted;
}

async function fetchFromMercadoLivreFetch() {
  const allProducts = [];
  const seen = new Set();

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://lista.mercadolivre.com.br/${formatSearchUrl(term)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9",
          Referer: "https://lista.mercadolivre.com.br/",
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) continue;

      const html = await response.text();

      if (isBlockedHtml(html)) {
        console.warn(`  🚫 Mercado Livre bloqueou fetch para "${term}"`);
        break;
      }

      const extracted = extractProductsFromHtml(html, term);

      for (const product of extracted) {
        const key = normalizeText(product.nome);
        if (seen.has(key)) continue;
        seen.add(key);
        allProducts.push(product);
      }
    } catch (err) {
      console.warn(`⚠️ Fetch ML falhou para "${term}": ${err.message}`);
    }
  }

  return allProducts;
}

function normalizeText(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveChromeExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA
      ? path.join(
          process.env.LOCALAPPDATA,
          "Google",
          "Chrome",
          "Application",
          "chrome.exe"
        )
      : null,
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function fetchFromMercadoLivrePuppeteer() {
  let browser;

  try {
    const executablePath = resolveChromeExecutable();
    const headless =
      process.env.MARKETPLACE_HEADLESS === "true"
        ? true
        : process.env.MARKETPLACE_HEADLESS === "false"
          ? false
          : process.platform === "win32" && process.env.NODE_ENV !== "production"
            ? false
            : true;

    const launchOptions = {
      headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    };

    if (!headless && process.platform === "win32") {
      launchOptions.args.push("--window-position=-32000,-32000", "--window-size=1366,900");
    }

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(45000);

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    const allProducts = [];
    const seen = new Set();

    for (const term of SEARCH_TERMS) {
      const searchUrl = `https://lista.mercadolivre.com.br/${formatSearchUrl(term)}`;
      console.log(`  → Puppeteer: ${searchUrl}`);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });

      await new Promise((resolve) => setTimeout(resolve, 2500));

      try {
        await page.waitForFunction(
          () =>
            document.querySelector(".ui-search-layout__item") ||
            document.querySelector(".poly-card") ||
            document.querySelector(".ui-search-result"),
          { timeout: 10000 }
        );
      } catch {
        console.warn(`  ⚠️ Timeout aguardando resultados para "${term}"`);
      }

      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const html = await page.content();

      if (isBlockedHtml(html)) {
        console.warn(`  🚫 Mercado Livre bloqueou acesso para "${term}"`);
        continue;
      }

      const extracted = extractProductsFromHtml(html, term);
      for (const product of extracted) {
        const key = normalizeText(product.nome);
        if (seen.has(key)) continue;
        seen.add(key);
        allProducts.push(product);
      }
    }

    return allProducts;
  } catch (err) {
    console.error(`❌ Puppeteer falhou: ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close().catch(() => null);
  }
}

function hasRealMercadoLivreData(products) {
  return (
    Array.isArray(products) &&
    products.some(
      (trend) => trend.marketplace === "mercado-livre" && trend.imagem
    )
  );
}

async function fetchFromMercadoLivre(limit = 10) {
  if (cacheMarketplace.data && Date.now() - cacheMarketplace.timestamp < cacheMarketplace.CACHE_DURATION) {
    if (hasRealMercadoLivreData(cacheMarketplace.data.products)) {
      console.log("✅ Usando cache de tendências do Mercado Livre (10 min)...");
      return cacheMarketplace.data;
    }
    console.log("↪ Cache sem dados reais do ML — buscando novamente...");
    clearMarketplaceCache();
  }

  console.log("🔍 Buscando anúncios reais no Mercado Livre...");
  const hybridTrends = await buildHybridTrends(limit);

  if (hasRealMercadoLivreData(hybridTrends)) {
    cacheMarketplace = {
      data: {
        products: hybridTrends,
        fonte: "Mercado Livre (anúncios reais)",
      },
      timestamp: Date.now(),
    };

    console.log(`✅ ${hybridTrends.length} anúncios reais do Mercado Livre`);
    return cacheMarketplace.data;
  }

  console.log("↪ Scraping por termo falhou, tentando lote alternativo...");

  let products = await fetchFromMercadoLivreApi();
  let fonte = "API Mercado Livre";

  if (products.length === 0) {
    console.log("↪ Tentando fetch HTML...");
    products = await fetchFromMercadoLivreFetch();
    fonte = "Web Scraping - Mercado Livre (HTML)";
  }

  const shouldTryPuppeteer =
    products.length === 0 &&
    (process.env.MARKETPLACE_USE_PUPPETEER === "true" ||
      isChromeAvailableForScraping());

  if (shouldTryPuppeteer) {
    console.log("↪ Tentando Puppeteer...");
    products = await fetchFromMercadoLivrePuppeteer();
    fonte = "Web Scraping - Mercado Livre (Browser)";
  } else if (products.length === 0) {
    console.log(
      "↪ Mercado Livre indisponível para scraping automático (bloqueio/captcha)."
    );
  }

  if (products.length === 0) {
    return {
      products: [],
      fonte: "Mercado Livre indisponível",
    };
  }

  const mlProducts = products.filter(
    (item) => item.marketplace === "mercado-livre" && item.imagem
  );

  if (mlProducts.length === 0) {
    return {
      products: [],
      fonte: "Mercado Livre indisponível",
    };
  }

  const sorted = mlProducts
    .sort((a, b) => {
      if (b.crescimento !== a.crescimento) return b.crescimento - a.crescimento;
      if (b.vendidos !== a.vendidos) return b.vendidos - a.vendidos;
      return b.preco - a.preco;
    })
    .slice(0, 50);

  cacheMarketplace = {
    data: { products: sorted, fonte },
    timestamp: Date.now(),
  };

  console.log(`✅ ${sorted.length} tendências coletadas (${fonte})`);
  return cacheMarketplace.data;
}

export async function getMarketplaceTrends(limit = 10, options = {}) {
  if (options.refresh) {
    clearMarketplaceCache();
  }

  const { products, fonte } = await fetchFromMercadoLivre(limit);

  if (!products || products.length === 0) {
    throw new Error(
      "Não foi possível carregar anúncios do Mercado Livre. Reinicie o backend e tente novamente em alguns minutos."
    );
  }

  const mapped = products.map((trend, index) => mapRawTrend(trend, index));
  const sorted = mapped.sort((a, b) => b.score - a.score);
  const topTrends = await enrichTrendsWithStock(sorted.slice(0, limit));

  return {
    timestamp: new Date().toISOString(),
    fonte,
    totalProdutos: products.length,
    topTrends: topTrends.map((trend, idx) => ({
      ...trend,
      posicao: idx + 1,
      crescimento: Math.round(trend.crescimento),
      score: trend.score || calculateTrendScore(trend),
      imagem: trend.imagem || null,
    })),
  };
}

export async function getMarketplaceTrendsByCategory(category, limit = 5) {
  const { products } = await fetchFromMercadoLivre();
  const normalizedCategory = normalizeText(category);

  const filtered = products
    .filter((item) =>
      normalizeText(item.categoria).includes(normalizedCategory)
    )
    .map((item, index) => mapRawTrend(item, index))
    .sort((a, b) => b.crescimento - a.crescimento);

  return enrichTrendsWithStock(filtered.slice(0, limit));
}

export async function compareKeywordWithMarketplace(keyword) {
  const { products } = await fetchFromMercadoLivre();
  const normalizedKeyword = normalizeText(keyword);

  const relatedProducts = products
    .filter((item) => normalizeText(item.nome).includes(normalizedKeyword))
    .map((item, index) => mapRawTrend(item, index))
    .sort((a, b) => b.crescimento - a.crescimento);

  const enriched = await enrichTrendsWithStock(relatedProducts);

  return {
    keyword,
    encontradosNoMercado: enriched.length,
    produtos: enriched,
    mediaGrowth:
      enriched.length > 0
        ? Math.round(
            enriched.reduce((acc, item) => acc + item.crescimento, 0) /
              enriched.length
          )
        : 0,
  };
}

export async function getKitSuggestionsFromTrends(limit = 8) {
  const trends = await getMarketplaceTrends(limit);
  const suggestions = trends.topTrends
    .filter((trend) => trend.estoqueDisponivel > 0)
    .map((trend) => ({
      tendencia: trend.nome,
      score: trend.score,
      crescimento: trend.crescimento,
      categorias: trend.categoriasSugeridas || [],
      produtos: (trend.produtosEstoque || []).filter((item) => item.estoque > 0),
    }))
    .filter((item) => item.produtos.length > 0);

  return {
    timestamp: trends.timestamp,
    fonte: trends.fonte,
    suggestions,
  };
}
