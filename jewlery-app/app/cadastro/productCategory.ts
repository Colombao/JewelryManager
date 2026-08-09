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

/** Sufixos de tamanho do trio: base + P/M/G */
export const TRIO_SIZE_SUFFIXES = ["", "P", "M", "G"] as const;

export type TrioSizeSuffix = (typeof TRIO_SIZE_SUFFIXES)[number];

export const TRIO_SIZE_LABELS: Record<Exclude<TrioSizeSuffix, "">, string> = {
  P: "Pequeno",
  M: "Médio",
  G: "Grande",
};

/** Extrai o código base (ex.: br10p → br10). */
export function getTrioBaseCode(code: string): string {
  const trimmed = code.trim();
  const match = trimmed.match(/^(.*\d+)[pmg]$/i);
  return match ? match[1] : trimmed;
}

/** True se o código já é variante P/M/G (ex.: br10p). */
export function isTrioSizeCode(code: string | undefined | null): boolean {
  if (!code?.trim()) return false;
  return /^(.*\d+)[pmg]$/i.test(code.trim());
}

/** br10 → [br10, br10p, br10m, br10g] (preserva caixa do base). */
export function buildTrioCodes(baseCode: string): string[] {
  const root = getTrioBaseCode(baseCode);
  const upperRoot = /[A-Z]/.test(root) && !/[a-z]/.test(root);
  return TRIO_SIZE_SUFFIXES.map((suffix) => {
    if (!suffix) return root;
    return `${root}${upperRoot ? suffix : suffix.toLowerCase()}`;
  });
}

export function formatTrioCodePreview(baseCode: string): string {
  return buildTrioCodes(baseCode).join(", ");
}

function parseCodeNumber(code: string, prefix: string): number | null {
  const match = code
    .trim()
    .match(new RegExp(`^${prefix}(\\d+)[pmg]?$`, "i"));
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

function reserveTrioCodes(used: Set<string>, baseCode: string) {
  for (const code of buildTrioCodes(baseCode)) {
    used.add(code.toLowerCase());
  }
}

export function assignSequentialCodes<
  T extends {
    name: string;
    categoryName?: string;
    code?: string;
    isTrio?: boolean;
  }
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
      const code = item.code.trim();
      if (item.isTrio) reserveTrioCodes(used, code);
      else used.add(code.toLowerCase());
      return item;
    }

    const category = item.categoryName || extractCategoryName(item.name);
    const prefix = getCodePrefixForCategory(category);
    if (!prefix) return { ...item, categoryName: category };

    const code = nextCodeForPrefix(prefix, used);
    if (item.isTrio) reserveTrioCodes(used, code);
    else used.add(code.toLowerCase());
    return { ...item, code, categoryName: category };
  });
}

export const TRIO_SIZES = ["BASE", "P", "M", "G"] as const;
export type TrioSize = (typeof TRIO_SIZES)[number];

function withSizeName(name: string, suffix: TrioSizeSuffix): string {
  if (!suffix) return name;
  const label = TRIO_SIZE_LABELS[suffix];
  if (new RegExp(`\\(${label}\\)$`, "i").test(name.trim())) return name;
  return `${name.trim()} (${label})`;
}

function withSizeSuffix(value: string | undefined | null, suffix: TrioSizeSuffix) {
  if (!value?.trim() || !suffix) return value ?? null;
  const base = value.trim().replace(/[-_]?[pmg]$/i, "");
  return `${base}-${suffix}`;
}

/**
 * Expande 1 produto trio (código base) em base + P + M + G,
 * todos ligados pelo mesmo trioGroupId.
 */
export function expandTrioItem<
  T extends {
    name: string;
    code?: string | null;
    isTrio?: boolean;
    sku?: string | null;
    reference?: string | null;
    barcode?: string | null;
    description?: string | null;
    trioGroupId?: string | null;
    trioSize?: string | null;
  }
>(item: T): T[] {
  if (!item.isTrio || !item.code?.trim() || isTrioSizeCode(item.code)) {
    return [item];
  }

  const codes = buildTrioCodes(item.code);
  const trioGroupId =
    item.trioGroupId ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `trio-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  return codes.map((code, index) => {
    const suffix = TRIO_SIZE_SUFFIXES[index];
    const trioSize = TRIO_SIZES[index];

    return {
      ...item,
      code,
      name: suffix ? withSizeName(item.name, suffix) : item.name,
      description:
        suffix && item.description
          ? withSizeName(item.description, suffix)
          : item.description,
      sku: suffix ? withSizeSuffix(item.sku, suffix) : item.sku,
      reference: suffix
        ? withSizeSuffix(item.reference, suffix)
        : item.reference,
      barcode: suffix
        ? code
        : item.barcode?.trim()
          ? item.barcode
          : code,
      isTrio: true,
      trioGroupId,
      trioSize,
    };
  });
}

export function expandTrioItems<T extends Parameters<typeof expandTrioItem>[0]>(
  items: T[]
): T[] {
  return items.flatMap((item) => expandTrioItem(item));
}
