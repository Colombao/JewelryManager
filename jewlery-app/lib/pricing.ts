export interface ProfitMargin {
  id: number;
  level: number;
  name: string;
  multiplier: number;
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
