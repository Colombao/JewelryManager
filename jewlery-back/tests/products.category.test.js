import {
  buildTrioCodes,
  expandTrioItem,
  nextCodeForPrefix,
} from "../src/modules/products/products.category.js";

describe("trio size codes", () => {
  test("buildTrioCodes returns base + p/m/g", () => {
    expect(buildTrioCodes("br10")).toEqual(["br10", "br10p", "br10m", "br10g"]);
  });

  test("nextCodeForPrefix ignores size suffix when finding max", () => {
    expect(nextCodeForPrefix("br", ["br10p", "br10g"])).toBe("br11");
  });

  test("expandTrioItem creates four variants", () => {
    const variants = expandTrioItem({
      name: "Brinco",
      code: "br10",
      isTrio: true,
      grandTotal: "50",
      trioSizePrices: { m: { grandTotal: "70" } },
    });

    expect(variants).toHaveLength(4);
    expect(variants.map((item) => item.code)).toEqual([
      "br10",
      "br10p",
      "br10m",
      "br10g",
    ]);
    expect(variants[2].grandTotal).toBe("70");
    expect(variants[2].name).toContain("Médio");
  });

  test("expandTrioItem is a no-op without trio/code", () => {
    const item = { name: "X", code: "br01", isTrio: false };
    expect(expandTrioItem(item)).toEqual([item]);
  });
});
