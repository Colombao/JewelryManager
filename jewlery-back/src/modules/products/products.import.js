import prisma from "../../database/prismaClient.js";

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

  if (skipDuplicates) {
    const existing = await prisma.product.findMany({
      select: { reference: true, sku: true },
    });
    for (const product of existing) {
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
      const categoryName =
        item.categoryName?.trim() || item.name?.trim() || null;
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

      if (skipDuplicates) {
        const refKey = data.reference ? normalizeKey(data.reference) : null;
        const skuKey = data.sku ? normalizeKey(data.sku) : null;

        if (
          (refKey && existingRefs.has(refKey)) ||
          (skuKey && existingSkus.has(skuKey))
        ) {
          result.skipped++;
          continue;
        }
      }

      await prisma.product.create({ data });
      result.created++;

      if (data.reference) existingRefs.add(normalizeKey(data.reference));
      if (data.sku) existingSkus.add(normalizeKey(data.sku));
    } catch (err) {
      result.errors.push({
        row,
        message: err?.message || "Erro ao importar linha",
      });
    }
  }

  return result;
}

export { importProducts, normalizeKey };
