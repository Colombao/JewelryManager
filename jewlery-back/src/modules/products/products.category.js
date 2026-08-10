import { randomUUID } from "crypto";

const CATEGORY_RULES = [
  {
    label: "Brinco",
    prefix: "br",
    patterns: [/^BR(?:INCO)?(?:[-_\s]|$)/i, /\bBRINCO\b/i],
  },
  {
    label: "Pulseira",
    prefix: "pl",
    patterns: [/^PL(?:U(?:SEIRA)?)?(?:[-_\s]|$)/i, /\bPULSEIRA\b/i],
  },
  {
    label: "Conjunto",
    prefix: "cj",
    patterns: [/^CJ(?:[-_\s]|$)/i, /\bCONJUNTO\b/i, /\bMIX\b/i],
  },
  {
    label: "Anel",
    prefix: "an",
    patterns: [/^AN(?:EL)?(?:[-_\s]|$)/i, /\bANEL\b/i],
  },
  {
    label: "Colar",
    prefix: "co",
    patterns: [/^COL(?:AR)?(?:[-_\s]|$)/i, /\bCOLAR\b/i, /\bCORRENTE\b/i],
  },
  {
    label: "Tornozeleira",
    prefix: "to",
    patterns: [/^TOR(?:NOZELEIRA)?(?:[-_\s]|$)/i, /\bTORNOZELEIRA\b/i],
  },
  {
    label: "Berloque",
    prefix: "be",
    patterns: [/^BER(?:LOQUE)?(?:[-_\s]|$)/i, /\bBERLOQUE\b/i],
  },
];

function capitalizeWord(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function extractCategoryName(productName) {
  const name = productName?.trim() || "";
  if (!name) return "Outros";

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(name))) {
      return rule.label;
    }
  }

  const firstWord = name.split(/\s+/)[0]?.replace(/[-_].*$/, "") || "";
  if (!firstWord || /^\d+$/.test(firstWord)) return "Outros";
  return capitalizeWord(firstWord);
}

function normalizeCategoryName(categoryName, productName) {
  const raw = categoryName?.trim() || productName?.trim() || "";
  if (!raw) return null;
  return extractCategoryName(raw);
}

function getCodePrefixForCategory(categoryName) {
  const key = String(categoryName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const rule = CATEGORY_RULES.find(
    (entry) =>
      entry.label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase() === key || entry.prefix === key
  );

  return rule?.prefix ?? null;
}

const TRIO_SIZE_SUFFIXES = ["", "P", "M", "G"];
const TRIO_SIZES = ["BASE", "P", "M", "G"];
const TRIO_SIZE_LABELS = {
  P: "Pequeno",
  M: "Médio",
  G: "Grande",
};

function getTrioBaseCode(code) {
  const trimmed = String(code ?? "").trim();
  const match = trimmed.match(/^(.*\d+)[pmg]$/i);
  return match ? match[1] : trimmed;
}

function isTrioSizeCode(code) {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return false;
  return /^(.*\d+)[pmg]$/i.test(trimmed);
}

function buildTrioCodes(baseCode) {
  const root = getTrioBaseCode(baseCode);
  const upperRoot = /[A-Z]/.test(root) && !/[a-z]/.test(root);
  return TRIO_SIZE_SUFFIXES.map((suffix) => {
    if (!suffix) return root;
    return `${root}${upperRoot ? suffix : suffix.toLowerCase()}`;
  });
}

function parseCodeNumber(code, prefix) {
  const match = String(code ?? "")
    .trim()
    .match(new RegExp(`^${prefix}(\\d+)[pmg]?$`, "i"));
  if (!match) return null;
  return Number(match[1]);
}

function nextCodeForPrefix(prefix, existingCodes) {
  let max = 0;
  for (const code of existingCodes) {
    if (!code) continue;
    const n = parseCodeNumber(code, prefix);
    if (n !== null && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

function isTrioValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return /^(1|true|sim|yes)$/i.test(value.trim()) || /\btrio\b/i.test(value);
  }
  return Boolean(value);
}

function withSizeName(name, suffix) {
  if (!suffix) return name;
  const label = TRIO_SIZE_LABELS[suffix];
  if (new RegExp(`\\(${label}\\)$`, "i").test(String(name).trim())) return name;
  return `${String(name).trim()} (${label})`;
}

function withSizeSuffix(value, suffix) {
  if (!value?.trim?.() || !suffix) return value ?? null;
  const base = String(value).trim().replace(/[-_]?[pmg]$/i, "");
  return `${base}-${suffix}`;
}

function expandTrioItem(item) {
  if (!isTrioValue(item?.isTrio) || !item?.code?.trim?.() || isTrioSizeCode(item.code)) {
    return [item];
  }

  const codes = buildTrioCodes(item.code);
  const trioGroupId = item.trioGroupId || randomUUID();

  return codes.map((code, index) => {
    const suffix = TRIO_SIZE_SUFFIXES[index];
    const trioSize = TRIO_SIZES[index];
    const baseSku = item.sku?.trim?.() || item.reference?.trim?.() || null;

    return {
      ...item,
      code,
      name: suffix ? withSizeName(item.name, suffix) : item.name,
      description: suffix && item.description
        ? withSizeName(item.description, suffix)
        : item.description,
      // SKU único por tamanho (evita Product_sku_key)
      sku: suffix
        ? withSizeSuffix(baseSku, suffix) || code
        : baseSku || code,
      reference: suffix
        ? withSizeSuffix(item.reference, suffix) || code
        : item.reference || code,
      barcode: suffix
        ? code
        : item.barcode?.trim?.()
          ? item.barcode
          : code,
      isTrio: true,
      trioGroupId,
      trioSize,
      trioSizePrices: undefined,
    };
  });
}

function expandTrioItems(items) {
  return items.flatMap((item) => expandTrioItem(item));
}

export {
  CATEGORY_RULES,
  buildTrioCodes,
  expandTrioItem,
  expandTrioItems,
  extractCategoryName,
  getCodePrefixForCategory,
  getTrioBaseCode,
  isTrioSizeCode,
  isTrioValue,
  nextCodeForPrefix,
  normalizeCategoryName,
};
