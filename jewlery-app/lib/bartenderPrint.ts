import { extractCategoryName } from "@/app/cadastro/productCategory";
import { formatBRL, parsePrice } from "@/app/kit/kitUtils";

export interface LabelProduct {
  id: number;
  code: string | null;
  sku: string | null;
  reference?: string | null;
  barcode?: string | null;
  name: string;
  image?: string | null;
  priceLevel1: string | null;
  priceLevel2?: string | null;
  priceLevel3?: string | null;
  adjustedPrice?: string | null;
  category?: { id: number; name: string } | null;
}

export interface BartenderPrintSettings {
  apiUrl: string;
  documentPath: string;
  printer: string;
  copies: number;
  /** Named data source names in Documento2.btw → product field keys */
  fieldMap: BartenderFieldMap;
}

export type BartenderProductField =
  | "name"
  | "code"
  | "sku"
  | "reference"
  | "barcode"
  | "category"
  | "priceLevel1"
  | "priceLevel2"
  | "priceLevel3"
  | "adjustedPrice"
  | "priceLevel1Raw"
  | "priceFormatted";

export type BartenderFieldMap = Record<string, BartenderProductField>;

export const BARTENDER_SETTINGS_STORAGE_KEY = "jewlery.bartenderPrint.settings";

export const DEFAULT_BARTENDER_FIELD_MAP: BartenderFieldMap = {
  Nome: "name",
  Name: "name",
  Codigo: "code",
  Code: "code",
  SKU: "sku",
  Sku: "sku",
  Referencia: "reference",
  Reference: "reference",
  Barcode: "barcode",
  CodigoBarras: "barcode",
  Categoria: "category",
  Category: "category",
  Preco: "priceFormatted",
  Preco1: "priceFormatted",
  Price: "priceFormatted",
  PriceLevel1: "priceLevel1Raw",
};

export function getDefaultBartenderSettings(): BartenderPrintSettings {
  return {
    apiUrl:
      process.env.NEXT_PUBLIC_BARTENDER_API_URL?.trim() ||
      "http://localhost:5159",
    documentPath:
      process.env.NEXT_PUBLIC_BARTENDER_DOCUMENT?.trim() ||
      "C:\\Etiquetas\\Documento2.btw",
    printer: process.env.NEXT_PUBLIC_BARTENDER_PRINTER?.trim() || "",
    copies: 1,
    fieldMap: { ...DEFAULT_BARTENDER_FIELD_MAP },
  };
}

export function loadBartenderSettings(): BartenderPrintSettings {
  const defaults = getDefaultBartenderSettings();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(BARTENDER_SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<BartenderPrintSettings>;
    return {
      ...defaults,
      ...parsed,
      fieldMap: {
        ...defaults.fieldMap,
        ...(parsed.fieldMap ?? {}),
      },
      copies:
        typeof parsed.copies === "number" && parsed.copies > 0
          ? Math.floor(parsed.copies)
          : defaults.copies,
    };
  } catch {
    return defaults;
  }
}

export function saveBartenderSettings(settings: BartenderPrintSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BARTENDER_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  );
}

export function getProductLabelType(product: LabelProduct): string {
  return product.category?.name?.trim() || extractCategoryName(product.name);
}

