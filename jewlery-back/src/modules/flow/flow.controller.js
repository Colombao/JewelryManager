import prisma from "../../database/prismaClient.js";
import {
  getBusinessDetailByCardId,
  updateBusinessUnitByCardId,
} from "./flow.business.service.js";
import { ensureKitUnits } from "./flow.utils.js";

function parseSafeId(value, fieldName) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 2147483647) {
    return { error: `${fieldName} inválido` };
  }
  return { value: parsed };
}

// Para manter compatível com seu middleware atual, exigimos token presente.
function requireToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "missing token" });
  const parts = auth.split(" ");
  if (parts.length !== 2)
    return res.status(401).json({ error: "invalid token format" });
  req.token = parts[1];
  next();
}

function boardToResponse(board) {
  const steps = board.steps
    .map((s) => ({
      id: s.id,
      name: s.name,
      businessId: s.boardId,
      order: s.order,
    }))
    .sort((a, b) => a.order - b.order);

  const cards = board.cards
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      order: c.order,
      stepId: c.stepId,
      kitId: c.kitId,
      resellerId: c.resellerId,
      kit: c.kit
        ? {
            id: c.kit.id,
            kitNumber: c.kit.kitNumber,
            totalQty: c.kit.totalQty,
            grandTotal: c.kit.grandTotal,
          }
        : null,
      reseller: c.reseller
        ? {
            id: c.reseller.id,
            name: c.reseller.name,
          }
        : null,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    id: board.id,
    name: board.name,
    steps,
    cards,
  };
}

const boardInclude = {
  steps: true,
  cards: {
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
  },
};

