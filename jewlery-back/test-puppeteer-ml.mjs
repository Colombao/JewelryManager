import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

function resolveChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c));
}

const chrome = resolveChrome();
console.log("chrome:", chrome);

if (!chrome) {
  console.log("no chrome");
  process.exit(0);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
await page.setUserAgent(
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
);

await page.goto("https://lista.mercadolivre.com.br/brinco-argola-dourado", {
  waitUntil: "networkidle2",
  timeout: 60000,
});
await new Promise((r) => setTimeout(r, 4000));

const data = await page.evaluate(() => {
  const cards = Array.from(
    document.querySelectorAll(
      "li.ui-search-layout__item, .poly-card, .ui-search-result"
    )
  ).slice(0, 3);

  return cards.map((card) => {
    const titleEl = card.querySelector(
      ".poly-component__title, .ui-search-item__title, h2, a[title]"
    );
    const linkEl = card.querySelector("a[href*='mercadolivre.com.br']");
    const imgEl = card.querySelector("img");
    const priceEl = card.querySelector(
      ".andes-money-amount__fraction, .poly-price__current"
    );
    return {
      title: titleEl?.textContent?.trim() || titleEl?.getAttribute("title"),
      link: linkEl?.href,
      image: imgEl?.src || imgEl?.dataset?.src,
      price: priceEl?.textContent?.trim(),
    };
  });
});

console.log("title page:", await page.title());
console.log(JSON.stringify(data, null, 2));
await browser.close();
