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

function parseCodeNumber(code, prefix) {
  const match = String(code ?? "")
    .trim()
    .match(new RegExp(`^${prefix}(\\d+)$`, "i"));
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

export {
  CATEGORY_RULES,
  extractCategoryName,
  getCodePrefixForCategory,
  isTrioValue,
  nextCodeForPrefix,
  normalizeCategoryName,
};
