import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export function formatSearchUrl(term) {
  return term.toLowerCase().replace(/\s+/g, "-");
}

export function buildSearchPageUrl(term) {
  return `https://lista.mercadolivre.com.br/${formatSearchUrl(term)}`;
}

export function extractMercadoLivreItemId(rawUrl) {
  if (!rawUrl) return null;
  const match = rawUrl.match(/(?:item_id%3D|wid=|\/p\/)(MLB[U]?\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export function buildMercadoLivreProductUrl(itemIdOrUrl) {
  const itemId = itemIdOrUrl?.startsWith("MLB")
    ? itemIdOrUrl.toUpperCase()
    : extractMercadoLivreItemId(itemIdOrUrl);

  if (!itemId) return null;

  const suffix = itemId.replace(/^MLB[U]?/i, "");
  return `https://produto.mercadolivre.com.br/MLB-${suffix}`;
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
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function shouldUseSparticuzChromium() {
  if (process.env.USE_SPARTICUZ_CHROMIUM === "true") return true;
  if (process.env.RAILWAY_ENVIRONMENT) return true;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return true;
  return process.platform === "linux" && process.env.NODE_ENV === "production";
}

async function resolveLaunchOptions() {
  if (shouldUseSparticuzChromium()) {
    const chromium = (await import("@sparticuz/chromium")).default;

    return {
      args: [...chromium.args, "--disable-dev-shm-usage", "--lang=pt-BR"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    };
  }

  const executablePath = resolveChromeExecutable();
  if (!executablePath) return null;

  return {
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--lang=pt-BR",
    ],
  };
}

export function isChromeAvailableForScraping() {
  if (shouldUseSparticuzChromium()) return true;
  return Boolean(resolveChromeExecutable());
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
  if (image.startsWith("data:")) return null;
  return image;
}

async function extractTopListingFromPage(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".poly-card")).slice(0, 5);

    for (const card of cards) {
      const title =
        card.querySelector(".poly-component__title")?.textContent?.trim() ||
        card.querySelector("a[title]")?.getAttribute("title")?.trim();

      const imgEl =
        card.querySelector('img[src*="mlstatic"]') ||
        card.querySelector('img[data-src*="mlstatic"]') ||
        card.querySelector("img");
      const image =
        imgEl?.src ||
        imgEl?.getAttribute("data-src") ||
        imgEl?.getAttribute("data-lazy-src");

      const price =
        card.querySelector(".andes-money-amount__fraction")?.textContent?.trim() ||
        card.querySelector(".poly-price__current")?.textContent?.trim();

      const soldText =
        card.querySelector(".poly-component__review-compacted")?.textContent ||
        card.textContent ||
        "";
      const soldMatch = soldText.match(/(\d[\d.]*)\s+vendidos/i);

      const anchors = Array.from(card.querySelectorAll("a[href]"));
      let trackingUrl = null;
      let directUrl = null;

      for (const anchor of anchors) {
        const href = anchor.href;
        if (!href.includes("mercadolivre")) continue;
        if (href.includes("/p/MLB") || href.includes("produto.mercadolivre")) {
          directUrl = href.split("#")[0];
        }
        if (href.includes("MLB") && !trackingUrl) {
          trackingUrl = href;
        }
      }

      if (!title || !image || image.startsWith("data:")) continue;

      return {
        title,
        image,
        price,
        sold: soldMatch ? parseInt(soldMatch[1].replace(/\./g, ""), 10) : 0,
        trackingUrl,
        directUrl,
      };
    }

    return null;
  });
}

let sharedBrowserPromise = null;

async function getBrowser() {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = (async () => {
      const launchOptions = await resolveLaunchOptions();
      if (!launchOptions) return null;
      return puppeteer.launch(launchOptions);
    })();
  }

  try {
    return await sharedBrowserPromise;
  } catch (err) {
    console.error(`❌ Falha ao iniciar browser para scraping: ${err.message}`);
    sharedBrowserPromise = null;
    return null;
  }
}

export async function closeScraperBrowser() {
  if (!sharedBrowserPromise) return;
  const browser = await sharedBrowserPromise.catch(() => null);
  sharedBrowserPromise = null;
  if (browser) await browser.close().catch(() => null);
}

export async function fetchTopListingsForTerms(terms) {
  const browser = await getBrowser();
  if (!browser) return [];

  const listings = [];
  let page;

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": "pt-BR,pt;q=0.9",
    });

    for (const term of terms) {
      try {
        const searchUrl = buildSearchPageUrl(term);
        await page.goto(searchUrl, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });

        try {
          await page.waitForSelector(".poly-card", { timeout: 15000 });
        } catch {
          console.warn(`  ⚠️ Nenhum anúncio encontrado para "${term}"`);
          continue;
        }

        await new Promise((resolve) => setTimeout(resolve, 2500));

        const listing = await extractTopListingFromPage(page);
        if (!listing) {
          console.warn(`  ⚠️ Não foi possível extrair anúncio para "${term}"`);
          continue;
        }

        const itemId =
          extractMercadoLivreItemId(listing.directUrl) ||
          extractMercadoLivreItemId(listing.trackingUrl);

        listings.push({
          termoTendencia: term,
          nome: listing.title.substring(0, 140),
          imagem: normalizeExternalImageUrl(listing.image),
          url:
            listing.directUrl ||
            buildMercadoLivreProductUrl(itemId) ||
            searchUrl,
          urlBusca: searchUrl,
          itemId,
          preco: parsePrice(listing.price),
          vendidos: listing.sold || 0,
          marketplace: "mercado-livre",
        });
      } catch (err) {
        console.warn(`⚠️ Scraping ML falhou para "${term}": ${err.message}`);
      }
    }
  } finally {
    if (page) await page.close().catch(() => null);
    await closeScraperBrowser();
  }

  return listings;
}

export async function fetchTopListingForTerm(term) {
  const [listing] = await fetchTopListingsForTerms([term]);
  return listing || null;
}
