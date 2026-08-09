export interface CategoryRule {
  label: string;
  prefix: string;
  /** Match product name start (BR-, BRINCO, etc.) */
  patterns: RegExp[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  {
    label: "Brinco",
    prefix: "br",
    patterns: [/^BR(?:INCO)?(?:[-_\s]|$)/i, /\bBRINCO\b/i],
  },
  {
    label: "Pulseira",
    prefix: "pl",
    patterns: [
      /^PL(?:U(?:SEIRA)?)?(?:[-_\s]|$)/i,
      /^PUL(?:SEIRA)?(?:[-_\s]|$)/i,
      /\bPULSEIRA\b/i,
    ],
  },
  {
    label: "Conjunto",
    prefix: "cj",
    patterns: [/^CJ(?:[-_\s]|$)/i, /\bCONJUNTO\b/i, /\bMIX\b/i],
  },
  {
    label: "Anel",
    prefix: "an",
    patterns: [
      /^AN(?:EL|EIS|ÉIS)?(?:[-_\s]|$)/i,
      /\bANEL(?:S|IS)?\b/i,
      /\bANÉIS\b/i,
    ],
  },
  {
    label: "Colar",
    prefix: "co",
    patterns: [
      /^COL(?:AR)?(?:[-_\s]|$)/i,
      /^CORR(?:ENTE)?(?:[-_\s]|$)/i,
      /\bCOLAR\b/i,
      /\bCORRENTE\b/i,
    ],
  },
  {
    label: "Pingente",
    prefix: "pi",
    patterns: [/^PING(?:ENTE)?(?:[-_\s]|$)/i, /\bPINGENTE\b/i],
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

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Category = first meaningful type name only (e.g. "Brinco", not "Brinco de ouro"). */
export function extractCategoryName(productName: string): string {
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

export function getCodePrefixForCategory(categoryName: string): string | null {
  const key = categoryName
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

export function isTrioObservation(obs: string | undefined | null): boolean {
  if (!obs) return false;
  return /\btrio\b/i.test(obs.trim());
}

function parseCodeNumber(code: string, prefix: string): number | null {
  const match = code
    .trim()
    .match(new RegExp(`^${prefix}(\\d+)$`, "i"));
  if (!match) return null;
  return Number(match[1]);
}

export function nextCodeForPrefix(
  prefix: string,
  existingCodes: Iterable<string | null | undefined>
): string {
  let max = 0;
  for (const code of existingCodes) {
    if (!code) continue;
    const n = parseCodeNumber(code, prefix);
    if (n !== null && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export function assignSequentialCodes<
  T extends { name: string; categoryName?: string; code?: string }
>(
  items: T[],
  existingCodes: Iterable<string | null | undefined> = []
): T[] {
  const used = new Set(
    [...existingCodes]
      .filter((code): code is string => Boolean(code?.trim()))
      .map((code) => code.trim().toLowerCase())
  );

  return items.map((item) => {
    if (item.code?.trim()) {
      used.add(item.code.trim().toLowerCase());
      return item;
    }

    const category = item.categoryName || extractCategoryName(item.name);
    const prefix = getCodePrefixForCategory(category);
    if (!prefix) return { ...item, categoryName: category };

    const code = nextCodeForPrefix(prefix, used);
    used.add(code.toLowerCase());
    return { ...item, code, categoryName: category };
  });
}
