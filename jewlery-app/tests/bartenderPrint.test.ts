import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BARTENDER_SETTINGS_STORAGE_KEY,
  applySelectedBtwFileName,
  buildNamedDataSources,
  buildPrintBTWAction,
  buildPrintBTXML,
  getProductLabelType,
  listProductLabelTypes,
  loadBartenderSettings,
  printProductLabel,
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
  category: { id: 10, name: "BR-ALE Dourado 3 ml" },
};

describe("getProductLabelType", () => {
  it("infers Brinco/Pulseira from product name, not DB catalog line", () => {
    expect(getProductLabelType(baseProduct)).toBe("Brinco");
    expect(
      getProductLabelType({
        ...baseProduct,
        name: "PUL-ALE Dourado 7 ml",
        category: { id: 2, name: "PUL-ALE Dourado 7 ml" },
      })
    ).toBe("Pulseira");
  });
});

describe("listProductLabelTypes", () => {
  it("returns sorted unique jewelry types", () => {
    const types = listProductLabelTypes([
      baseProduct,
      {
        ...baseProduct,
        id: 2,
        name: "PL-10",
        category: { id: 2, name: "PUL-ALE Dourado 7 ml" },
      },
      {
        ...baseProduct,
        id: 3,
        name: "BR-02 outro",
        category: { id: 10, name: "BR-ALE Dourado 3 ml" },
      },
    ]);
    expect(types).toEqual(["Brinco", "Pulseira"]);
  });
});

describe("buildNamedDataSources / BTXML / PrintBTWAction", () => {
  it("maps product fields to named data sources", () => {
    const named = buildNamedDataSources(baseProduct);
    expect(named.Nome).toBe("BR-ALE Dourado");
    expect(named.Codigo).toBe("br01");
    expect(named.SKU).toBe("SKU-1");
    expect(named.Barcode).toBe("789");
    expect(named.Categoria).toBe("Brinco");
    expect(named.Preco).toContain("29");
  });

  it("builds BTXML with NamedSubString for the selected product", () => {
    const settings = loadBartenderSettings();
    settings.documentPath =
      "C:\\Users\\AlmaW\\Desktop\\bartender\\Documento2.btw";
    const xml = buildPrintBTXML(baseProduct, settings, 2);
    expect(xml).toContain("NamedSubString Name=\"Codigo\"");
    expect(xml).toContain("<Value>br01</Value>");
    expect(xml).toContain("<Value>BR-ALE Dourado</Value>");
    expect(xml).toContain("IdenticalCopiesOfLabel>2<");
    expect(xml).toContain(
      "C:\\Users\\AlmaW\\Desktop\\bartender\\Documento2.btw"
    );
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
    expect(payload.PrintBTWAction.Copies).toBe("2");
    expect(
      (payload.PrintBTWAction.NamedDataSources as Record<string, string>).Nome
    ).toBe("BR-ALE Dourado");
  });
});

describe("file path helpers", () => {
  it("applies selected .btw filename onto folder", () => {
    const next = applySelectedBtwFileName(
      {
        documentPath: "C:\\Users\\AlmaW\\Desktop\\bartender\\old.btw",
        documentFolder: "C:\\Users\\AlmaW\\Desktop\\bartender",
      },
      "Documento2.btw"
    );
    expect(next.documentPath).toBe(
      "C:\\Users\\AlmaW\\Desktop\\bartender\\Documento2.btw"
    );
  });

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

describe("settings persistence", () => {
  afterEach(() => {
    window.localStorage.removeItem(BARTENDER_SETTINGS_STORAGE_KEY);
  });

  it("saves and loads settings from localStorage", () => {
    saveBartenderSettings({
      apiUrl: "http://127.0.0.1:5159",
      documentPath: "D:\\labels\\Documento2.btw",
      documentFolder: "D:\\labels",
      printer: "Argox",
      copies: 3,
      fieldMap: { Nome: "name" },
    });

    const loaded = loadBartenderSettings();
    expect(loaded.apiUrl).toBe("http://127.0.0.1:5159");
    expect(loaded.documentPath).toBe("D:\\labels\\Documento2.btw");
    expect(loaded.documentFolder).toBe("D:\\labels");
    expect(loaded.printer).toBe("Argox");
    expect(loaded.copies).toBe(3);
    expect(loaded.fieldMap.Nome).toBe("name");
    expect(loaded.fieldMap.SKU).toBe("sku");
  });
});

describe("printProductLabel Faulted handling", () => {
  it("treats Status Faulted as an error even when HTTP 200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        Status: "Faulted",
        Messages: [
          "[Error] O documento do BarTender não existe ou não pode ser acessado.",
        ],
      }),
    });

    // First call (BTXML) faults; fallback JSON also faults
    fetchImpl.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        Status: "Faulted",
        Messages: [
          "[Error] O documento do BarTender não existe ou não pode ser acessado.",
        ],
      }),
    });

    const settings = loadBartenderSettings();
    await expect(
      printProductLabel(baseProduct, settings, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(/não imprimiu|não existe/i);
  });
});

describe("printProductLabels", () => {
  it("prints each selected product and collects errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ Status: "RanToCompletion" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({
          Status: "Faulted",
          Messages: ["[Error] fail"],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({
          Status: "Faulted",
          Messages: ["[Error] fail"],
        }),
      });

    const settings = loadBartenderSettings();
    const result = await printProductLabels(
      [
        baseProduct,
        {
          ...baseProduct,
          id: 2,
          name: "PL-10",
          code: "pl01",
          category: { id: 2, name: "PUL-ALE Dourado 7 ml" },
        },
      ],
      settings,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(result.printed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].product.id).toBe(2);
  });
});
