import prisma from "../../database/prismaClient.js";
import {
  buildTrioCodes,
  expandTrioItem,
  getCodePrefixForCategory,
  isTrioValue,
  nextCodeForPrefix,
  normalizeCategoryName,
} from "./products.category.js";

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toDecimalOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function extractPlatingType(description) {
  if (!description?.trim()) return null;
  const parts = description.trim().split(/\s+/);
  if (parts.length < 2) return null;
  return parts.slice(1).join(" ");
}

async function buildLookupCache(model) {
  const records = await model.findMany({ select: { id: true, name: true } });
  const cache = new Map();
  for (const record of records) {
    cache.set(normalizeKey(record.name), record.id);
  }
  return cache;
}

async function findOrCreateInCache(model, cache, name) {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const key = normalizeKey(trimmed);
  if (cache.has(key)) return cache.get(key);

  try {
    const created = await model.create({ data: { name: trimmed } });
    cache.set(key, created.id);
    return created.id;
  } catch {
    const existing = await model.findFirst({ where: { name: trimmed } });
    if (existing) {
      cache.set(key, existing.id);
      return existing.id;
    }
    throw new Error(`Não foi possível criar "${trimmed}"`);
  }
}

function buildProductData(item, ids) {
  const name = item.name?.trim();
  if (!name) return null;

  return {
    code: item.code?.trim() || null,
    sku: item.sku?.trim() || item.reference?.trim() || null,
    reference: item.reference?.trim() || null,
    barcode: item.barcode?.trim() || null,
    name,
    description: item.description?.trim() || name,
    image: item.image?.trim() || null,
    supplierId: ids.supplierId,
    categoryId: ids.categoryId,
    platingTypeId: ids.platingTypeId,
    collectionId: ids.collectionId,
    quantity: toInt(item.quantity, 0),
    weight: toDecimalOrNull(item.weight),
    unitPrice: toDecimalOrNull(item.unitPrice),
    totalPrice: toDecimalOrNull(item.totalPrice),
    platingTotal: toDecimalOrNull(item.platingTotal),
    piecesTotal: toDecimalOrNull(item.piecesTotal),
    grandTotal: toDecimalOrNull(item.grandTotal),
    priceLevel1: toDecimalOrNull(item.priceLevel1),
    priceLevel2: toDecimalOrNull(item.priceLevel2),
    priceLevel3: toDecimalOrNull(item.priceLevel3),
    adjustedPrice: toDecimalOrNull(item.adjustedPrice),
    isTrio: isTrioValue(item.isTrio),
    trioGroupId: item.trioGroupId?.trim?.() || item.trioGroupId || null,
    trioSize: item.trioSize?.trim?.() || item.trioSize || null,
    active: item.active ?? true,
  };
}

async function importProducts(items, { skipDuplicates = true } = {}) {
  const [supplierCache, categoryCache, platingCache, collectionCache] =
    await Promise.all([
      buildLookupCache(prisma.supplier),
      buildLookupCache(prisma.productCategory),
      buildLookupCache(prisma.platingType),
      buildLookupCache(prisma.collection),
    ]);

  const existingRefs = new Set();
  const existingSkus = new Set();
  const usedCodes = new Set();

  const existingProducts = await prisma.product.findMany({
    select: { reference: true, sku: true, code: true },
  });

  for (const product of existingProducts) {
    if (product.code) usedCodes.add(product.code.trim().toLowerCase());
    if (skipDuplicates) {
      if (product.reference) existingRefs.add(normalizeKey(product.reference));
      if (product.sku) existingSkus.add(normalizeKey(product.sku));
    }
  }

  const result = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const row = index + 1;

    try {
      const categoryName = normalizeCategoryName(
        item.categoryName,
        item.name
      );
      const platingTypeName =
        item.platingTypeName?.trim() ||
        extractPlatingType(item.name || item.description);

      const supplierId = await findOrCreateInCache(
        prisma.supplier,
        supplierCache,
        item.supplierName
      );
      const categoryId = await findOrCreateInCache(
        prisma.productCategory,
        categoryCache,
        categoryName
      );
      const platingTypeId = await findOrCreateInCache(
        prisma.platingType,
        platingCache,
        platingTypeName
      );
      const collectionId = await findOrCreateInCache(
        prisma.collection,
        collectionCache,
        item.collectionName
      );

      const data = buildProductData(item, {
        supplierId,
        categoryId,
        platingTypeId,
        collectionId,
      });

      if (!data) {
        result.skipped++;
        result.errors.push({ row, message: "Nome obrigatório" });
        continue;
      }

      if (!data.code) {
        const prefix = getCodePrefixForCategory(categoryName);
        if (prefix) {
          data.code = nextCodeForPrefix(prefix, usedCodes);
        }
      }

      const variants = expandTrioItem({
        ...item,
        ...data,
      });

      for (const variant of variants) {
        const variantData = buildProductData(variant, {
          supplierId,
          categoryId,
          platingTypeId,
          collectionId,
        });
        if (!variantData) continue;

        if (skipDuplicates) {
          const refKey = variantData.reference
            ? normalizeKey(variantData.reference)
            : null;
          const skuKey = variantData.sku
            ? normalizeKey(variantData.sku)
            : null;

          if (
            (refKey && existingRefs.has(refKey)) ||
            (skuKey && existingSkus.has(skuKey))
          ) {
            result.skipped++;
            continue;
          }
        }

        await prisma.product.create({ data: variantData });
        result.created++;

        if (variantData.code) {
          usedCodes.add(variantData.code.trim().toLowerCase());
          if (isTrioValue(variantData.isTrio)) {
            for (const code of buildTrioCodes(variantData.code)) {
              usedCodes.add(code.toLowerCase());
            }
          }
        }
        if (variantData.reference) {
          existingRefs.add(normalizeKey(variantData.reference));
        }
        if (variantData.sku) {
          existingSkus.add(normalizeKey(variantData.sku));
        }
      }
    } catch (err) {
      result.errors.push({
        row,
        message: err?.message || "Erro ao importar linha",
      });
    }
  }

  return result;
}

export { importProducts };
