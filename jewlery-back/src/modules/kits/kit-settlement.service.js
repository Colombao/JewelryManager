import prisma from "../../database/prismaClient.js";
import { calculateBusinessPayment } from "../../utils/commission.js";

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function mapPayment(payment) {
  return {
    id: payment.id,
    settlementId: payment.settlementId,
    amount: payment.amount,
    note: payment.note,
    status: payment.status,
    reportedAt: payment.reportedAt,
    confirmedAt: payment.confirmedAt,
  };
}

function computePaymentTotals(settlement, payments = []) {
  const amountDue = roundMoney(settlement.amountDue);
  const amountConfirmed = roundMoney(
    payments
      .filter((payment) => payment.status === "confirmado")
      .reduce((sum, payment) => sum + Number(payment.amount), 0)
  );
  const amountAwaitingConfirm = roundMoney(
    payments
      .filter((payment) => payment.status === "informado")
      .reduce((sum, payment) => sum + Number(payment.amount), 0)
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

  return {
    amountDue,
    amountConfirmed,
    amountAwaitingConfirm,
    amountRemaining,
    paymentStatus,
  };
}

function mapUnitForClosure(unit) {
  const item = unit.kitItem;
  return {
    id: unit.id,
    reference: item.reference,
    description: item.description,
    category: item.category,
    unitPrice: unit.unitPrice,
    unitIndex: unit.unitIndex,
    pieceLabel:
      item.quantity > 1
        ? `Peça ${unit.unitIndex} de ${item.quantity}`
        : null,
    soldByOwner: unit.soldByOwner,
    soldByReseller: unit.soldByReseller,
    missingOrLost: unit.missingOrLost,
    outcome: unit.missingOrLost
      ? "perdida"
      : unit.soldByOwner && unit.soldByReseller
      ? "vendida"
      : "devolvida",
  };
}

function mapSettlement(settlement) {
  const payments = (settlement.payments ?? []).map(mapPayment);
  const totals = computePaymentTotals(settlement, payments);

  return {
    id: settlement.id,
    kitId: settlement.kitId,
    resellerId: settlement.resellerId,
    amountDue: settlement.amountDue,
    soldValue: settlement.soldValue,
    lostValue: settlement.lostValue,
    returnedValue: settlement.returnedValue,
    soldCount: settlement.soldCount,
    lostCount: settlement.lostCount,
    returnedCount: settlement.returnedCount,
    commissionRate: settlement.commissionRate,
    commissionAmount: settlement.commissionAmount,
    paymentStatus: totals.paymentStatus,
    amountConfirmed: totals.amountConfirmed,
    amountAwaitingConfirm: totals.amountAwaitingConfirm,
    amountRemaining: totals.amountRemaining,
    finalizedAt: settlement.finalizedAt,
    paidAt: settlement.paidAt,
    confirmedAt: settlement.confirmedAt,
    payments,
    events: (settlement.events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      note: event.note,
      actor: event.actor,
      createdAt: event.createdAt,
    })),
  };
}

