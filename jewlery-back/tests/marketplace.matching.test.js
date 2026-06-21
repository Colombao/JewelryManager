import {
  inferCategoriesFromTrendName,
  mapProductForTrendResponse,
  matchProductsToTrend,
  normalizeText,
  productMatchesCategories,
  scoreProductForTrend,
} from "../src/providers/marketplace.matching.js";

const sampleProduct = (overrides = {}) => ({
  id: 1,
  name: "Brinco Argola Dourado",
  description: "Semi joia delicada",
  code: "BR-001",
  reference: null,
  sku: null,
  quantity: 10,
  active: true,
  adjustedPrice: 89.9,
  priceLevel1: 89.9,
  image: "/uploads/brinco.jpg",
  category: { name: "BRINCO OURO" },
  ...overrides,
});

describe("normalizeText", () => {
  it("removes accents and lowercases", () => {
    expect(normalizeText("  Joia Dourada  ")).toBe("joia dourada");
    expect(normalizeText("Semi-Joias")).toBe("semi-joias");
  });
});

describe("productMatchesCategories", () => {
  it("matches product category against list", () => {
    const product = sampleProduct();
    expect(productMatchesCategories(product, ["BRINCO OURO"])).toBe(true);
    expect(productMatchesCategories(product, ["ANEL"])).toBe(false);
  });
});

describe("scoreProductForTrend", () => {
  it("scores higher when trend words appear in product text", () => {
    const product = sampleProduct();
    const score = scoreProductForTrend(product, "brinco argola dourado");
    expect(score).toBeGreaterThan(0);
  });

  it("adds bonus for in-stock active products in price range", () => {
    const cheap = sampleProduct({ adjustedPrice: 80, quantity: 5, active: true });
    const expensive = sampleProduct({ adjustedPrice: 300, quantity: 0, active: false });
    expect(scoreProductForTrend(cheap, "brinco")).toBeGreaterThan(
      scoreProductForTrend(expensive, "brinco")
    );
  });
});

describe("matchProductsToTrend", () => {
  it("filters inactive products and respects limit", () => {
    const products = [
      sampleProduct({ id: 1, active: true }),
      sampleProduct({ id: 2, active: false }),
      sampleProduct({ id: 3, active: true, name: "Brinco Ponto de Luz" }),
    ];

    const matches = matchProductsToTrend(products, "brinco", ["BRINCO OURO"], 1);
    expect(matches).toHaveLength(1);
    expect(matches[0].nome).toBeTruthy();
  });
});

describe("mapProductForTrendResponse", () => {
  it("maps product fields to API shape", () => {
    const mapped = mapProductForTrendResponse(sampleProduct());
    expect(mapped).toMatchObject({
      id: 1,
      nome: "Brinco Argola Dourado",
      referencia: "BR-001",
      categoria: "BRINCO OURO",
      estoque: 10,
      preco: 89.9,
    });
  });
});

describe("inferCategoriesFromTrendName", () => {
  it("infers jewelry categories from trend keywords", () => {
    expect(inferCategoriesFromTrendName("brinco argola")).toEqual(
      expect.arrayContaining(["BRINCO", "BRINCO OURO"])
    );
    expect(inferCategoriesFromTrendName("anel ajustável")).toEqual(
      expect.arrayContaining(["ANEL"])
    );
    expect(inferCategoriesFromTrendName("pulseira feminina")).toEqual(
      expect.arrayContaining(["PULSEIRA"])
    );
  });
});
