import prisma from "../../database/prismaClient.js";
import { calculateBusinessPayment } from "../../utils/commission.js";
import { createSettlementForKit } from "../kits/kit-settlement.service.js";
import {
  ensureKitUnits,
  flattenKitUnits,
  restorePendingUnitsToStock,
} from "./flow.utils.js";

function mapUnitRow(row) {
  return {
    id: row.id,
    kitItemId: row.kitItemId,
    unitIndex: row.unitIndex,
    pieceLabel:
      row.kitItem.quantity > 1
        ? `Peça ${row.unitIndex} de ${row.kitItem.quantity}`
        : null,
    reference: row.kitItem.reference,
    description: row.kitItem.description,
    category: row.kitItem.category,
    unitPrice: row.unitPrice,
    soldByOwner: row.soldByOwner,
    soldByReseller: row.soldByReseller,
    missingOrLost: row.missingOrLost,
    product: row.kitItem.product ?? null,
  };
}

async function loadFlatUnits(kitId) {
  const allUnits = await prisma.kitItemUnit.findMany({
    where: { kitItem: { kitId } },
    include: {
      kitItem: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: [
      { kitItem: { sortOrder: "asc" } },
      { kitItemId: "asc" },
      { unitIndex: "asc" },
    ],
  });

  return allUnits.map(mapUnitRow);
}

async function buildBusinessPayload(card, refreshedKit) {
  const units = flattenKitUnits(refreshedKit?.items ?? []);
  const tiers = await prisma.commissionTier.findMany({
    orderBy: [{ sortOrder: "asc" }, { maxAmount: "asc" }],
  });
  const summary = calculateBusinessPayment(units, tiers);

  return {
    id: card.id,
    title: card.title,
    description: card.description,
    stepId: card.stepId,
    kitId: card.kitId,
    resellerId: card.resellerId,
    kit: {
      id: refreshedKit.id,
      kitNumber: refreshedKit.kitNumber,
      issueDate: refreshedKit.issueDate,
      returnDate: refreshedKit.returnDate,
      totalQty: refreshedKit.totalQty,
      grandTotal: refreshedKit.grandTotal,
      finalTotal: refreshedKit.finalTotal,
      status: refreshedKit.status,
    },
    units,
    summary,
    reseller: card.reseller,
  };
}

async function getBusinessDetailByCardId(cardId, { resellerId } = {}) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      kit: true,
      reseller: {
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          city: true,
          state: true,
        },
      },
    },
  });

  if (!card) {
    const error = new Error("Negócio não encontrado");
    error.status = 404;
    throw error;
  }

  if (resellerId && card.resellerId !== resellerId) {
    const error = new Error("Acesso negado a este negócio");
    error.status = 403;
    throw error;
  }

  if (!card.kitId || !card.kit) {
    const error = new Error("Este card não possui kit vinculado");
    error.status = 400;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await ensureKitUnits(tx, card.kitId);
  });

  const refreshedKit = await prisma.kit.findUnique({
    where: { id: card.kitId },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              image: true,
            },
          },
          units: {
            orderBy: { unitIndex: "asc" },
          },
        },
      },
    },
  });

  return buildBusinessPayload(card, refreshedKit);
}

async function updateBusinessUnitByCardId(
  cardId,
  unitId,
  field,
  value,
  { resellerId, allowedFields = ["owner", "reseller", "missing"] } = {}
) {
  if (!allowedFields.includes(field)) {
    const error = new Error(`Campo "${field}" não permitido`);
    error.status = 403;
    throw error;
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, kitId: true, resellerId: true },
  });

  if (!card?.kitId) {
    const error = new Error("Negócio não encontrado");
    error.status = 404;
    throw error;
  }

  if (resellerId && card.resellerId !== resellerId) {
    const error = new Error("Acesso negado a este negócio");
    error.status = 403;
    throw error;
  }

  const unit = await prisma.kitItemUnit.findFirst({
    where: {
      id: unitId,
      kitItem: { kitId: card.kitId },
    },
    include: {
      kitItem: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!unit) {
    const error = new Error("Peça não encontrada neste negócio");
    error.status = 404;
    throw error;
  }

  let data = {};

  if (field === "missing") {
    data = value
      ? {
          missingOrLost: true,
          soldByOwner: false,
          soldByReseller: false,
        }
      : { missingOrLost: false };
  } else if (field === "owner") {
    data = {
      soldByOwner: value,
      missingOrLost: value ? false : unit.missingOrLost,
    };
  } else {
    data = {
      soldByReseller: value,
      missingOrLost: value ? false : unit.missingOrLost,
    };
  }

  const updated = await prisma.kitItemUnit.update({
    where: { id: unit.id },
    data,
  });

  const flatUnits = await loadFlatUnits(card.kitId);
  const tiers = await prisma.commissionTier.findMany({
    orderBy: [{ sortOrder: "asc" }, { maxAmount: "asc" }],
  });
  const summary = calculateBusinessPayment(flatUnits, tiers);

  return {
    unit: {
      id: updated.id,
      kitItemId: updated.kitItemId,
      unitIndex: updated.unitIndex,
      pieceLabel:
        unit.kitItem.quantity > 1
          ? `Peça ${updated.unitIndex} de ${unit.kitItem.quantity}`
          : null,
      reference: unit.kitItem.reference,
      description: unit.kitItem.description,
      category: unit.kitItem.category,
      unitPrice: updated.unitPrice,
      soldByOwner: updated.soldByOwner,
      soldByReseller: updated.soldByReseller,
      missingOrLost: updated.missingOrLost,
      product: unit.kitItem.product ?? null,
    },
    summary,
  };
}

async function cancelBusinessByCardId(cardId) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      kit: {
        select: {
          id: true,
          kitNumber: true,
          status: true,
        },
      },
    },
  });

  if (!card?.kitId || !card.kit) {
    const error = new Error("Negócio não encontrado");
    error.status = 404;
    throw error;
  }

  if (card.kit.status === "finalizado") {
    const error = new Error("Kit já finalizado não pode ser removido do fluxo");
    error.status = 400;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.card.delete({ where: { id: card.id } });

    await tx.kit.update({
      where: { id: card.kitId },
      data: {
        status: "montado",
        resellerId: null,
        clientName: null,
        clientAddress: null,
        clientCity: null,
        clientCpf: null,
        clientPhone: null,
        clientEmail: null,
      },
    });

    await tx.kitItemUnit.updateMany({
      where: { kitItem: { kitId: card.kitId } },
      data: {
        soldByOwner: false,
        soldByReseller: false,
        missingOrLost: false,
      },
    });
  });

  return {
    message: "Negócio removido do fluxo. Kit disponível novamente.",
    kitId: card.kitId,
    kitNumber: card.kit.kitNumber,
  };
}

