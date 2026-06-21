import {
  DEFAULT_COMMISSION_TIERS,
  formatCommissionRate,
  formatCurrency,
  formatMultiplier,
  getMarginMultipliers,
  resolveCommissionLabel,
  resolveCommissionRate,
} from "@/lib/pricing";

describe("resolveCommissionRate", () => {
  it("applies default commission tiers", () => {
    expect(resolveCommissionRate(300)).toBe(0.2);
    expect(resolveCommissionRate(800)).toBe(0.3);
    expect(resolveCommissionRate(1500)).toBe(0.35);
    expect(resolveCommissionRate(5000)).toBe(0.4);
  });
});

describe("resolveCommissionLabel", () => {
  it("returns tier label for amount", () => {
    expect(resolveCommissionLabel(300)).toBe(DEFAULT_COMMISSION_TIERS[0].label);
  });
});

describe("formatCommissionRate", () => {
  it("formats rate as percentage", () => {
    expect(formatCommissionRate(0.35)).toBe("35%");
  });
});

describe("formatCurrency", () => {
  it("formats BRL currency", () => {
    expect(formatCurrency(1500)).toContain("1.500");
  });
});

describe("getMarginMultipliers", () => {
  it("uses defaults when margins are empty", () => {
    expect(getMarginMultipliers([])).toEqual({
      level1: 1.5,
      level2: 2,
      level3: 2.5,
    });
  });

  it("maps configured margin levels", () => {
    const multipliers = getMarginMultipliers([
      { id: 1, level: 1, name: "Varejo", multiplier: 1.8 },
      { id: 2, level: 2, name: "Atacado", multiplier: 2.2 },
      { id: 3, level: 3, name: "Premium", multiplier: 2.8 },
    ]);

    expect(multipliers).toEqual({
      level1: 1.8,
      level2: 2.2,
      level3: 2.8,
    });
  });
});

describe("formatMultiplier", () => {
  it("formats decimal multiplier in pt-BR", () => {
    expect(formatMultiplier(2.5)).toBe("2,5");
  });
});
