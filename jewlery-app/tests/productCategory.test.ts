import { describe, expect, it } from "vitest";
import {
  assignSequentialCodes,
  buildTrioCodes,
  expandTrioItem,
  extractCategoryName,
  getTrioBaseCode,
  isTrioObservation,
  isTrioSizeCode,
  nextCodeForPrefix,
} from "@/app/cadastro/productCategory";

describe("extractCategoryName", () => {
  it("maps BR prefix to Brinco", () => {
    expect(extractCategoryName("BR-ALE Dourado 3 ml")).toBe("Brinco");
  });

  it("keeps only the first category word", () => {
    expect(extractCategoryName("Brinco de ouro")).toBe("Brinco");
    expect(extractCategoryName("Pulseira feminina dourada")).toBe("Pulseira");
  });

  it("maps other jewelry prefixes", () => {
    expect(extractCategoryName("PL-001 Prata")).toBe("Pulseira");
    expect(extractCategoryName("CJ Mix dourado")).toBe("Conjunto");
    expect(extractCategoryName("AN-22")).toBe("Anel");
  });
});

describe("isTrioObservation", () => {
  it("detects TRIO in obs", () => {
    expect(isTrioObservation("TRIO")).toBe(true);
    expect(isTrioObservation("trio")).toBe(true);
    expect(isTrioObservation("kit trio especial")).toBe(true);
    expect(isTrioObservation("")).toBe(false);
    expect(isTrioObservation("único")).toBe(false);
  });
});

describe("assignSequentialCodes", () => {
  it("generates br01, pl01 style codes by category", () => {
    const items = assignSequentialCodes(
      [
        { name: "BR-ALE Dourado", categoryName: "Brinco" },
        { name: "BR-OUTRO", categoryName: "Brinco" },
        { name: "PL-01", categoryName: "Pulseira" },
        { name: "CJ Mix", categoryName: "Conjunto" },
        { name: "AN-1", categoryName: "Anel" },
      ],
      ["br05"]
    );

    expect(items.map((item) => item.code)).toEqual([
      "br06",
      "br07",
      "pl01",
      "cj01",
      "an01",
    ]);
  });

  it("keeps existing codes", () => {
    const items = assignSequentialCodes(
      [{ name: "Brinco", categoryName: "Brinco", code: "br99" }],
      []
    );
    expect(items[0].code).toBe("br99");
  });
});

describe("nextCodeForPrefix", () => {
  it("pads with two digits", () => {
    expect(nextCodeForPrefix("br", [])).toBe("br01");
    expect(nextCodeForPrefix("br", ["br01", "br09"])).toBe("br10");
  });

  it("counts trio size suffixes toward the next number", () => {
    expect(nextCodeForPrefix("br", ["br10", "br10p", "br10m", "br10g"])).toBe(
      "br11"
    );
  });
});

describe("trio size codes", () => {
  it("builds base + P/M/G", () => {
    expect(buildTrioCodes("br10")).toEqual(["br10", "br10p", "br10m", "br10g"]);
    expect(buildTrioCodes("BR10")).toEqual(["BR10", "BR10P", "BR10M", "BR10G"]);
    expect(getTrioBaseCode("br10p")).toBe("br10");
    expect(isTrioSizeCode("br10p")).toBe(true);
    expect(isTrioSizeCode("br10")).toBe(false);
  });

  it("expands trio into four linked products (BASE/P/M/G)", () => {
    const items = expandTrioItem({
      name: "Brinco Argola",
      code: "br10",
      isTrio: true,
      reference: "REF1",
    });

    expect(items.map((item) => item.code)).toEqual([
      "br10",
      "br10p",
      "br10m",
      "br10g",
    ]);
    expect(items.map((item) => item.trioSize)).toEqual([
      "BASE",
      "P",
      "M",
      "G",
    ]);
    expect(new Set(items.map((item) => item.trioGroupId)).size).toBe(1);
    expect(items[0].name).toBe("Brinco Argola");
    expect(items[1].name).toBe("Brinco Argola (Pequeno)");
    expect(items[2].name).toBe("Brinco Argola (Médio)");
    expect(items[3].name).toBe("Brinco Argola (Grande)");
    expect(items[1].reference).toBe("REF1-P");
    expect(items.map((item) => item.sku)).toEqual([
      "REF1",
      "REF1-P",
      "REF1-M",
      "REF1-G",
    ]);
  });

  it("reserves P/M/G while assigning sequential codes", () => {
    const items = assignSequentialCodes(
      [
        { name: "Brinco A", categoryName: "Brinco", isTrio: true },
        { name: "Brinco B", categoryName: "Brinco" },
      ],
      []
    );

    expect(items[0].code).toBe("br01");
    expect(items[1].code).toBe("br02");
  });
});
