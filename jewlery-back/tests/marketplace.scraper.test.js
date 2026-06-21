import {
  buildMercadoLivreProductUrl,
  buildSearchPageUrl,
  extractMercadoLivreItemId,
  formatSearchUrl,
} from "../src/providers/marketplace.scraper.js";

describe("formatSearchUrl", () => {
  it("slugifies search terms", () => {
    expect(formatSearchUrl("Brinco Argola Dourado")).toBe("brinco-argola-dourado");
  });
});

describe("buildSearchPageUrl", () => {
  it("builds Mercado Livre listing URL", () => {
    expect(buildSearchPageUrl("anel feminino")).toBe(
      "https://lista.mercadolivre.com.br/anel-feminino"
    );
  });
});

describe("extractMercadoLivreItemId", () => {
  it("extracts MLB id from product URLs", () => {
    expect(
      extractMercadoLivreItemId(
        "https://produto.mercadolivre.com.br/MLB-1234567890?wid=MLB1234567890"
      )
    ).toBe("MLB1234567890");
  });

  it("returns null for invalid urls", () => {
    expect(extractMercadoLivreItemId(null)).toBeNull();
    expect(extractMercadoLivreItemId("https://example.com")).toBeNull();
  });
});

describe("buildMercadoLivreProductUrl", () => {
  it("builds canonical product URL from item id", () => {
    expect(buildMercadoLivreProductUrl("MLB1234567890")).toBe(
      "https://produto.mercadolivre.com.br/MLB-1234567890"
    );
  });
});
