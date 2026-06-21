import {
  calculateBusinessPayment,
  DEFAULT_TIERS,
  resolveCommissionLabel,
  resolveCommissionRate,
} from "../src/utils/commission.js";

describe("resolveCommissionRate", () => {
  it("uses default tiers when none provided", () => {
    expect(resolveCommissionRate(100)).toBe(0.2);
    expect(resolveCommissionRate(500)).toBe(0.2);
    expect(resolveCommissionRate(501)).toBe(0.3);
    expect(resolveCommissionRate(1000)).toBe(0.3);
    expect(resolveCommissionRate(1600)).toBe(0.35);
    expect(resolveCommissionRate(2000)).toBe(0.4);
  });

  it("handles invalid amounts as zero", () => {
    expect(resolveCommissionRate(null)).toBe(0.2);
    expect(resolveCommissionRate("abc")).toBe(0.2);
  });

  it("sorts custom tiers by maxAmount", () => {
    const tiers = [
      { label: "Alto", maxAmount: 2000, rate: 0.5, sortOrder: 2 },
      { label: "Baixo", maxAmount: 300, rate: 0.1, sortOrder: 1 },
    ];
    expect(resolveCommissionRate(200, tiers)).toBe(0.1);
    expect(resolveCommissionRate(1500, tiers)).toBe(0.5);
  });
});

describe("resolveCommissionLabel", () => {
  it("returns matching tier label", () => {
    expect(resolveCommissionLabel(400)).toBe(DEFAULT_TIERS[0].label);
    expect(resolveCommissionLabel(900)).toBe(DEFAULT_TIERS[1].label);
  });
});

describe("calculateBusinessPayment", () => {
  it("computes sold, lost and pending values", () => {
    const units = [
      {
        unitPrice: 100,
        soldByOwner: true,
        soldByReseller: true,
        missingOrLost: false,
      },
      {
        unitPrice: 50,
        soldByOwner: false,
        soldByReseller: false,
        missingOrLost: true,
      },
      {
        unitPrice: 80,
        soldByOwner: false,
        soldByReseller: false,
        missingOrLost: false,
      },
    ];

    const result = calculateBusinessPayment(units);

    expect(result.soldValue).toBe(100);
    expect(result.lostValue).toBe(50);
    expect(result.pendingValue).toBe(80);
    expect(result.confirmed).toBe(1);
    expect(result.missing).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.commissionRate).toBe(0.2);
    expect(result.commissionAmount).toBe(20);
    expect(result.amountDue).toBe(130);
    expect(result.resellerEarnings).toBe(20);
    expect(result.kitTotal).toBe(230);
  });

  it("returns zeroed summary for empty units", () => {
    const result = calculateBusinessPayment([]);
    expect(result.totalUnits).toBe(0);
    expect(result.amountDue).toBe(0);
  });
});