export function listProductLabelTypes(products: LabelProduct[]): string[] {
  const set = new Set<string>();
  for (const product of products) {
    set.add(getProductLabelType(product));
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function resolveProductField(
  product: LabelProduct,
  field: BartenderProductField
): string {
  switch (field) {
    case "name":
      return product.name ?? "";
    case "code":
      return product.code ?? "";
    case "sku":
      return product.sku ?? "";
    case "reference":
      return product.reference ?? "";
    case "barcode":
      return product.barcode ?? product.sku ?? product.code ?? "";
    case "category":
      return getProductLabelType(product);
    case "priceLevel1":
    case "priceFormatted": {
      const n =
        parsePrice(product.adjustedPrice) ?? parsePrice(product.priceLevel1);
      return n !== null ? formatBRL(n) : "";
    }
    case "priceLevel1Raw": {
      const n =
        parsePrice(product.adjustedPrice) ?? parsePrice(product.priceLevel1);
      return n !== null ? n.toFixed(2) : "";
    }
    case "priceLevel2": {
      const n = parsePrice(product.priceLevel2);
      return n !== null ? formatBRL(n) : "";
    }
    case "priceLevel3": {
      const n = parsePrice(product.priceLevel3);
      return n !== null ? formatBRL(n) : "";
    }
    case "adjustedPrice": {
      const n = parsePrice(product.adjustedPrice);
      return n !== null ? formatBRL(n) : "";
    }
    default:
      return "";
  }
}

export function buildNamedDataSources(
  product: LabelProduct,
  fieldMap: BartenderFieldMap = DEFAULT_BARTENDER_FIELD_MAP
): Record<string, string> {
  const named: Record<string, string> = {};
  for (const [sourceName, field] of Object.entries(fieldMap)) {
    if (!sourceName.trim()) continue;
    named[sourceName] = resolveProductField(product, field);
  }
  return named;
}

export function buildPrintBTWAction(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  copies = settings.copies
) {
  const action: Record<string, unknown> = {
    Document: settings.documentPath,
    DocumentFile: settings.documentPath,
    SaveAfterPrint: false,
    Copies: Math.max(1, Math.floor(copies || 1)),
    NamedDataSources: buildNamedDataSources(product, settings.fieldMap),
  };

  if (settings.printer.trim()) {
    action.Printer = settings.printer.trim();
  }

  return { PrintBTWAction: action };
}

export function bartenderActionsUrl(apiUrl: string) {
  const base = apiUrl.replace(/\/+$/, "");
  return `${base}/api/actions?Wait=60s&MessageCount=50&MessageSeverity=Info`;
}

export async function checkBartenderAvailable(
  apiUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetchImpl(bartenderActionsUrl(apiUrl), {
      method: "OPTIONS",
      signal: controller.signal,
      credentials: "include",
    }).catch(async () => {
      // Some BarTender installs reject OPTIONS; a lightweight GET/POST probe
      // is still useful to detect "connection refused".
      return fetchImpl(apiUrl.replace(/\/+$/, "") + "/", {
        method: "GET",
        signal: controller.signal,
        credentials: "include",
        mode: "no-cors",
      });
    });
    clearTimeout(timer);
    return Boolean(res);
  } catch {
    return false;
  }
}

export class BartenderPrintError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "BartenderPrintError";
  }
}

export async function printProductLabel(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  options?: { copies?: number; fetchImpl?: typeof fetch }
): Promise<unknown> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const copies = options?.copies ?? settings.copies;
  const payload = buildPrintBTWAction(product, settings, copies);

  let response: Response;
  try {
    response = await fetchImpl(bartenderActionsUrl(settings.apiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new BartenderPrintError(
      "Não foi possível conectar ao BarTender neste PC. Confirme que o BarTender está instalado e a API local (porta 5159) está ativa."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    throw new BartenderPrintError(
      `BarTender retornou erro ao imprimir "${product.name}" (HTTP ${response.status}).`,
      response.status,
      body
    );
  }

  return body;
}

export async function printProductLabels(
  products: LabelProduct[],
  settings: BartenderPrintSettings,
  options?: {
    copiesByProductId?: Record<number, number>;
    onProgress?: (done: number, total: number, product: LabelProduct) => void;
    fetchImpl?: typeof fetch;
  }
): Promise<{ printed: number; errors: { product: LabelProduct; error: string }[] }> {
  const errors: { product: LabelProduct; error: string }[] = [];
  let printed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    options?.onProgress?.(i, products.length, product);
    try {
      await printProductLabel(product, settings, {
        copies: options?.copiesByProductId?.[product.id] ?? settings.copies,
        fetchImpl: options?.fetchImpl,
      });
      printed += 1;
    } catch (e) {
      errors.push({
        product,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      });
    }
  }

  options?.onProgress?.(products.length, products.length, products[products.length - 1]);
  return { printed, errors };
}
