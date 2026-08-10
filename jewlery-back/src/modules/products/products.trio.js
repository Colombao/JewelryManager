import { randomUUID } from "crypto";
import prisma from "../../database/prismaClient.js";
import {
  buildTrioCodes,
  getCodePrefixForCategory,
  getTrioBaseCode,
  isTrioSizeCode,
  nextCodeForPrefix,
  normalizeCategoryName,
} from "./products.category.js";

const TRIO_SIZE_SUFFIXES = ["", "P", "M", "G"];
const TRIO_SIZES = ["BASE", "P", "M", "G"];
const TRIO_SIZE_LABELS = {
  P: "Pequeno",
  M: "Médio",
  G: "Grande",
};

const productInclude = {
  supplier: true,
  category: true,
  platingType: true,
  collection: true,
};

function withSizeName(name, suffix) {
  if (!suffix) return name;
  const label = TRIO_SIZE_LABELS[suffix];
  const cleaned = String(name ?? "")
    .trim()
    .replace(/\s*\((Pequeno|Médio|Medio|Grande)\)$/i, "");
  return `${cleaned} (${label})`;
}

function withSizeSuffix(value, suffix) {
  if (!value || !String(value).trim() || !suffix) return value ?? null;
  const base = String(value).trim().replace(/[-_]?[pmg]$/i, "");
  return `${base}-${suffix}`;
}

function stripSizeLabel(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s*\((Pequeno|Médio|Medio|Grande)\)$/i, "");
}

function resolveCurrentSlot(product) {
  if (product.trioSize) {
    const bySize = TRIO_SIZES.indexOf(String(product.trioSize).toUpperCase());
    if (bySize >= 0) return bySize;
  }
  if (isTrioSizeCode(product.code)) {
    const suffix = product.code.trim().slice(-1).toUpperCase();
    const bySuffix = TRIO_SIZE_SUFFIXES.indexOf(suffix);
    if (bySuffix >= 0) return bySuffix;
  }
  return 0;
}

async function findByCodeInsensitive(code) {
  if (!code) return null;
  const exact = await prisma.product.findFirst({
    where: { code },
    include: productInclude,
  });
  if (exact) return exact;

  const all = await prisma.product.findMany({
    where: { code: { not: null } },
    select: { id: true, code: true },
  });
  const match = all.find(
    (item) => item.code?.trim().toLowerCase() === String(code).toLowerCase()
  );
  if (!match) return null;
  return prisma.product.findUnique({
    where: { id: match.id },
    include: productInclude,
  });
}

async function allocateBaseCode(product) {
  let baseCode = product.code?.trim()
    ? getTrioBaseCode(product.code.trim())
    : "";

  if (baseCode && !isTrioSizeCode(product.code)) {
    const conflict = await findByCodeInsensitive(baseCode);
    if (
      conflict &&
      conflict.id !== product.id &&
      (!product.trioGroupId || conflict.trioGroupId !== product.trioGroupId)
    ) {
      baseCode = "";
    }
  }

  if (baseCode) return baseCode;

  const categoryName = normalizeCategoryName(
    product.category?.name,
    product.name
  );
  const prefix = getCodePrefixForCategory(categoryName) || "br";
  const existing = await prisma.product.findMany({ select: { code: true } });
  return nextCodeForPrefix(
    prefix,
    existing.map((item) => item.code)
  );
}

/**
 * Retorna o primeiro valor livre em `sku`/`barcode`, ou null.
 * `excludeId` pode manter o valor se já for do próprio produto.
 */
async function pickUniqueField(field, candidates, excludeId) {
  const seen = new Set();

  for (const raw of candidates) {
    const value = raw?.toString?.().trim?.() || null;
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const found = await prisma.product.findFirst({
      where: { [field]: value },
      select: { id: true },
    });

    if (!found || found.id === excludeId) return value;
  }

  return null;
}

/**
 * Cria um item novo para BASE/P/M/G e liga todos pelo trioGroupId.
 * SKU/barcode são resolvidos sem violar unique (Product_sku_key / barcode).
 */
async function ensureTrioVariants(productId) {
  const product = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: productInclude,
  });

  if (!product) {
    const error = new Error("product not found");
    error.status = 404;
    throw error;
  }

  const baseCode = await allocateBaseCode(product);
  const codes = buildTrioCodes(baseCode);
  const trioGroupId = product.trioGroupId || randomUUID();
  const baseName = stripSizeLabel(product.name);
  const baseDescription = product.description
    ? stripSizeLabel(product.description)
    : null;
  const currentSlot = resolveCurrentSlot(product);
  const sourceSku = product.sku?.trim() || product.reference?.trim() || null;
  const sourceBarcode = product.barcode?.trim() || null;

  for (let index = 0; index < codes.length; index++) {
    const code = codes[index];
    const suffix = TRIO_SIZE_SUFFIXES[index];
    const trioSize = TRIO_SIZES[index];

    let target = await findByCodeInsensitive(code);
    if (!target && index === currentSlot) {
      target = product;
    }

    const desiredSku = suffix
      ? withSizeSuffix(sourceSku, suffix)
      : sourceSku;
    const desiredBarcode = suffix ? code : sourceBarcode || code;

    const sku = await pickUniqueField(
      "sku",
      [desiredSku, code, `${code}-${trioSize}`],
      target?.id
    );
    const barcode = await pickUniqueField(
      "barcode",
      [desiredBarcode, code, `${code}-bc`],
      target?.id
    );

    // Se o SKU/barcode ainda está no produto origem e vamos gravar noutro alvo,
    // libera antes para não estourar unique no update.
    if (target && target.id !== product.id) {
      const clearData = {};
      if (sku && product.sku && product.sku === sku) clearData.sku = null;
      if (barcode && product.barcode && product.barcode === barcode) {
        clearData.barcode = null;
      }
      if (Object.keys(clearData).length > 0) {
        await prisma.product.update({
          where: { id: product.id },
          data: clearData,
        });
      }
    }

    const identity = {
      code,
      name: suffix ? withSizeName(baseName, suffix) : baseName,
      description: suffix
        ? baseDescription
          ? withSizeName(baseDescription, suffix)
          : null
        : baseDescription,
      sku,
      reference: suffix
        ? withSizeSuffix(product.reference, suffix) || code
        : product.reference || code,
      barcode,
      isTrio: true,
      trioGroupId,
      trioSize,
    };

    if (target) {
      await prisma.product.update({
        where: { id: target.id },
        data: identity,
      });
      continue;
    }

    await prisma.product.create({
      data: {
        ...identity,
        image: product.image,
        supplierId: product.supplierId,
        categoryId: product.categoryId,
        platingTypeId: product.platingTypeId,
        collectionId: product.collectionId,
        quantity: product.quantity ?? 0,
        weight: product.weight,
        unitPrice: product.unitPrice,
        totalPrice: product.totalPrice,
        platingTotal: product.platingTotal,
        piecesTotal: product.piecesTotal,
        grandTotal: product.grandTotal,
        priceLevel1: product.priceLevel1,
        priceLevel2: product.priceLevel2,
        priceLevel3: product.priceLevel3,
        adjustedPrice: product.adjustedPrice,
        active: product.active ?? true,
      },
    });
  }

  const linked = await prisma.product.findMany({
    where: { trioGroupId },
    include: productInclude,
    orderBy: [{ trioSize: "asc" }, { code: "asc" }],
  });

  return {
    baseCode,
    codes,
    trioGroupId,
    products: linked,
  };
}

export { ensureTrioVariants, TRIO_SIZES, pickUniqueField };
