import {
  buildTrioCodes,
  getTrioBaseCode,
  isTrioSizeCode,
} from "../src/modules/products/products.category.js";

describe("trio helpers used by ensureTrioVariants", () => {
  test("numeric catalog codes expand to P/M/G", () => {
    expect(getTrioBaseCode("13706")).toBe("13706");
    expect(getTrioBaseCode("13706P")).toBe("13706");
    expect(isTrioSizeCode("13706")).toBe(false);
    expect(isTrioSizeCode("13706P")).toBe(true);
    expect(buildTrioCodes("13706")).toEqual([
      "13706",
      "13706p",
      "13706m",
      "13706g",
    ]);
  });

  test("br codes expand with lowercase suffixes", () => {
    expect(buildTrioCodes("br10")).toEqual(["br10", "br10p", "br10m", "br10g"]);
  });
});
