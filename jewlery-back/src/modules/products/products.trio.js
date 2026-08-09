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

async function findByCodeInsensitive(code) {
  if (!code) return null;
  const exact = await prisma.product.findFirst({ where: { code } });
  if (exact) return exact;

  const all = await prisma.product.findMany({
    where: { code: { not: null } },
    select: { id: true, code: true },
  });
  const match = all.find(
    (item) => item.code?.trim().toLowerCase() === code.toLowerCase()
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
    if (conflict && conflict.id !== product.id) {
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
 * Garante produtos base + P/M/G a partir de um produto marcado como trio.
 * Se o código base estiver duplicado em outro produto, gera um código novo (brXX).
 */
async function ensureTrioVariants(productId, { trioSizePrices } = {}) {
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
  const baseName = stripSizeLabel(product.name);
  const baseDescription = product.description
    ? stripSizeLabel(product.description)
    : null;

  if (!isTrioSizeCode(product.code)) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        code: codes[0],
        name: baseName,
        description: baseDescription,
        barcode: product.barcode?.trim() ? product.barcode : codes[0],
        isTrio: true,
      },
    });
  } else {
    await prisma.product.update({
      where: { id: product.id },
      data: { isTrio: true },
    });
  }

  const sizeKeys = [null, "p", "m", "g"];

  for (let index = 0; index < codes.length; index++) {
    const code = codes[index];
    const suffix = TRIO_SIZE_SUFFIXES[index];
    const sizeKey = sizeKeys[index];
    const sizePrices =
      sizeKey && trioSizePrices ? trioSizePrices[sizeKey] : undefined;

    const existing = await findByCodeInsensitive(code);
    if (existing) {
      if (!existing.isTrio) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { isTrio: true },
        });
      }
      continue;
    }

    if (index === 0) continue;

    await prisma.product.create({
      data: {
        code,
        sku: withSizeSuffix(product.sku, suffix),
        reference: withSizeSuffix(product.reference, suffix),
        barcode: code,
        name: withSizeName(baseName, suffix),
        description: baseDescription
          ? withSizeName(baseDescription, suffix)
          : null,
        image: product.image,
        supplierId: product.supplierId,
        categoryId: product.categoryId,
        platingTypeId: product.platingTypeId,
        collectionId: product.collectionId,
        quantity: product.quantity ?? 0,
        weight: product.weight,
        unitPrice: sizePrices?.unitPrice ?? product.unitPrice,
        totalPrice: sizePrices?.totalPrice ?? product.totalPrice,
        platingTotal: product.platingTotal,
        piecesTotal: product.piecesTotal,
        grandTotal: sizePrices?.grandTotal ?? product.grandTotal,
        priceLevel1: sizePrices?.priceLevel1 ?? product.priceLevel1,
        priceLevel2: sizePrices?.priceLevel2 ?? product.priceLevel2,
        priceLevel3: sizePrices?.priceLevel3 ?? product.priceLevel3,
        adjustedPrice: sizePrices?.adjustedPrice ?? product.adjustedPrice,
        isTrio: true,
        active: product.active ?? true,
      },
    });
  }

  const products = [];
  for (const code of codes) {
    const row = await findByCodeInsensitive(code);
    if (row) {
      const full = await prisma.product.findUnique({
        where: { id: row.id },
        include: productInclude,
      });
      if (full) products.push(full);
    }
  }

  return {
    baseCode,
    codes,
    products,
  };
}

export { ensureTrioVariants };