async function finalizeBusinessByCardId(cardId) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      kit: {
        select: {
          id: true,
          kitNumber: true,
          status: true,
          resellerId: true,
        },
      },
    },
  });

  if (!card?.kitId || !card.kit) {
    const error = new Error("Negócio não encontrado");
    error.status = 404;
    throw error;
  }

  if (card.kit.status === "finalizado") {
    const error = new Error("Este kit já foi finalizado");
    error.status = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    const { returnedUnits } = await restorePendingUnitsToStock(tx, card.kitId);

    await tx.kit.update({
      where: { id: card.kitId },
      data: { status: "finalizado" },
    });

    const settlement = await createSettlementForKit(
      tx,
      card.kitId,
      card.resellerId ?? card.kit.resellerId
    );

    await tx.card.delete({ where: { id: card.id } });

    return { returnedUnits, settlement };
  });

  return {
    message: "Kit finalizado com sucesso",
    kitId: card.kitId,
    kitNumber: card.kit.kitNumber,
    returnedUnits: result.returnedUnits,
    settlement: {
      amountDue: result.settlement.amountDue,
      paymentStatus: result.settlement.paymentStatus,
    },
  };
}

async function transferCardToBoard(cardId, { boardId, stepId }) {
  const parsedBoardId = Number(boardId);
  if (!Number.isFinite(parsedBoardId) || parsedBoardId <= 0) {
    const error = new Error("boardId inválido");
    error.status = 400;
    throw error;
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      kit: { select: { status: true } },
    },
  });

  if (!card) {
    const error = new Error("Card não encontrado");
    error.status = 404;
    throw error;
  }

  if (card.kit?.status === "finalizado") {
    const error = new Error("Kit finalizado não pode ser movido");
    error.status = 400;
    throw error;
  }

  const board = await prisma.board.findUnique({
    where: { id: parsedBoardId },
    include: { steps: true },
  });

  if (!board) {
    const error = new Error("Board não encontrado");
    error.status = 404;
    throw error;
  }

  if (board.steps.length === 0) {
    const error = new Error("Board de destino não possui etapas");
    error.status = 400;
    throw error;
  }

  let targetStepId = stepId ? Number(stepId) : null;
  if (targetStepId) {
    const stepExists = board.steps.some((step) => step.id === targetStepId);
    if (!stepExists) {
      const error = new Error("Etapa não pertence ao board de destino");
      error.status = 400;
      throw error;
    }
  } else {
    targetStepId = [...board.steps].sort((a, b) => a.order - b.order)[0].id;
  }

  const cardsInStep = await prisma.card.count({
    where: { stepId: targetStepId },
  });

  const updated = await prisma.card.update({
    where: { id: card.id },
    data: {
      boardId: board.id,
      stepId: targetStepId,
      order: cardsInStep,
    },
    include: {
      kit: {
        select: {
          id: true,
          kitNumber: true,
          totalQty: true,
          grandTotal: true,
        },
      },
      reseller: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updated;
}

async function listBusinessesForReseller(resellerId) {
  const cards = await prisma.card.findMany({
    where: {
      resellerId,
      kitId: { not: null },
    },
    include: {
      kit: {
        select: {
          id: true,
          kitNumber: true,
          totalQty: true,
          grandTotal: true,
          returnDate: true,
          status: true,
        },
      },
      step: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return cards.map((card) => ({
    id: card.id,
    title: card.title,
    description: card.description,
    stepName: card.step?.name ?? null,
    kit: card.kit,
    createdAt: card.createdAt,
  }));
}

export {
  cancelBusinessByCardId,
  finalizeBusinessByCardId,
  getBusinessDetailByCardId,
  listBusinessesForReseller,
  transferCardToBoard,
  updateBusinessUnitByCardId,
};
