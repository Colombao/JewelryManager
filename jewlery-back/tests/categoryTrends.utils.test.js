import {
  getEffectiveDemand,
  getMarketplaceReference,
  getTrendStatus,
  parseCategoryMeta,
} from "../src/providers/categoryTrends.utils.js";

describe("parseCategoryMeta", () => {
  it("detects piece type and material from category name", () => {
    const brinco = parseCategoryMeta("BRINCO OURO");
    expect(brinco.tipoPeca).toBe("Brinco");
    expect(brinco.material).toBe("Dourado");
    expect(brinco.searchTerm).toContain("brinco");

    const prata = parseCategoryMeta("PULSEIRA RODIO");
    expect(prata.tipoPeca).toBe("Pulseira");
    expect(prata.material).toBe("Prata");
  });

  it("falls back to generic semi joias", () => {
    const meta = parseCategoryMeta("ACESSORIO DIVERSO");
    expect(meta.tipoPeca).toBe("Outros");
    expect(meta.searchTerm).toBe("semi joias");
  });
});

describe("getMarketplaceReference", () => {
  it("returns average growth for known piece types", () => {
    const ref = getMarketplaceReference("Brinco");
    expect(ref.demandaReferencia).toBeGreaterThan(0);
    expect(ref.termoReferencia).toBeTruthy();
  });

  it("returns zero for unknown types", () => {
    expect(getMarketplaceReference("xyz desconhecido")).toEqual({
      demandaReferencia: 0,
      termoReferencia: null,
    });
  });
});

describe("getTrendStatus", () => {
  it("classifies demand levels", () => {
    expect(getTrendStatus(80)).toBe("alta");
    expect(getTrendStatus(60)).toBe("media");
    expect(getTrendStatus(30)).toBe("baixa");
    expect(getTrendStatus(10)).toBe("morta");
  });
});

describe("getEffectiveDemand", () => {
  it("prefers google trends when available", () => {
    const result = getEffectiveDemand(
      { googleDisponivel: true, value: 88 },
      { demandaReferencia: 70, termoReferencia: "brinco" }
    );
    expect(result.fonte).toBe("google");
    expect(result.score).toBe(88);
  });

  it("falls back to marketplace reference", () => {
    const result = getEffectiveDemand(
      { googleDisponivel: false, value: 0 },
      { demandaReferencia: 70, termoReferencia: "brinco" }
    );
    expect(result.fonte).toBe("mercado");
  });

  it("returns none when no data exists", () => {
    const result = getEffectiveDemand(
      { googleDisponivel: false, value: 0 },
      { demandaReferencia: 0, termoReferencia: null }
    );
    expect(result.fonte).toBe("nenhuma");
  });
});
