import {
  addDays,
  buildKitAutomatically,
  buildOriginalKitProductQty,
  formatBRL,
  formatDateInput,
  getAvailableProductQuantity,
  getDisplayPrice,
  getProductReference,
  getProductStockUsage,
  groupItemsByCategory,
  lineTotal,
  normalizeCategory,
  parseApiDateInput,
  parsePrice,
  productMatchesSearch,
  validateKitStockItems,
  type KitLineItem,
  type Product,
} from "@/app/kit/kitUtils";

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  code: "BR-001",
  sku: null,
  reference: null,
  name: "Brinco Argola",
  description: "Semi joia",
  image: null,
  quantity: 5,
  priceLevel1: "100.00",
  priceLevel2: null,
  priceLevel3: null,
  adjustedPrice: null,
  active: true,
  category: { id: 1, name: "BRINCO OURO" },
  ...overrides,
});

describe("parsePrice", () => {
  it("parses numeric strings", () => {
    expect(parsePrice("89,90")).toBe(89.9);
    expect(parsePrice("120.50")).toBe(120.5);
    expect(parsePrice("")).toBeNull();
  });
});

describe("getDisplayPrice", () => {
  it("prefers adjusted price over level prices", () => {
    expect(
      getDisplayPrice(
        product({ adjustedPrice: "75.00", priceLevel1: "100.00" })
      )
    ).toBe(75);
  });
});

describe("formatBRL", () => {
  it("formats currency in pt-BR", () => {
    expect(formatBRL(150)).toContain("150");
  });
});

describe("normalizeCategory", () => {
  it("normalizes empty to OUTROS", () => {
    expect(normalizeCategory("")).toBe("OUTROS");
    expect(normalizeCategory(" brinco ouro ")).toBe("BRINCO OURO");
  });
});

describe("getProductReference", () => {
  it("uses code, reference, sku or fallback id", () => {
    expect(getProductReference(product())).toBe("BR-001");
    expect(getProductReference(product({ code: null, reference: "REF-1" }))).toBe(
      "REF-1"
    );
  });
});

describe("lineTotal and groupItemsByCategory", () => {
  it("calculates totals and groups by category", () => {
    const items: KitLineItem[] = [
      {
        id: "1",
        productId: 1,
        reference: "BR-001",
        description: "Brinco",
        category: "BRINCO OURO",
        quantity: 2,
        unitPrice: 50,
      },
      {
        id: "2",
        productId: 2,
        reference: "AN-001",
        description: "Anel",
        category: "ANEL",
        quantity: 1,
        unitPrice: 80,
      },
    ];

    expect(lineTotal(items[0])).toBe(100);
    const groups = groupItemsByCategory(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].totalValue).toBeGreaterThan(0);
  });
});

describe("stock helpers", () => {
  const items: KitLineItem[] = [
    {
      id: "line-1",
      productId: 1,
      reference: "BR-001",
      description: "Brinco",
      category: "BRINCO OURO",
      quantity: 2,
      unitPrice: 50,
    },
  ];

  it("tracks stock usage in kit", () => {
    expect(getProductStockUsage(items, 1)).toBe(2);
    expect(getProductStockUsage(items, 1, "line-1")).toBe(0);
  });

  it("computes available quantity with reserved stock", () => {
    const available = getAvailableProductQuantity(
      product({ quantity: 5 }),
      items,
      { 1: 1 }
    );
    expect(available).toBe(4);
  });

  it("builds original reserved map", () => {
    expect(
      buildOriginalKitProductQty([
        { productId: 1, quantity: 2 },
        { productId: 1, quantity: 1 },
        { productId: null, quantity: 5 },
      ])
    ).toEqual({ 1: 3 });
  });
});

describe("validateKitStockItems", () => {
  it("returns errors when requested quantity exceeds stock", () => {
    const items: KitLineItem[] = [
      {
        id: "1",
        productId: 1,
        reference: "BR-001",
        description: "Brinco",
        category: "BRINCO OURO",
        quantity: 10,
        unitPrice: 50,
      },
    ];

    const errors = validateKitStockItems(items, [product({ quantity: 5 })]);
    expect(errors[0]).toContain("solicitado 10");
  });
});

describe("buildKitAutomatically", () => {
  it("builds kit respecting category rules and max total", () => {
    const products = [
      product({ id: 1, quantity: 3, priceLevel1: "50.00" }),
      product({
        id: 2,
        code: "AN-001",
        name: "Anel",
        quantity: 2,
        priceLevel1: "80.00",
        category: { id: 2, name: "ANEL" },
      }),
    ];

    const result = buildKitAutomatically(
      products,
      [
        { category: "BRINCO OURO", quantity: 1 },
        { category: "ANEL", quantity: 1 },
      ],
      200
    );

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(130);
  });

  it("warns when no rules are provided", () => {
    const result = buildKitAutomatically([], [], 100);
    expect(result.warnings[0]).toContain("Selecione pelo menos uma categoria");
  });
});

describe("productMatchesSearch", () => {
  it("matches product fields against search term", () => {
    expect(productMatchesSearch(product(), "brinco")).toBe(true);
    expect(productMatchesSearch(product(), "pulseira")).toBe(false);
  });
});

describe("date helpers", () => {
  it("formats and shifts dates", () => {
    const base = new Date("2026-06-21T12:00:00.000Z");
    expect(formatDateInput(base)).toBe("2026-06-21");
    expect(formatDateInput(addDays(base, 7))).toBe("2026-06-28");
    expect(parseApiDateInput("2026-06-21")).toBe("2026-06-21");
  });
});
