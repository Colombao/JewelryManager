import {
  buildCardDescriptionFromKit,
  flattenKitUnits,
  isUnitSettled,
} from "../src/modules/flow/flow.utils.js";

describe("isUnitSettled", () => {
  it("marks missing units as settled", () => {
    expect(isUnitSettled({ missingOrLost: true, soldByOwner: false, soldByReseller: false })).toBe(true);
  });

  it("marks mutually confirmed sales as settled", () => {
    expect(isUnitSettled({ missingOrLost: false, soldByOwner: true, soldByReseller: true })).toBe(true);
  });

  it("keeps pending units open", () => {
    expect(isUnitSettled({ missingOrLost: false, soldByOwner: true, soldByReseller: false })).toBe(false);
  });
});

describe("flattenKitUnits", () => {
  it("expands kit items into flat unit list", () => {
    const units = flattenKitUnits([
      {
        id: 10,
        reference: "BR-001",
        description: "Brinco",
        category: "BRINCO",
        quantity: 2,
        product: { id: 1, name: "Brinco" },
        units: [
          {
            id: 100,
            unitIndex: 1,
            unitPrice: 50,
            soldByOwner: false,
            soldByReseller: false,
            missingOrLost: false,
          },
          {
            id: 101,
            unitIndex: 2,
            unitPrice: 50,
            soldByOwner: true,
            soldByReseller: true,
            missingOrLost: false,
          },
        ],
      },
    ]);

    expect(units).toHaveLength(2);
    expect(units[0].pieceLabel).toBe("Peça 1 de 2");
    expect(units[1].soldByOwner).toBe(true);
  });
});

describe("buildCardDescriptionFromKit", () => {
  it("formats quantity and total in BRL", () => {
    const description = buildCardDescriptionFromKit({
      totalQty: 3,
      grandTotal: 150,
    });

    expect(description).toContain("3 peças");
    expect(description).toContain("R$");
  });
});
