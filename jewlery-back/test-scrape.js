import puppeteer from "puppeteer";
import { load as cheerioLoad } from "cheerio";

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Acessando: https://lista.mercadolivre.com.br/anel-semi-joia");
  await page.goto("https://lista.mercadolivre.com.br/anel-semi-joia", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  const html = await page.content();
  const $ = cheerioLoad(html);

  console.log("\n=== ESTRUTURA ENCONTRADA ===");
  console.log(`Total [data-item-id]: ${$("[data-item-id]").length}`);

  // Tenta vários seletores
  console.log(`Total div.poly-card: ${$("div.poly-card").length}`);
  console.log(`Total [class*="ol-"]: ${$("[class*='ol-']").length}`);
  console.log(`Total li.ui-search-layout: ${$("li.ui-search-layout").length}`);

  console.log("\n=== PRIMEIROS 3 PRODUTOS ===");

  // Tenta com [data-item-id]
  if ($("[data-item-id]").length > 0) {
    console.log("\n✓ Usando [data-item-id]:");
    $("[data-item-id]")
      .slice(0, 3)
      .each((i, el) => {
        const $el = $(el);
        console.log(`\n  Produto ${i + 1}:`);
        console.log(`    ID: ${$el.attr("data-item-id")}`);
        console.log(`    Titulo: ${$el.find("h2, h3, span").first().text().substring(0, 50)}`);
        console.log(`    Link: ${$el.find("a").first().attr("href")?.substring(0, 60)}`);
        console.log(`    Preço: ${$el.text().match(/R\$\s*[\d.,]+/)?.[0]}`);
      });
  }

  // Tenta com li.ui-search-layout
  if ($("li.ui-search-layout").length > 0) {
    console.log("\n✓ Usando li.ui-search-layout:");
    $("li.ui-search-layout")
      .slice(0, 3)
      .each((i, el) => {
        const $el = $(el);
        console.log(`\n  Produto ${i + 1}:`);
        console.log(`    Titulo: ${$el.find("h2, h3").text().substring(0, 50)}`);
        console.log(`    Preço: ${$el.text().match(/R\$\s*[\d.,]+/)?.[0]}`);
      });
  }

  // Tenta com .poly-card
  if ($("div.poly-card").length > 0) {
    console.log("\n✓ Usando div.poly-card:");
    $("div.poly-card")
      .slice(0, 3)
      .each((i, el) => {
        const $el = $(el);
        console.log(`\n  Produto ${i + 1}:`);
        console.log(`    Titulo: ${$el.find("h2, h3").text().substring(0, 50)}`);
        console.log(`    Preço: ${$el.text().match(/R\$\s*[\d.,]+/)?.[0]}`);
      });
  }

  console.log("\n=== ESTRUTURA RAW (primeiros 2000 chars) ===");
  console.log(html.substring(0, 2000));

  await browser.close();
})();
