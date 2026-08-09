import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BARTENDER_SETTINGS_STORAGE_KEY,
  buildNamedDataSources,
  buildPrintBTWAction,
  getProductLabelType,
  listProductLabelTypes,
  loadBartenderSettings,
  printProductLabels,
  saveBartenderSettings,
  validateBartenderDocumentPath,
  type LabelProduct,
} from "@/lib/bartenderPrint";

const baseProduct: LabelProduct = {
  id: 1,
  code: "br01",
  sku: "SKU-1",
  reference: "REF-1",
  barcode: "789",
  name: "BR-ALE Dourado",
  priceLevel1: "29.90",
  category: { id: 10, name: "Brinco" },
};

describe("getProductLabelType", () => {
  it("prefers category name", () => {
    expect(getProductLabelType(baseProduct)).toBe("Brinco");
  });

  it("falls back to name extraction", () => {
    expect(
      getProductLabelType({
        ...baseProduct,
        category: null,
        name: "Pulseira fina",
      })
    ).toBe("Pulseira");
  });
});

describe("listProductLabelTypes", () => {
  it("returns sorted unique types", () => {
    const types = listProductLabelTypes([
      baseProduct,
      {
        ...baseProduct,
        id: 2,
        name: "PL-10",
        category: { id: 2, name: "Pulseira" },
      },
      {
        ...baseProduct,
        id: 3,
        name: "Outro brinco",
        category: { id: 10, name: "Brinco" },
      },
    ]);
    expect(types).toEqual(["Brinco", "Pulseira"]);
  });
});

describe("buildNamedDataSources / buildPrintBTWAction", () => {
  it("maps product fields to named data sources", () => {
    const named = buildNamedDataSources(baseProduct);
    expect(named.Nome).toBe("BR-ALE Dourado");
    expect(named.Codigo).toBe("br01");
    expect(named.SKU).toBe("SKU-1");
    expect(named.Barcode).toBe("789");
    expect(named.Categoria).toBe("Brinco");
    expect(named.Preco).toContain("29");
  });

  it("builds PrintBTWAction payload with document and copies", () => {
    const settings = loadBartenderSettings();
    settings.documentPath = "C:\\Etiquetas\\Documento2.btw";
    settings.printer = "Argox OS-214 plus series PPLA";
    settings.copies = 2;

    const payload = buildPrintBTWAction(baseProduct, settings);
    expect(payload.PrintBTWAction.Document).toBe(
      "C:\\Etiquetas\\Documento2.btw"
    );
    expect(payload.PrintBTWAction.Printer).toBe(
      "Argox OS-214 plus series PPLA"
    );
    expect(payload.PrintBTWAction.Copies).toBe(2);
    expect(
      (payload.PrintBTWAction.NamedDataSources as Record<string, string>).Nome
    ).toBe("BR-ALE Dourado");
  });
});

describe("settings persistence", () => {
  afterEach(() => {
    window.localStorage.removeItem(BARTENDER_SETTINGS_STORAGE_KEY);
  });

  it("saves and loads settings from localStorage", () => {
    saveBartenderSettings({
      apiUrl: "http://127.0.0.1:5159",
      documentPath: "D:\\labels\\Documento2.btw",
      printer: "Argox",
      copies: 3,
      fieldMap: { Nome: "name" },
    });

    const loaded = loadBartenderSettings();
    expect(loaded.apiUrl).toBe("http://127.0.0.1:5159");
    expect(loaded.documentPath).toBe("D:\\labels\\Documento2.btw");
    expect(loaded.printer).toBe("Argox");
    expect(loaded.copies).toBe(3);
    expect(loaded.fieldMap.Nome).toBe("name");
    expect(loaded.fieldMap.SKU).toBe("sku");
  });
});

describe("validateBartenderDocumentPath", () => {
  it("rejects folder paths without .btw", () => {
    expect(
      validateBartenderDocumentPath("C:\\Users\\AlmaW\\Desktop\\bartender")
    ).toMatch(/\.btw/i);
  });

  it("accepts full .btw path", () => {
    expect(
      validateBartenderDocumentPath(
        "C:\\Users\\AlmaW\\Desktop\\bartender\\Documento2.btw"
      )
    ).toBeNull();
  });
});

describe("printProductLabels", () => {
  it("prints each selected product and collects errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => "application/json" },
        json: async () => ({ error: "fail" }),
      });

    const settings = loadBartenderSettings();
    const result = await printProductLabels(
      [
        baseProduct,
        {
          ...baseProduct,
          id: 2,
          name: "PL-10",
          category: { id: 2, name: "Pulseira" },
        },
      ],
      settings,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(result.printed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].product.id).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
