const DEFAULT_TIERS = [
  { label: "Até R$ 500,00", maxAmount: 500, rate: 0.2, sortOrder: 1 },
  { label: "Até R$ 1.000,00", maxAmount: 1000, rate: 0.3, sortOrder: 2 },
  { label: "Até R$ 1.600,00", maxAmount: 1600, rate: 0.35, sortOrder: 3 },
  { label: "Acima de R$ 1.600,00", maxAmount: 999999999, rate: 0.4, sortOrder: 4 },
];

export function resolveCommissionRate(amount, tiers = []) {
  const value = Number(amount) || 0;
  const list =
    tiers.length > 0
      ? [...tiers].sort(
          (a, b) => Number(a.maxAmount) - Number(b.maxAmount) || a.sortOrder - b.sortOrder
        )
      : DEFAULT_TIERS;

  for (const tier of list) {
    if (value <= Number(tier.maxAmount)) {
      return Number(tier.rate);
    }
  }

  return Number(list[list.length - 1]?.rate ?? 0.4);
}

export function resolveCommissionLabel(amount, tiers = []) {
  const value = Number(amount) || 0;
  const list =
    tiers.length > 0
      ? [...tiers].sort(
          (a, b) => Number(a.maxAmount) - Number(b.maxAmount) || a.sortOrder - b.sortOrder
        )
      : DEFAULT_TIERS;

  for (const tier of list) {
    if (value <= Number(tier.maxAmount)) {
      return tier.label;
    }
  }

  return list[list.length - 1]?.label ?? "Faixa padrão";
}

export function calculateBusinessPayment(units, tiers = []) {
  let soldValue = 0;
  let lostValue = 0;
  let pendingValue = 0;
  let ownerSold = 0;
  let resellerSold = 0;
  let confirmed = 0;
  let missing = 0;
  let pending = 0;
  let kitTotal = 0;

  for (const unit of units) {
    const price = Number(unit.unitPrice) || 0;
    kitTotal += price;

    if (unit.missingOrLost) {
      lostValue += price;
      missing += 1;
    } else if (unit.soldByOwner && unit.soldByReseller) {
      soldValue += price;
      confirmed += 1;
    } else {
      pendingValue += price;
      pending += 1;
    }

    if (unit.soldByOwner) ownerSold += 1;
    if (unit.soldByReseller) resellerSold += 1;
  }

  const commissionRate = resolveCommissionRate(soldValue, tiers);
  const commissionAmount = soldValue * commissionRate;
  const amountDue = soldValue - commissionAmount + lostValue;

  return {
    totalUnits: units.length,
    ownerSold,
    resellerSold,
    confirmed,
    missing,
    pending,
    soldValue,
    lostValue,
    pendingValue,
    kitTotal,
    commissionRate,
    commissionLabel: resolveCommissionLabel(soldValue, tiers),
    commissionAmount,
    amountDue,
    resellerEarnings: commissionAmount,
  };
}

export { DEFAULT_TIERS };
