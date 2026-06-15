import prisma from "../../database/prismaClient.js";
import { importProducts as runProductImport } from "./products.import.js";

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toDecimalOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  // Prisma (mysql) Decimal accepts string/number depending on client config.
  return value;
}

async function list(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: {
        active: req.query.active ? req.query.active === "true" : undefined,
      },
      orderBy: { id: "desc" },
      include: {
        supplier: true,
        category: true,
        platingType: true,
        collection: true,
      },
    });

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function create(req, res) {
  try {
    const {
      code,
      sku,
      reference,
      barcode,
      name,
      description,
      image,
      supplierId,
      categoryId,
      platingTypeId,
      collectionId,
      quantity,
      weight,
      unitPrice,
      totalPrice,
      platingTotal,
      piecesTotal,
      grandTotal,
      priceLevel1,
      priceLevel2,
      priceLevel3,
      adjustedPrice,
      active,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "name required" });
    }

    const created = await prisma.product.create({
      data: {
        code: code ?? null,
        sku: sku ?? null,
        reference: reference ?? null,
        barcode: barcode ?? null,

        name: name.trim(),
        description: description ?? null,
        image: image ?? null,

        supplierId: toNumberOrNull(supplierId),
        categoryId: toNumberOrNull(categoryId),
        platingTypeId: toNumberOrNull(platingTypeId),
        collectionId: toNumberOrNull(collectionId),

        quantity:
          typeof quantity === "number" ? quantity : Number(quantity ?? 0),
        weight: toDecimalOrNull(weight),
        unitPrice: toDecimalOrNull(unitPrice),
        totalPrice: toDecimalOrNull(totalPrice),
        platingTotal: toDecimalOrNull(platingTotal),
        piecesTotal: toDecimalOrNull(piecesTotal),
        grandTotal: toDecimalOrNull(grandTotal),

        priceLevel1: toDecimalOrNull(priceLevel1),
        priceLevel2: toDecimalOrNull(priceLevel2),
        priceLevel3: toDecimalOrNull(priceLevel3),
        adjustedPrice: toDecimalOrNull(adjustedPrice),

        active: active ?? true,
      },
      include: {
        supplier: true,
        category: true,
        platingType: true,
        collection: true,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const {
      code,
      sku,
      reference,
      barcode,
      name,
      description,
      image,
      supplierId,
      categoryId,
      platingTypeId,
      collectionId,
      quantity,
      weight,
      unitPrice,
      totalPrice,
      platingTotal,
      piecesTotal,
      grandTotal,
      priceLevel1,
      priceLevel2,
      priceLevel3,
      adjustedPrice,
      active,
    } = req.body;

    const data = {
      code: code ?? undefined,
      sku: sku ?? undefined,
      reference: reference ?? undefined,
      barcode: barcode ?? undefined,

      name: name?.trim() ?? undefined,
      description: description ?? undefined,
      image: image ?? undefined,

      supplierId:
        supplierId !== undefined ? toNumberOrNull(supplierId) : undefined,
      categoryId:
        categoryId !== undefined ? toNumberOrNull(categoryId) : undefined,
      platingTypeId:
        platingTypeId !== undefined ? toNumberOrNull(platingTypeId) : undefined,
      collectionId:
        collectionId !== undefined ? toNumberOrNull(collectionId) : undefined,

      quantity:
        quantity !== undefined
          ? typeof quantity === "number"
            ? quantity
            : Number(quantity)
          : undefined,

      weight: weight !== undefined ? toDecimalOrNull(weight) : undefined,
      unitPrice:
        unitPrice !== undefined ? toDecimalOrNull(unitPrice) : undefined,
      totalPrice:
        totalPrice !== undefined ? toDecimalOrNull(totalPrice) : undefined,
      platingTotal:
        platingTotal !== undefined ? toDecimalOrNull(platingTotal) : undefined,
      piecesTotal:
        piecesTotal !== undefined ? toDecimalOrNull(piecesTotal) : undefined,
      grandTotal:
        grandTotal !== undefined ? toDecimalOrNull(grandTotal) : undefined,

      priceLevel1:
        priceLevel1 !== undefined ? toDecimalOrNull(priceLevel1) : undefined,
      priceLevel2:
        priceLevel2 !== undefined ? toDecimalOrNull(priceLevel2) : undefined,
      priceLevel3:
        priceLevel3 !== undefined ? toDecimalOrNull(priceLevel3) : undefined,
      adjustedPrice:
        adjustedPrice !== undefined
          ? toDecimalOrNull(adjustedPrice)
          : undefined,

      active: active !== undefined ? active : undefined,
    };

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data,
      include: {
        supplier: true,
        category: true,
        platingType: true,
        collection: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function importBulk(req, res) {
  try {
    const { items, skipDuplicates } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array required" });
    }

    if (items.length > 100) {
      return res.status(400).json({ error: "maximum 100 items per batch" });
    }

    const result = await runProductImport(items, {
      skipDuplicates: skipDuplicates !== false,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

export { create, importBulk, list, remove, update };
