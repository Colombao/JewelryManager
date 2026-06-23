import { describe, expect, it } from "vitest";
import { parseProductCatalogProps } from "@/lib/videoCatalog";

describe("parseProductCatalogProps", () => {
  it("accepts valid catalog props", () => {
    const result = parseProductCatalogProps({
      brandName: "Jewlery",
      products: [
        {
          id: 1,
          name: "Anel",
          imageUrl: "http://localhost:3001/uploads/products/a.jpg",
          price: "R$ 10,00",
          category: "Anéis",
        },
      ],
    });

    expect(result.brandName).toBe("Jewlery");
    expect(result.products).toHaveLength(1);
  });

  it("rejects empty product list", () => {
    expect(() =>
      parseProductCatalogProps({ brandName: "Jewlery", products: [] })
    ).toThrow("Selecione ao menos um produto");
  });

  it("rejects missing brand name", () => {
    expect(() =>
      parseProductCatalogProps({
        brandName: "   ",
        products: [
          {
            id: 1,
            name: "Anel",
            imageUrl: null,
            price: "R$ 10,00",
            category: null,
          },
        ],
      })
    ).toThrow("Informe o nome da marca");
  });
});