async function syncSettlementStatus(tx, settlementId) {
  const settlement = await tx.kitSettlement.findUnique({
    where: { id: settlementId },
    include: {
      payments: true,
    },
  });

  if (!settlement) return null;

  const totals = computePaymentTotals(settlement, settlement.payments);
  const now = new Date();

  return tx.kitSettlement.update({
    where: { id: settlementId },
    data: {
      paymentStatus: totals.paymentStatus,
      paidAt:
        totals.amountAwaitingConfirm > 0 || totals.amountConfirmed > 0
          ? settlement.paidAt ?? now
          : settlement.paidAt,
      confirmedAt:
        totals.paymentStatus === "confirmado"
          ? settlement.confirmedAt ?? now
          : null,
    },
    include: {
      payments: {
        orderBy: { reportedAt: "asc" },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function loadKitUnits(kitId) {
  return prisma.kitItemUnit.findMany({
    where: { kitItem: { kitId } },
    include: {
      kitItem: {
        select: {
          reference: true,
          description: true,
          category: true,
          quantity: true,
        },
      },
    },
    orderBy: [
      { kitItem: { sortOrder: "asc" } },
      { kitItemId: "asc" },
      { unitIndex: "asc" },
    ],
  });
}

async function buildClosureBreakdown(kitId) {
  const units = await loadKitUnits(kitId);
  const mapped = units.map(mapUnitForClosure);

  return {
    soldUnits: mapped.filter((unit) => unit.outcome === "vendida"),
    returnedUnits: mapped.filter((unit) => unit.outcome === "devolvida"),
    lostUnits: mapped.filter((unit) => unit.outcome === "perdida"),
  };
}

async function createSettlementForKit(tx, kitId, resellerId) {
  const units = await tx.kitItemUnit.findMany({
    where: { kitItem: { kitId } },
    include: {
      kitItem: {
        select: {
          reference: true,
          description: true,
          category: true,
          quantity: true,
        },
      },
    },
  });

  const flatUnits = units.map((unit) => ({
    unitPrice: unit.unitPrice,
    soldByOwner: unit.soldByOwner,
    soldByReseller: unit.soldByReseller,
    missingOrLost: unit.missingOrLost,
  }));

  const tiers = await tx.commissionTier.findMany({
    orderBy: [{ sortOrder: "asc" }, { maxAmount: "asc" }],
  });
  const summary = calculateBusinessPayment(flatUnits, tiers);

  const settlement = await tx.kitSettlement.create({
    data: {
      kitId,
      resellerId: resellerId ?? null,
      amountDue: summary.amountDue,
      soldValue: summary.soldValue,
      lostValue: summary.lostValue,
      returnedValue: summary.pendingValue,
      soldCount: summary.confirmed,
      lostCount: summary.missing,
      returnedCount: summary.pending,
      commissionRate: summary.commissionRate,
      commissionAmount: summary.commissionAmount,
      paymentStatus: "pendente",
      events: {
        create: {
          type: "finalizado",
          actor: "empresa",
          note: `Kit finalizado. Valor a pagar: R$ ${Number(summary.amountDue).toFixed(2)}`,
        },
      },
    },
    include: {
      payments: {
        orderBy: { reportedAt: "asc" },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return settlement;
}

const settlementInclude = {
  payments: {
    orderBy: { reportedAt: "asc" },
  },
  events: {
    orderBy: { createdAt: "asc" },
  },
};

async function getSettlementByKitId(kitId) {
  const settlement = await prisma.kitSettlement.findUnique({
    where: { kitId },
    include: {
      ...settlementInclude,
      reseller: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!settlement) return null;

  const closure = await buildClosureBreakdown(kitId);

  return {
    ...mapSettlement(settlement),
    reseller: settlement.reseller,
    closure,
  };
}

async function listSettlementsForReseller(resellerId) {
  const settlements = await prisma.kitSettlement.findMany({
    where: { resellerId },
    include: {
      kit: {
        select: {
          id: true,
          kitNumber: true,
          totalQty: true,
          grandTotal: true,
          returnDate: true,
        },
      },
      ...settlementInclude,
    },
    orderBy: { finalizedAt: "desc" },
  });

  const mapped = settlements.map((entry) => ({
    ...mapSettlement(entry),
    kit: entry.kit,
  }));

  const pendingTotal = mapped.reduce(
    (sum, entry) =>
      entry.paymentStatus === "confirmado"
        ? sum
        : sum + Number(entry.amountRemaining),
    0
  );

  const awaitingConfirmTotal = mapped.reduce(
    (sum, entry) => sum + Number(entry.amountAwaitingConfirm),
    0
  );

  return {
    summary: {
      pendingTotal: roundMoney(pendingTotal),
      awaitingConfirmTotal: roundMoney(awaitingConfirmTotal),
      openCount: mapped.filter((entry) => entry.paymentStatus !== "confirmado")
        .length,
    },
    settlements: mapped,
  };
}

async function registerSettlementPayment(kitId, resellerId, amount, note) {
  const parsedAmount = roundMoney(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    const error = new Error("Informe um valor de pagamento válido");
    error.status = 400;
    throw error;
  }

  const settlement = await prisma.kitSettlement.findUnique({
    where: { kitId },
    include: {
      payments: true,
    },
  });

  if (!settlement) {
    const error = new Error("Acerto não encontrado");
    error.status = 404;
    throw error;
  }

  if (settlement.resellerId !== resellerId) {
    const error = new Error("Acesso negado a este acerto");
    error.status = 403;
    throw error;
  }

  const totals = computePaymentTotals(settlement, settlement.payments);

  if (totals.paymentStatus === "confirmado") {
    const error = new Error("Este acerto já está quitado");
    error.status = 400;
    throw error;
  }

  if (parsedAmount > totals.amountRemaining + 0.009) {
    const error = new Error(
      `Valor excede o saldo em aberto (${totals.amountRemaining.toFixed(2)})`
    );
    error.status = 400;
    throw error;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.kitSettlementPayment.create({
      data: {
        settlementId: settlement.id,
        amount: parsedAmount,
        note: note?.trim() || null,
        status: "informado",
      },
    });

    await tx.kitSettlementEvent.create({
      data: {
        settlementId: settlement.id,
        type: "pagamento_informado",
        actor: "revendedora",
        note:
          note?.trim() ||
          `Pagamento informado: R$ ${parsedAmount.toFixed(2)}`,
      },
    });

    return syncSettlementStatus(tx, settlement.id);
  });

  return mapSettlement(updated);
}

async function markSettlementPaidByReseller(kitId, resellerId, note) {
  const settlement = await prisma.kitSettlement.findUnique({
    where: { kitId },
    include: { payments: true },
  });

  if (!settlement) {
    const error = new Error("Acerto não encontrado");
    error.status = 404;
    throw error;
  }

  const totals = computePaymentTotals(settlement, settlement.payments);

  return registerSettlementPayment(
    kitId,
    resellerId,
    totals.amountRemaining,
    note?.trim() || "Pagamento integral informado pela revendedora."
  );
}

async function confirmSettlementPayment(kitId, paymentId, note) {
  const settlement = await prisma.kitSettlement.findUnique({
    where: { kitId },
    include: { payments: true },
  });

  if (!settlement) {
    const error = new Error("Acerto não encontrado");
    error.status = 404;
    throw error;
  }

  const payment = settlement.payments.find((entry) => entry.id === paymentId);

  if (!payment) {
    const error = new Error("Parcela não encontrada neste acerto");
    error.status = 404;
    throw error;
  }

  if (payment.status === "confirmado") {
    const error = new Error("Esta parcela já foi confirmada");
    error.status = 400;
    throw error;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.kitSettlementPayment.update({
      where: { id: payment.id },
      data: {
        status: "confirmado",
        confirmedAt: new Date(),
      },
    });

    await tx.kitSettlementEvent.create({
      data: {
        settlementId: settlement.id,
        type: "pagamento_confirmado",
        actor: "empresa",
        note:
          note?.trim() ||
          `Pagamento confirmado: R$ ${Number(payment.amount).toFixed(2)}`,
      },
    });

    return syncSettlementStatus(tx, settlement.id);
  });

  return mapSettlement(updated);
}

async function confirmSettlementByCompany(kitId, note) {
  const settlement = await prisma.kitSettlement.findUnique({
    where: { kitId },
    include: { payments: true },
  });

  if (!settlement) {
    const error = new Error("Acerto não encontrado");
    error.status = 404;
    throw error;
  }

  const pendingPayments = settlement.payments.filter(
    (payment) => payment.status === "informado"
  );

  if (
    pendingPayments.length === 0 &&
    settlement.paymentStatus === "pago_revendedora"
  ) {
    const updated = await prisma.kitSettlement.update({
      where: { id: settlement.id },
      data: {
        paymentStatus: "confirmado",
        confirmedAt: new Date(),
        events: {
          create: {
            type: "confirmado_empresa",
            actor: "empresa",
            note:
              note?.trim() || "Empresa confirmou recebimento do pagamento.",
          },
        },
      },
      include: settlementInclude,
    });

    return mapSettlement(updated);
  }

  if (pendingPayments.length === 0) {
    const error = new Error("Não há parcelas aguardando confirmação");
    error.status = 400;
    throw error;
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const payment of pendingPayments) {
      await tx.kitSettlementPayment.update({
        where: { id: payment.id },
        data: {
          status: "confirmado",
          confirmedAt: new Date(),
        },
      });

      await tx.kitSettlementEvent.create({
        data: {
          settlementId: settlement.id,
          type: "pagamento_confirmado",
          actor: "empresa",
          note:
            note?.trim() ||
            `Pagamento confirmado: R$ ${Number(payment.amount).toFixed(2)}`,
        },
      });
    }

    return syncSettlementStatus(tx, settlement.id);
  });

  return mapSettlement(updated);
}

export {
  confirmSettlementByCompany,
  confirmSettlementPayment,
  createSettlementForKit,
  getSettlementByKitId,
  listSettlementsForReseller,
  markSettlementPaidByReseller,
  registerSettlementPayment,
};