async function getBoards(req, res) {
  try {
    const boards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
        active: true,
      },
      orderBy: { id: "desc" },
    });

    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function getBoardById(req, res) {
  try {
    const { boardId } = req.params;
    const board = await prisma.board.findUnique({
      where: { id: Number(boardId) },
      include: boardInclude,
    });

    if (!board) return res.status(404).json({ error: "board not found" });

    res.json(boardToResponse(board));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

// Compatibilidade: continua retornando o board ativo.
async function getBoard(req, res) {
  try {
    const board = await prisma.board.findFirst({
      where: { active: true },
      include: boardInclude,
    });

    if (!board) return res.status(404).json({ error: "board not found" });

    res.json(boardToResponse(board));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function createBoard(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });

    const board = await prisma.board.create({
      data: { name, active: true },
    });

    res.status(201).json({ id: board.id, name: board.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function createStep(req, res) {
  try {
    const { boardId, name, order } = req.body;
    if (!boardId || !name)
      return res.status(400).json({ error: "boardId and name required" });

    const step = await prisma.step.create({
      data: {
        boardId: Number(boardId),
        name,
        order: typeof order === "number" ? order : undefined,
      },
    });

    res.status(201).json(step);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function createCard(req, res) {
  try {
    const { stepId, title, description, order } = req.body;
    if (!stepId || !title)
      return res.status(400).json({ error: "stepId and title required" });

    const step = await prisma.step.findUnique({
      where: { id: Number(stepId) },
      select: { boardId: true },
    });

    if (!step) return res.status(404).json({ error: "step not found" });

    const card = await prisma.card.create({
      data: {
        stepId: Number(stepId),
        boardId: step.boardId,
        title,
        description: description ?? null,
        order: typeof order === "number" ? order : undefined,
      },
    });

    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function createBusiness(req, res) {
  try {
    const { kitId, resellerId, boardId } = req.body;

    if (!kitId || !resellerId) {
      return res
        .status(400)
        .json({ error: "kitId e resellerId são obrigatórios" });
    }

    const kit = await prisma.kit.findUnique({
      where: { id: Number(kitId) },
      include: { card: true },
    });

    if (!kit) {
      return res.status(404).json({ error: "Kit não encontrado" });
    }

    if (kit.card) {
      return res
        .status(409)
        .json({ error: "Este kit já está vinculado a um negócio" });
    }

    const reseller = await prisma.reseller.findUnique({
      where: { id: Number(resellerId) },
    });

    if (!reseller) {
      return res.status(404).json({ error: "Revendedora não encontrada" });
    }

    const board = boardId
      ? await prisma.board.findUnique({
          where: { id: Number(boardId) },
          include: { steps: true },
        })
      : await prisma.board.findFirst({
          where: { active: true },
          include: { steps: true },
        });

    if (!board) {
      return res.status(404).json({ error: "Board não encontrado" });
    }

    const firstStep = [...board.steps].sort((a, b) => a.order - b.order)[0];

    if (!firstStep) {
      return res.status(400).json({
        error: "Board sem etapas. Crie uma etapa antes de abrir um negócio.",
      });
    }

    const cardsInStep = await prisma.card.count({
      where: { stepId: firstStep.id },
    });

    const clientCity = [reseller.city, reseller.state]
      .filter(Boolean)
      .join(" - ");

    const description = `${kit.totalQty} peças · Total ${Number(kit.grandTotal).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`;

    const result = await prisma.$transaction(async (tx) => {
      await tx.kit.update({
        where: { id: kit.id },
        data: {
          status: "vinculado",
          resellerId: reseller.id,
          clientName: reseller.name,
          clientAddress: reseller.address,
          clientCity: clientCity || null,
          clientCpf: reseller.cpf,
          clientPhone: reseller.phone,
          clientEmail: reseller.email,
        },
      });

      const card = await tx.card.create({
        data: {
          stepId: firstStep.id,
          boardId: board.id,
          title: `Kit ${kit.kitNumber} — ${reseller.name}`,
          description,
          order: cardsInStep,
          kitId: kit.id,
          resellerId: reseller.id,
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

      await ensureKitUnits(tx, kit.id);

      return card;
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function getBusinessDetail(req, res) {
  try {
    const { cardId } = req.params;
    const parsed = parseSafeId(cardId, "cardId");
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const detail = await getBusinessDetailByCardId(parsed.value);
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || "internal error",
    });
  }
}

async function updateBusinessUnitStatus(req, res) {
  try {
    const { cardId, unitId } = req.params;
    const { field, value } = req.body;

    const parsedCardId = parseSafeId(cardId, "cardId");
    if (parsedCardId.error) {
      return res.status(400).json({ error: parsedCardId.error });
    }

    const parsedUnitId = parseSafeId(unitId, "unitId");
    if (parsedUnitId.error) {
      return res.status(400).json({ error: parsedUnitId.error });
    }

    if (field !== "owner" && field !== "reseller" && field !== "missing") {
      return res
        .status(400)
        .json({ error: 'field deve ser "owner", "reseller" ou "missing"' });
    }

    if (typeof value !== "boolean") {
      return res.status(400).json({ error: "value deve ser boolean" });
    }

    const result = await updateBusinessUnitByCardId(
      parsedCardId.value,
      parsedUnitId.value,
      field,
      value
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || "internal error",
    });
  }
}

async function moveCard(req, res) {
  try {
    const { cardId } = req.params;
    const { stepId, order } = req.body;

    const parsedCardId = parseSafeId(cardId, "cardId");
    if (parsedCardId.error) {
      return res.status(400).json({ error: parsedCardId.error });
    }

    const parsedStepId = parseSafeId(stepId, "stepId");
    if (parsedStepId.error) {
      return res.status(400).json({ error: parsedStepId.error });
    }

    if (typeof order !== "number" || !Number.isFinite(order) || order < 0) {
      return res.status(400).json({ error: "order inválido" });
    }

    const card = await prisma.card.findUnique({
      where: { id: parsedCardId.value },
      select: { id: true, boardId: true },
    });

    if (!card) {
      return res.status(404).json({ error: "card not found" });
    }

    const step = await prisma.step.findFirst({
      where: {
        id: parsedStepId.value,
        boardId: card.boardId,
      },
      select: { id: true },
    });

    if (!step) {
      return res.status(400).json({ error: "stepId não pertence a este board" });
    }

    const updated = await prisma.card.update({
      where: { id: parsedCardId.value },
      data: {
        stepId: parsedStepId.value,
        order: Math.min(Math.round(order), 2147483647),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    if (err.code === "P2020") {
      return res.status(400).json({ error: "stepId ou order fora do intervalo permitido" });
    }
    res.status(500).json({ error: "internal error" });
  }
}

async function reorderSteps(req, res) {
  try {
    const { boardId, steps } = req.body;

    if (!boardId || !Array.isArray(steps)) {
      return res
        .status(400)
        .json({ error: "boardId and steps array required" });
    }

    // Atualiza em loop (ok para poucos steps). Pode otimizar depois com transactions.
    for (const s of steps) {
      if (!s?.id || typeof s.order !== "number") continue;

      await prisma.step.updateMany({
        where: { id: Number(s.id), boardId: Number(boardId) },
        data: { order: s.order },
      });
    }

    const board = await prisma.board.findUnique({
      where: { id: Number(boardId) },
      include: boardInclude,
    });

    if (!board) return res.status(404).json({ error: "board not found" });

    res.json(boardToResponse(board));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function updateStep(req, res) {
  try {
    const { stepId } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).json({ error: "name required" });

    const updated = await prisma.step.update({
      where: { id: Number(stepId) },
      data: { name },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function deleteStep(req, res) {
  try {
    const { stepId } = req.params;

    // Apaga cards ligados (se existir relação com onDelete cascade isso pode ser opcional)
    await prisma.card.deleteMany({ where: { stepId: Number(stepId) } });

    await prisma.step.delete({ where: { id: Number(stepId) } });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function deleteBoard(req, res) {
  try {
    const { boardId } = req.params;
    // Apaga steps e cards ligados (se existir relação com onDelete cascade isso pode ser opcional)
    await prisma.card.deleteMany({
      where: { step: { boardId: Number(boardId) } },
    });
    await prisma.step.deleteMany({ where: { boardId: Number(boardId) } });
    await prisma.board.delete({ where: { id: Number(boardId) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

export {
  createBoard,
  createBusiness,
  createCard,
  createStep,
  deleteBoard,
  deleteStep,
  getBoard,
  getBoardById,
  getBoards,
  getBusinessDetail,
  moveCard,
  reorderSteps,
  requireToken,
  updateBusinessUnitStatus,
  updateStep,
};
