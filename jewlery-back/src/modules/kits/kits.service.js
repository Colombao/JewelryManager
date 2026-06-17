import prisma from "../../database/prismaClient.js";
import {
  buildCardDescriptionFromKit,
  ensureKitUnits,
} from "../flow/flow.utils.js";

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  return Math.max(0, Math.trunc(toNumber(value, fallback)));
}

function toDecimal(value) {
  if (value === undefined || value === null || value === "") return "0";
  return String(value);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function kitInclude() {
  return {
    reseller: {
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
      },
    },
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
      },
    },
  };
}

function prepareKitItems(items) {
  return items.map((item, index) => {
    const quantity = Math.max(1, toInt(item.quantity, 1));
    const unitPrice = toNumber(item.unitPrice, 0);

    return {
      productId: item.productId ? toInt(item.productId) : null,
      reference: String(item.reference || "").trim().toUpperCase(),
      description: String(item.description || item.reference || "Item").trim(),
      category: String(item.category || "OUTROS").trim().toUpperCase(),
      quantity,
      unitPrice: toDecimal(unitPrice),
      lineTotal: toDecimal(quantity * unitPrice),
      sortOrder: index,
    };
  });
}

function aggregateProductQuantities(items) {
  const map = new Map();

  for (const item of items) {
    if (!item.productId) continue;
    const productId = toInt(item.productId);
    if (productId <= 0) continue;
    map.set(productId, (map.get(productId) ?? 0) + Math.max(1, toInt(item.quantity, 1)));
  }

  return map;
}

