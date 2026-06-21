import { applyImportPriceLevels } from "@/app/cadastro/productImport";

describe("applyImportPriceLevels", () => {
  it("calculates price levels from grand total and margins", () => {
    const items = applyImportPriceLevels(
      [{ name: "Brinco", grandTotal: 100 }],
      [
        { id: 1, level: 1, name: "Varejo", multiplier: 1.5 },
        { id: 2, level: 2, name: "Atacado", multiplier: 2 },
        { id: 3, level: 3, name: "Premium", multiplier: 2.5 },
      ]
    );

    expect(items[0].priceLevel1).toBe("150.00");
    expect(items[0].priceLevel2).toBe("200.00");
    expect(items[0].priceLevel3).toBe("250.00");
  });

  it("skips items without valid grand total", () => {
    const items = applyImportPriceLevels([{ name: "Sem preço" }], []);
    expect(items[0].priceLevel1).toBeUndefined();
  });
});
