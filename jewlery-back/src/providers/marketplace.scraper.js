import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export function formatSearchUrl(term) {
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
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

function resolveHeadlessMode() {
  if (process.env.MARKETPLACE_HEADLESS === "true") return true;
  if (process.env.MARKETPLACE_HEADLESS === "false") return false;
  if (process.platform === "win32" && process.env.NODE_ENV !== "production") {
    return false;
  }
  return true;
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

  const headless = resolveHeadlessMode();
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
    "--lang=pt-BR",
  ];

  if (!headless && process.platform === "win32") {
    args.push("--window-position=-32000,-32000", "--window-size=1366,900");
  }

  return {
    executablePath,
    headless,
    args,
  };
}

export function isChromeAvailableForScraping() {
  if (shouldUseSparticuzChromium()) return true;
  return Boolean(resolveChromeExecutable());
}

export function isMarketplaceScrapingEnabled() {
  if (process.env.MARKETPLACE_SCRAPING_ENABLED === "false") return false;
  if (process.env.DISABLE_MARKETPLACE_SCRAPING === "true") return false;
  return isChromeAvailableForScraping();
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
    const parseSold = (text) => {
      if (!text) return 0;
      const milMatch = text.match(/\+?\s*(\d+(?:[.,]\d+)?)\s*mil\s+vendidos/i);
      if (milMatch) {
        return Math.round(parseFloat(milMatch[1].replace(",", ".")) * 1000);
      }
      const soldMatch = text.match(/(\d[\d.]*)\s+vendidos/i);
      if (soldMatch) {
        return parseInt(soldMatch[1].replace(/\./g, ""), 10) || 0;
      }
      return 0;
    };

    const parseStars = (text) => {
      if (!text) return 4.5;
      const pipeMatch = text.match(/(\d[.,]\d)\s*\|/);
      if (pipeMatch) {
        return parseFloat(pipeMatch[1].replace(",", ".")) || 4.5;
      }
      const starMatch = text.match(/(\d[.,]\d)\s*(?:de\s*5|estrelas?)/i);
      if (starMatch) {
        return parseFloat(starMatch[1].replace(",", ".")) || 4.5;
      }
      return 4.5;
    };

    const cards = Array.from(
      document.querySelectorAll(".poly-card, .ui-search-layout__item")
    ).slice(0, 12);

    const listings = [];

    for (const card of cards) {
      const title =
        card.querySelector(".poly-component__title")?.textContent?.trim() ||
        card.querySelector(".ui-search-item__title")?.textContent?.trim() ||
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

      const cardText = card.textContent || "";
      const sold = parseSold(cardText);
      const rating = parseStars(cardText);

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

      listings.push({
        title,
        image,
        price,
        sold,
        rating,
        trackingUrl,
        directUrl,
      });
    }

    if (listings.length === 0) return null;

    listings.sort((a, b) => b.sold - a.sold);
    return listings[0];
  });
}

let sharedBrowserPromise = null;

async function getBrowser() {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = (async () => {
      const launchOptions = await resolveLaunchOptions();
      if (!launchOptions) return null;
      console.log(
        `  🌐 Chrome para scraping ML (headless: ${launchOptions.headless})`
      );
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
    await page.setExtraHTTPHeaders({
      "Accept-Language": "pt-BR,pt;q=0.9",
    });

    for (const term of terms) {
      let listing = null;

      for (let attempt = 1; attempt <= 2 && !listing; attempt += 1) {
        try {
          const searchUrl = buildSearchPageUrl(term);
          if (attempt > 1) {
            console.log(`  ↻ Retentando "${term}" (tentativa ${attempt})...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } else {
            console.log(`  → ${searchUrl}`);
          }

          await page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });

          try {
            await page.waitForSelector(".poly-card, .ui-search-layout__item", {
              timeout: process.env.RAILWAY_ENVIRONMENT ? 8000 : 25000,
            });
          } catch {
            const currentUrl = page.url();
            if (currentUrl.includes("account-verification")) {
              console.warn(
                `  🚫 ML redirecionou para login (${currentUrl})`
              );
            }
            continue;
          }

          await page.evaluate(() => window.scrollBy(0, 400));
          await new Promise((resolve) =>
            setTimeout(resolve, process.env.RAILWAY_ENVIRONMENT ? 1000 : 1500)
          );

          listing = await extractTopListingFromPage(page);
        } catch (err) {
          console.warn(
            `⚠️ Scraping ML falhou para "${term}" (tentativa ${attempt}): ${err.message}`
          );
        }
      }

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
          buildSearchPageUrl(term),
        urlBusca: buildSearchPageUrl(term),
        itemId,
        preco: parsePrice(listing.price),
        vendidos: listing.sold || 0,
        rating: listing.rating || 4.5,
        marketplace: "mercado-livre",
      });

      await new Promise((resolve) => setTimeout(resolve, 1200));
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
