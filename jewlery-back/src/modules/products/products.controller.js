import prisma from "../../database/prismaClient.js";
import {
  expandTrioItem,
  getCodePrefixForCategory,
  nextCodeForPrefix,
  normalizeCategoryName,
} from "./products.category.js";
import { importProducts as runProductImport } from "./products.import.js";
import { ensureTrioVariants } from "./products.trio.js";

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

function buildCreateData(body, overrides = {}) {
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
    isTrio,
    active,
  } = { ...body, ...overrides };

  return {
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

    quantity: typeof quantity === "number" ? quantity : Number(quantity ?? 0),
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

    isTrio: Boolean(isTrio),
    active: active ?? true,
  };
}

async function create(req, res) {
  try {
    const { name, isTrio, code, trioSizePrices, categoryId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "name required" });
    }

    let resolvedCode = code?.trim?.() || code || null;

    if (Boolean(isTrio) && !resolvedCode) {
      let categoryName = null;
      if (categoryId) {
        const category = await prisma.productCategory.findUnique({
          where: { id: Number(categoryId) },
          select: { name: true },
        });
        categoryName = category?.name ?? null;
      }
      categoryName = normalizeCategoryName(categoryName, name);
      const prefix = getCodePrefixForCategory(categoryName);
      if (prefix) {
        const existing = await prisma.product.findMany({
          select: { code: true },
        });
        resolvedCode = nextCodeForPrefix(
          prefix,
          existing.map((item) => item.code)
        );
      }
    }

    const variants = expandTrioItem({
      ...req.body,
      name: name.trim(),
      code: resolvedCode,
      isTrio: Boolean(isTrio),
      trioSizePrices,
    });

    const include = {
      supplier: true,
      category: true,
      platingType: true,
      collection: true,
    };

    const createdList = [];
    for (const variant of variants) {
      const created = await prisma.product.create({
        data: buildCreateData(req.body, variant),
        include,
      });
      createdList.push(created);
    }

    if (createdList.length === 1) {
      return res.status(201).json(createdList[0]);
    }

    res.status(201).json({
      ...createdList[0],
      trioVariants: createdList,
      codes: createdList.map((item) => item.code).filter(Boolean),
    });
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
      isTrio,
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

      isTrio: isTrio !== undefined ? Boolean(isTrio) : undefined,
      active: active !== undefined ? active : undefined,
    };

    let updated = await prisma.product.update({
      where: { id: Number(id) },
      data,
      include: {
        supplier: true,
        category: true,
        platingType: true,
        collection: true,
      },
    });

    if (Boolean(isTrio) || updated.isTrio) {
      const trio = await ensureTrioVariants(updated.id, {
        trioSizePrices: req.body.trioSizePrices,
      });
      updated = {
        ...trio.products.find((item) => item.id === updated.id) || updated,
        trioVariants: trio.products,
        codes: trio.codes,
      };
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "internal error" });
  }
}

async function expandTrio(req, res) {
  try {
    const { id } = req.params;
    const trio = await ensureTrioVariants(id, {
      trioSizePrices: req.body?.trioSizePrices,
    });
    res.json({
      ...(trio.products[0] || {}),
      trioVariants: trio.products,
      codes: trio.codes,
      baseCode: trio.baseCode,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "internal error" });
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

async function kitsUsage(req, res) {
  try {
    const kitItems = await prisma.kitItem.findMany({
      where: { productId: { not: null } },
      select: {
        productId: true,
        quantity: true,
        kit: {
          select: {
            id: true,
            kitNumber: true,
            status: true,
            reseller: { select: { id: true, name: true } },
            card: { select: { id: true, title: true } },
          },
        },
      },
    });

    const map = {};

    for (const item of kitItems) {
      const productId = item.productId;
      if (!productId) continue;

      if (!map[productId]) map[productId] = [];

      const existing = map[productId].find((entry) => entry.id === item.kit.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map[productId].push({
          id: item.kit.id,
          kitNumber: item.kit.kitNumber,
          status: item.kit.status,
          resellerName: item.kit.reseller?.name ?? null,
          card: item.kit.card,
          quantity: item.quantity,
        });
      }
    }

    for (const productId of Object.keys(map)) {
      map[productId].sort((a, b) => b.kitNumber - a.kitNumber);
    }

    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

export { create, expandTrio, importBulk, kitsUsage, list, remove, update };
