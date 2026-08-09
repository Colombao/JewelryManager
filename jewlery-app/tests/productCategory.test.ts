import { describe, expect, it } from "vitest";
import {
  assignSequentialCodes,
  extractCategoryName,
  isTrioObservation,
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
    expect(extractCategoryName("PUL-ALE Dourado 7 ml")).toBe("Pulseira");
    expect(extractCategoryName("CJ Mix dourado")).toBe("Conjunto");
    expect(extractCategoryName("AN-22")).toBe("Anel");
    expect(extractCategoryName("ANÉIS-ALE Dourado 10 ml")).toBe("Anel");
    expect(extractCategoryName("CORR-ALE Dourado 7 ml")).toBe("Colar");
    expect(extractCategoryName("PING-ALE Dourado 7 ml")).toBe("Pingente");
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
});
