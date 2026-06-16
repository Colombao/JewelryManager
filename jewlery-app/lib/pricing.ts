export interface ProfitMargin {
  id: number;
  level: number;
  name: string;
  multiplier: number;
}

export interface CommissionTier {
  id: number;
  label: string;
  maxAmount: number;
  rate: number;
  sortOrder: number;
}

export const DEFAULT_COMMISSION_TIERS: CommissionTier[] = [
  { id: 0, label: "Até R$ 500,00", maxAmount: 500, rate: 0.2, sortOrder: 1 },
  { id: 0, label: "Até R$ 1.000,00", maxAmount: 1000, rate: 0.3, sortOrder: 2 },
  { id: 0, label: "Até R$ 1.600,00", maxAmount: 1600, rate: 0.35, sortOrder: 3 },
  {
    id: 0,
    label: "Acima de R$ 1.600,00",
    maxAmount: 999999999,
    rate: 0.4,
    sortOrder: 4,
  },
];

export function resolveCommissionRate(
  amount: number,
  tiers: CommissionTier[] = []
): number {
  const value = Number(amount) || 0;
  const list =
    tiers.length > 0
      ? [...tiers].sort(
          (a, b) => a.maxAmount - b.maxAmount || a.sortOrder - b.sortOrder
        )
      : DEFAULT_COMMISSION_TIERS;

  for (const tier of list) {
    if (value <= tier.maxAmount) {
      return tier.rate;
    }
  }

  return list[list.length - 1]?.rate ?? 0.4;
}

export function resolveCommissionLabel(
  amount: number,
  tiers: CommissionTier[] = []
): string {
  const value = Number(amount) || 0;
  const list =
    tiers.length > 0
      ? [...tiers].sort(
          (a, b) => a.maxAmount - b.maxAmount || a.sortOrder - b.sortOrder
        )
      : DEFAULT_COMMISSION_TIERS;

  for (const tier of list) {
    if (value <= tier.maxAmount) {
      return tier.label;
    }
  }

  return list[list.length - 1]?.label ?? "Faixa padrão";
}

export function formatCommissionRate(rate: number) {
  return `${(rate * 100).toFixed(0)}%`;
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export const DEFAULT_MARGIN_MULTIPLIERS = {
  level1: 1.5,
  level2: 2.0,
  level3: 2.5,
} as const;

export function getMarginMultipliers(margins: ProfitMargin[]) {
  const byLevel = Object.fromEntries(
    margins.map((margin) => [margin.level, Number(margin.multiplier)])
  );

  return {
    level1: byLevel[1] ?? DEFAULT_MARGIN_MULTIPLIERS.level1,
    level2: byLevel[2] ?? DEFAULT_MARGIN_MULTIPLIERS.level2,
    level3: byLevel[3] ?? DEFAULT_MARGIN_MULTIPLIERS.level3,
  };
}

export function formatMultiplier(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}
