import prisma from "../../database/prismaClient.js";

function toNum(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getSalePrice(product) {
  return (
    toNum(product.adjustedPrice) ||
    toNum(product.priceLevel1) ||
    toNum(product.priceLevel2) ||
    toNum(product.priceLevel3)
  );
}

function sumKitField(kits, field) {
  return kits.reduce((acc, kit) => acc + toNum(kit[field]), 0);
}

function sumKitQty(kits) {
  return kits.reduce((acc, kit) => acc + (kit.totalQty ?? 0), 0);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function computeSettlementTotals(settlement) {
  const amountDue = roundMoney(settlement.amountDue);
  const payments = settlement.payments ?? [];
  const amountConfirmed = roundMoney(
    payments
      .filter((payment) => payment.status === "confirmado")
      .reduce((sum, payment) => sum + toNum(payment.amount), 0)
  );
  const amountAwaitingConfirm = roundMoney(
    payments
      .filter((payment) => payment.status === "informado")
      .reduce((sum, payment) => sum + toNum(payment.amount), 0)
  );
  const amountRemaining = roundMoney(
    Math.max(0, amountDue - amountConfirmed - amountAwaitingConfirm)
  );

  let paymentStatus = "pendente";
  if (amountConfirmed >= amountDue - 0.009) {
    paymentStatus = "confirmado";
  } else if (amountAwaitingConfirm > 0) {
    paymentStatus = "aguardando_confirmacao";
  } else if (amountConfirmed > 0) {
    paymentStatus = "parcial";
  }

  return { amountRemaining, paymentStatus };
}

export async function getDashboardStats() {
  const [products, kits, settlements] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        code: true,
        reference: true,
        name: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
        adjustedPrice: true,
        priceLevel1: true,
        priceLevel2: true,
        priceLevel3: true,
      },
      orderBy: { quantity: "asc" },
    }),
    prisma.kit.findMany({
      select: {
        id: true,
        kitNumber: true,
        status: true,
        issueDate: true,
        totalQty: true,
        grandTotal: true,
        finalTotal: true,
        reseller: { select: { name: true } },
        card: { select: { id: true } },
      },
      orderBy: { kitNumber: "desc" },
    }),
    prisma.kitSettlement.findMany({
      include: {
        payments: {
          select: { amount: true, status: true },
        },
      },
    }),
  ]);

  const acertosAbertos = settlements
    .map((settlement) => computeSettlementTotals(settlement))
    .filter((totals) => totals.paymentStatus !== "confirmado");

  const estoqueQuantidade = products.reduce((s, p) => s + p.quantity, 0);
  const estoqueValorCusto = products.reduce((s, p) => {
    const line =
      toNum(p.totalPrice) ||
      toNum(p.unitPrice) * p.quantity;
    return s + line;
  }, 0);
  const estoqueValorVenda = products.reduce(
    (s, p) => s + p.quantity * getSalePrice(p),
    0
  );

  const kitsMontados = kits.filter(
    (k) => k.status === "montado" && !k.card
  );
  const kitsNoFluxo = kits.filter(
    (k) => k.card && k.status !== "finalizado"
  );
  const kitsFinalizados = kits.filter((k) => k.status === "finalizado");

  const baixoEstoque = products
    .filter((p) => p.quantity <= 5)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code || p.reference || null,
      quantity: p.quantity,
    }));

  const recentKits = kits.slice(0, 8).map((k) => ({
    id: k.id,
    kitNumber: k.kitNumber,
    status: k.card ? "no_fluxo" : k.status,
    grandTotal: toNum(k.grandTotal),
    issueDate: k.issueDate,
    resellerName: k.reseller?.name ?? null,
  }));

  return {
    estoque: {
      quantidade: estoqueQuantidade,
      valorCusto: estoqueValorCusto,
      valorVenda: estoqueValorVenda,
      produtosAtivos: products.length,
      produtosSemEstoque: products.filter((p) => p.quantity === 0).length,
    },
    kitsMontados: {
      count: kitsMontados.length,
      pecas: sumKitQty(kitsMontados),
      valorTotal: sumKitField(kitsMontados, "grandTotal"),
    },
    kitsNoFluxo: {
      count: kitsNoFluxo.length,
      pecas: sumKitQty(kitsNoFluxo),
      valorTotal: sumKitField(kitsNoFluxo, "grandTotal"),
    },
    kitsFinalizados: {
      count: kitsFinalizados.length,
      pecas: sumKitQty(kitsFinalizados),
      valorTotal: sumKitField(kitsFinalizados, "grandTotal"),
    },
    acertos: {
      pendentes: acertosAbertos.length,
      valorPendente: acertosAbertos.reduce(
        (s, item) => s + item.amountRemaining,
        0
      ),
    },
    baixoEstoque,
    recentKits,
  };
}
