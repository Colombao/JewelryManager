import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BARTENDER_SETTINGS_STORAGE_KEY,
  applySelectedBtwFileName,
  buildBatchPrintBTXML,
  buildNamedDataSources,
  buildNamedSubstringBatchBTXML,
  buildRecordRange,
  buildRecordSetCsv,
  describePrintRows,
  getProductLabelType,
  listProductLabelTypes,
  loadBartenderSettings,
  printProductLabels,
  saveBartenderSettings,
  validateBartenderDocumentPath,
  type LabelProduct,
} from "@/lib/bartenderPrint";

const br13: LabelProduct = {
  id: 567,
  code: "BR13",
  sku: "GF9245",
  name: "BR-ALE Dourado 3 ml",
  priceLevel1: "29.90",
  category: { id: 10, name: "BR-ALE Dourado 3 ml" },
};

const br14: LabelProduct = {
  id: 569,
  code: "BR14",
  sku: "GFCJ108",
  name: "BR-ALE Dourado 3 ml",
  priceLevel1: "29.90",
  category: { id: 10, name: "BR-ALE Dourado 3 ml" },
};

const br15: LabelProduct = {
  id: 570,
  code: "BR15",
  sku: "X",
  name: "BR-ALE Dourado 3 ml",
  priceLevel1: "19.90",
  category: { id: 10, name: "BR-ALE Dourado 3 ml" },
};

describe("getProductLabelType", () => {
  it("infers Brinco from product name", () => {
    expect(getProductLabelType(br13)).toBe("Brinco");
  });
});

describe("listProductLabelTypes", () => {
  it("groups as Brinco not catalog line name", () => {
    expect(listProductLabelTypes([br13, br14])).toEqual(["Brinco"]);
  });
});

describe("batch payload", () => {
  it("builds one RecordSet CSV with English field names (code, price)", () => {
    const csv = buildRecordSetCsv([br13, br14, br15]);
    expect(csv).toContain("code");
    expect(csv).toContain("price");
    expect(csv).not.toContain("Codigo");
    expect(csv).not.toContain("Preco");
    expect(csv).toContain("BR13");
    expect(csv).toContain("BR14");
    expect(csv).toContain("BR15");
    expect(csv).not.toContain("BR01");
  });

  it("describes 2-up rows as BR13|BR14 then BR15", () => {
    expect(describePrintRows([br13, br14, br15], 2)).toEqual([
      "Linha 1: BR13 | BR14",
      "Linha 2: BR15 | —",
    ]);
  });

  it("builds a single BTXML Print with all products in TextData", () => {
    const settings = loadBartenderSettings();
    settings.documentPath =
      "C:\\Users\\AlmaW\\Desktop\\bartender\\Documento2.btw";
    const xml = buildBatchPrintBTXML([br13, br14, br15], settings);
    expect(xml).toContain("<RecordSet");
    expect(xml).toContain("BR13");
    expect(xml).toContain("BR14");
    expect(xml).toContain("BR15");
    expect(xml.match(/<Print /g)?.length).toBe(1);
  });

  it("forces RecordRange for the selection instead of leftover manual record", () => {
    expect(buildRecordRange(1)).toBe("1");
    expect(buildRecordRange(3)).toBe("1-3");
    const settings = loadBartenderSettings();
    const xml = buildBatchPrintBTXML([br13, br14, br15], settings);
    expect(xml).toContain("<RecordRange>1-3</RecordRange>");
    expect(xml).toContain("<UseDatabase>true</UseDatabase>");
    expect(xml).toContain("<EnablePrompting>false</EnablePrompting>");
    expect(xml).not.toContain("<RecordRange>6</RecordRange>");
  });

  it("builds NamedSubString fallback with one Print per product in one script", () => {
    const settings = loadBartenderSettings();
    const xml = buildNamedSubstringBatchBTXML([br13, br14], settings);
    expect(xml.match(/<Print /g)?.length).toBe(2);
    expect(xml).toContain("<Value>BR13</Value>");
    expect(xml).toContain("<Value>BR14</Value>");
  });

  it("maps code/price field names used by the .btw", () => {
    expect(buildNamedDataSources(br13).code).toBe("BR13");
    expect(buildNamedDataSources(br14).code).toBe("BR14");
    expect(buildNamedDataSources(br13).price).toMatch(/29/);
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
});

describe("settings persistence", () => {
  afterEach(() => {
    window.localStorage.removeItem(BARTENDER_SETTINGS_STORAGE_KEY);
  });

  it("saves labelsPerRow", () => {
    saveBartenderSettings({
      ...loadBartenderSettings(),
      labelsPerRow: 2,
      documentPath: "D:\\labels\\Documento2.btw",
      documentFolder: "D:\\labels",
    });
    expect(loadBartenderSettings().labelsPerRow).toBe(2);
  });
});

describe("printProductLabels single request", () => {
  it("posts once with all selected codes and treats Faulted as error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        Status: "Faulted",
        Messages: ["[Error] fail"],
      }),
    });

    // RecordSet fails, NamedSubString fails, JSON fails → 3 attempts, still one product set
    fetchImpl
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ Status: "Faulted", Messages: ["[Error] a"] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ Status: "Faulted", Messages: ["[Error] b"] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ Status: "Faulted", Messages: ["[Error] c"] }),
      });

    const result = await printProductLabels(
      [br13, br14, br15],
      loadBartenderSettings(),
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(result.printed).toBe(0);
    expect(result.errors).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalled();
    const bodies = fetchImpl.mock.calls.map((c) => String(c[1]?.body ?? ""));
    expect(bodies.some((b) => b.includes("BR13") && b.includes("BR14"))).toBe(
      true
    );
    expect(bodies.some((b) => b.includes("BR01"))).toBe(false);
  });

  it("succeeds with a single RecordSet request for all products", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ Status: "RanToCompletion" }),
    });

    const result = await printProductLabels(
      [br13, br14, br15],
      loadBartenderSettings(),
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(result.printed).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = String(fetchImpl.mock.calls[0][1]?.body ?? "");
    expect(body).toContain("BR13");
    expect(body).toContain("BR14");
    expect(body).toContain("BR15");
  });
});