async function validateStockAvailability(tx, requiredByProductId) {
  if (requiredByProductId.size === 0) return;

  const productIds = [...requiredByProductId.keys()];
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      quantity: true,
      code: true,
      reference: true,
      name: true,
    },
  });

  const byId = new Map(products.map((product) => [product.id, product]));
  const errors = [];

  for (const [productId, needed] of requiredByProductId) {
    const product = byId.get(productId);
    if (!product) {
      errors.push(`Produto #${productId} não encontrado`);
      continue;
    }

    if (product.quantity < needed) {
      const ref = product.code || product.reference || product.name;
      errors.push(
        `${ref}: solicitado ${needed}, disponível ${product.quantity}`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Estoque insuficiente: ${errors.join("; ")}`);
  }
}

async function applyStockDeduction(tx, requiredByProductId) {
  for (const [productId, qty] of requiredByProductId) {
    await tx.product.update({
      where: { id: productId },
      data: { quantity: { decrement: qty } },
    });
  }
}

async function restoreStockFromItems(tx, items) {
  const requiredByProductId = aggregateProductQuantities(items);
  for (const [productId, qty] of requiredByProductId) {
    await tx.product.update({
      where: { id: productId },
      data: { quantity: { increment: qty } },
    });
  }
}

function buildKitData(payload) {
  const {
    nature,
    issueDate,
    returnDate,
    paymentTerms,
    paymentType,
    observations,
    extras = {},
    totals = {},
  } = payload;

  return {
    nature: nature?.trim() || "Venda",
    issueDate: parseDate(issueDate),
    returnDate: parseDate(returnDate),
    paymentTerms: paymentTerms?.trim() || null,
    paymentType: paymentType || "avista",
    observations: observations?.trim() || null,
    extrasShowcase: toDecimal(extras.showcase ?? 0),
    extrasRingHolder: toDecimal(extras.ringHolder ?? 0),
    extrasBoxes: toInt(extras.boxes ?? 0),
    totalQty: toInt(totals.totalQty ?? 0),
    productsSubtotal: toDecimal(totals.productsSubtotal ?? 0),
    extrasTotal: toDecimal(totals.extrasTotal ?? 0),
    grandTotal: toDecimal(totals.grandTotal ?? 0),
    commissionRate: toDecimal(totals.commissionRate ?? 0),
    commissionValue: toDecimal(totals.commissionValue ?? 0),
    paymentDiscount: toDecimal(totals.paymentDiscount ?? 0),
    discountValue: toDecimal(totals.discountValue ?? 0),
    finalTotal: toDecimal(totals.finalTotal ?? 0),
  };
}

export const kitsService = {
  async getNextNumber() {
    const last = await prisma.kit.findFirst({
      orderBy: { kitNumber: "desc" },
      select: { kitNumber: true },
    });

    return (last?.kitNumber ?? 0) + 1;
  },

  async getAll() {
    return prisma.kit.findMany({
      orderBy: { kitNumber: "desc" },
      include: {
        reseller: {
          select: { id: true, name: true },
        },
        card: {
          select: { id: true, title: true },
        },
        _count: { select: { items: true } },
      },
    });
  },

  async getAvailable() {
    return prisma.kit.findMany({
      where: {
        card: null,
      },
      orderBy: { kitNumber: "desc" },
      include: {
        _count: { select: { items: true } },
      },
    });
  },

  async getById(id) {
    return prisma.kit.findUnique({
      where: { id },
      include: kitInclude(),
    });
  },

  async getByNumber(kitNumber) {
    return prisma.kit.findUnique({
      where: { kitNumber },
      include: kitInclude(),
    });
  },

  async create(payload) {
    const {
      kitNumber,
      nature,
      issueDate,
      returnDate,
      paymentTerms,
      paymentType,
      observations,
      items = [],
      extras = {},
      totals = {},
    } = payload;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Adicione pelo menos um item ao kit");
    }

    const parsedIssueDate = parseDate(issueDate);
    const parsedReturnDate = parseDate(returnDate);

    if (!parsedIssueDate || !parsedReturnDate) {
      throw new Error("Datas de emissão e devolução são obrigatórias");
    }

    const nextNumber =
      kitNumber !== undefined && kitNumber !== null
        ? toInt(kitNumber)
        : await this.getNextNumber();

    if (nextNumber <= 0) {
      throw new Error("Número do kit inválido");
    }

    const existing = await prisma.kit.findUnique({
      where: { kitNumber: nextNumber },
      select: { id: true },
    });

    if (existing) {
      throw new Error(`Kit número ${nextNumber} já existe`);
    }

    const preparedItems = prepareKitItems(items);
    const requiredStock = aggregateProductQuantities(preparedItems);
    const kitData = buildKitData(payload);

    const created = await prisma.$transaction(async (tx) => {
      await validateStockAvailability(tx, requiredStock);

      const kit = await tx.kit.create({
        data: {
          kitNumber: nextNumber,
          status: "montado",
          ...kitData,
          items: {
            create: preparedItems,
          },
        },
        include: kitInclude(),
      });

      await applyStockDeduction(tx, requiredStock);

      return kit;
    });

    return created;
  },

  async update(id, payload) {
    const {
      nature,
      issueDate,
      returnDate,
      paymentTerms,
      paymentType,
      observations,
      items = [],
      extras = {},
      totals = {},
    } = payload;

    const existing = await prisma.kit.findUnique({
      where: { id },
      include: {
        items: true,
        card: { select: { id: true } },
      },
    });
    if (!existing) {
      throw new Error("Kit não encontrado");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Adicione pelo menos um item ao kit");
    }

    const kitData = buildKitData(payload);

    if (!kitData.issueDate || !kitData.returnDate) {
      throw new Error("Datas de emissão e devolução são obrigatórias");
    }

    const preparedItems = prepareKitItems(items);
    const requiredStock = aggregateProductQuantities(preparedItems);

    return prisma.$transaction(async (tx) => {
      await restoreStockFromItems(tx, existing.items);
      await validateStockAvailability(tx, requiredStock);

      await tx.kitItem.deleteMany({ where: { kitId: id } });

      const updated = await tx.kit.update({
        where: { id },
        data: {
          nature: kitData.nature,
          issueDate: kitData.issueDate,
          returnDate: kitData.returnDate,
          paymentTerms: kitData.paymentTerms,
          paymentType: kitData.paymentType,
          observations: kitData.observations,
          extrasShowcase: kitData.extrasShowcase,
          extrasRingHolder: kitData.extrasRingHolder,
          extrasBoxes: kitData.extrasBoxes,
          totalQty: kitData.totalQty,
          productsSubtotal: kitData.productsSubtotal,
          extrasTotal: kitData.extrasTotal,
          grandTotal: kitData.grandTotal,
          commissionRate: kitData.commissionRate,
          commissionValue: kitData.commissionValue,
          paymentDiscount: kitData.paymentDiscount,
          discountValue: kitData.discountValue,
          finalTotal: kitData.finalTotal,
          items: {
            create: preparedItems,
          },
        },
        include: kitInclude(),
      });

      await applyStockDeduction(tx, requiredStock);

      if (existing.card) {
        await tx.card.update({
          where: { id: existing.card.id },
          data: {
            description: buildCardDescriptionFromKit(updated),
          },
        });
        await ensureKitUnits(tx, id);
      }

      return updated;
    });
  },

  async remove(id) {
    const existing = await prisma.kit.findUnique({
      where: { id },
      include: {
        items: true,
        card: { select: { id: true } },
      },
    });
    if (!existing) {
      throw new Error("Kit não encontrado");
    }

    if (existing.card) {
      throw new Error("Não é possível excluir kit vinculado ao fluxo");
    }

    if (existing.status !== "montado") {
      throw new Error("Somente kits montados podem ser excluídos");
    }

    await prisma.$transaction(async (tx) => {
      await restoreStockFromItems(tx, existing.items);
      await tx.kit.delete({ where: { id } });
    });

    return { message: "Kit removido com sucesso" };
  },
};
