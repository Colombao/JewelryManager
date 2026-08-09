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
  /** Full path to the .btw file on the local Windows PC */
  documentPath: string;
  /** Directory that contains the .btw (used with file picker) */
  documentFolder: string;
  printer: string;
  copies: number;
  /** Named data source / NamedSubString names in the .btw → product field keys */
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

/**
 * Default Named Data Source / NamedSubString names sent to Documento2.btw.
 * Rename the sources in BarTender to match, or edit this map in settings.
 */
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
  Tipo: "category",
  Preco: "priceFormatted",
  Preco1: "priceFormatted",
  Price: "priceFormatted",
  PriceLevel1: "priceLevel1Raw",
};

export function getDefaultBartenderSettings(): BartenderPrintSettings {
  const documentPath =
    process.env.NEXT_PUBLIC_BARTENDER_DOCUMENT?.trim() ||
    "C:\\Etiquetas\\Documento2.btw";
  return {
    apiUrl:
      process.env.NEXT_PUBLIC_BARTENDER_API_URL?.trim() ||
      "http://localhost:5159",
    documentPath,
    documentFolder: folderFromDocumentPath(documentPath),
    printer: process.env.NEXT_PUBLIC_BARTENDER_PRINTER?.trim() || "",
    copies: 1,
    fieldMap: { ...DEFAULT_BARTENDER_FIELD_MAP },
  };
}

export function folderFromDocumentPath(path: string): string {
  const value = path.trim().replace(/[\\/]+$/, "");
  if (!value) return "";
  if (/\.btw$/i.test(value)) {
    return value.replace(/[\\/][^\\/]+$/, "");
  }
  return value;
}

export function fileNameFromDocumentPath(path: string): string {
  const value = path.trim();
  const match = value.match(/[^\\/]+\.btw$/i);
  return match?.[0] ?? "";
}

export function joinWindowsPath(folder: string, fileName: string): string {
  const dir = folder.trim().replace(/[\\/]+$/, "");
  const name = fileName.trim().replace(/^.*[\\/]/, "");
  if (!dir) return name;
  if (!name) return dir;
  const sep = dir.includes("/") && !dir.includes("\\") ? "/" : "\\";
  return `${dir}${sep}${name}`;
}

/** Apply a picked .btw file name onto the remembered folder / path. */
export function applySelectedBtwFileName(
  settings: Pick<BartenderPrintSettings, "documentPath" | "documentFolder">,
  fileName: string
): Pick<BartenderPrintSettings, "documentPath" | "documentFolder"> {
  const name = fileName.trim().replace(/^.*[\\/]/, "");
  if (!name || !/\.btw$/i.test(name)) {
    return {
      documentPath: settings.documentPath,
      documentFolder: settings.documentFolder,
    };
  }

  const folder =
    settings.documentFolder.trim() ||
    folderFromDocumentPath(settings.documentPath) ||
    "C:\\Etiquetas";

  return {
    documentFolder: folder,
    documentPath: joinWindowsPath(folder, name),
  };
}

export function loadBartenderSettings(): BartenderPrintSettings {
  const defaults = getDefaultBartenderSettings();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(BARTENDER_SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<BartenderPrintSettings>;
    const documentPath = parsed.documentPath?.trim() || defaults.documentPath;
    const documentFolder =
      parsed.documentFolder?.trim() ||
      folderFromDocumentPath(documentPath) ||
      defaults.documentFolder;

    return {
      ...defaults,
      ...parsed,
      documentPath,
      documentFolder,
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

/** Jewelry type for label printing (Brinco, Pulseira…), inferred from the name. */
export function getProductLabelType(product: LabelProduct): string {
  // DB category is often the catalog line name (e.g. "BR-ALE Dourado 3 ml"),
  // not Brinco/Pulseira — always derive the type from the product name.
  return extractCategoryName(product.name);
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Classic BTXML — NamedSubString is the most reliable way to fill label fields. */
export function buildPrintBTXML(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  copies = settings.copies
): string {
  const named = buildNamedDataSources(product, settings.fieldMap);
  const jobName = `jewlery-${product.code || product.sku || product.id}`;
  const formatPath = escapeXml(settings.documentPath.trim());
  const copyCount = Math.max(1, Math.floor(copies || 1));

  const namedXml = Object.entries(named)
    .map(
      ([name, value]) =>
        `      <NamedSubString Name="${escapeXml(name)}">\n        <Value>${escapeXml(value)}</Value>\n      </NamedSubString>`
    )
    .join("\n");

  const printerXml = settings.printer.trim()
    ? `        <Printer>${escapeXml(settings.printer.trim())}</Printer>\n`
    : "";

  return `<?xml version="1.0" encoding="utf-8"?>
<XMLScript Version="2.0">
  <Command Name="${escapeXml(jobName)}">
    <Print WaitForJobToComplete="true" JobName="${escapeXml(jobName)}">
      <Format CloseAtEnd="true" SaveAtEnd="false">${formatPath}</Format>
      <PrintSetup>
${printerXml}        <IdenticalCopiesOfLabel>${copyCount}</IdenticalCopiesOfLabel>
      </PrintSetup>
${namedXml}
    </Print>
  </Command>
</XMLScript>
`;
}

export function buildPrintBTWAction(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  copies = settings.copies
) {
  const named = buildNamedDataSources(product, settings.fieldMap);
  const jobName = `jewlery-${product.code || product.sku || product.id}`;
  const action: Record<string, unknown> = {
    Name: jobName,
    Document: settings.documentPath,
    DocumentFile: settings.documentPath,
    SaveAfterPrint: false,
    CloseDocumentAfterPrint: true,
    Copies: String(Math.max(1, Math.floor(copies || 1))),
    NamedDataSources: named,
    QueryPrompts: Object.entries(named).map(([Name, Value]) => ({
      Name,
      Value,
    })),
    VerifyPrintJobIsComplete: true,
    ReturnPrintSummary: true,
    ReturnLabelData: true,
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

/** Full path to a .btw file (not a folder). */
export function validateBartenderDocumentPath(path: string): string | null {
  const value = path.trim();
  if (!value) return "Informe o caminho completo do Documento2.btw neste PC.";
  if (!/\.btw$/i.test(value)) {
    return 'O caminho precisa terminar com o arquivo .btw (ex.: C:\\Users\\AlmaW\\Desktop\\bartender\\Documento2.btw), não só a pasta.';
  }
  return null;
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

function extractBartenderMessages(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const messages = record.Messages ?? record.messages;
  if (Array.isArray(messages)) {
    return messages.map((m) => String(m));
  }
  return [];
}

function isBartenderFaulted(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const status = String(
    (body as Record<string, unknown>).Status ??
      (body as Record<string, unknown>).status ??
      ""
  );
  return /faulted|failed|error/i.test(status);
}

function assertBartenderSuccess(product: LabelProduct, body: unknown) {
  if (!isBartenderFaulted(body)) return;
  const messages = extractBartenderMessages(body);
  const detail =
    messages.find((m) => /\[Error\]/i.test(m)) ||
    messages[0] ||
    "Status Faulted";
  throw new BartenderPrintError(
    `BarTender não imprimiu "${product.name}": ${detail}`,
    undefined,
    body
  );
}

async function postBartender(
  settings: BartenderPrintSettings,
  body: string,
  contentType: string,
  fetchImpl: typeof fetch
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(bartenderActionsUrl(settings.apiUrl), {
      method: "POST",
      headers: { "Content-Type": contentType },
      credentials: "include",
      body,
    });
  } catch {
    throw new BartenderPrintError(
      "Não foi possível conectar ao BarTender neste PC. Confirme que o BarTender está instalado e a API local (porta 5159) está ativa."
    );
  }

  const responseType = response.headers.get("content-type") || "";
  const parsed = responseType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    throw new BartenderPrintError(
      `BarTender retornou HTTP ${response.status}.`,
      response.status,
      parsed
    );
  }

  return parsed;
}

export async function printProductLabel(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  options?: { copies?: number; fetchImpl?: typeof fetch }
): Promise<unknown> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const copies = options?.copies ?? settings.copies;

  // Prefer BTXML NamedSubString (works with most desktop .btw data entry forms).
  const btxml = buildPrintBTXML(product, settings, copies);
  try {
    const body = await postBartender(
      settings,
      btxml,
      "application/xml",
      fetchImpl
    );
    assertBartenderSuccess(product, body);
    return body;
  } catch (firstError) {
    // Fallback: JSON PrintBTWAction with NamedDataSources + QueryPrompts
    if (
      firstError instanceof BartenderPrintError &&
      firstError.message.includes("conectar ao BarTender")
    ) {
      throw firstError;
    }

    const payload = buildPrintBTWAction(product, settings, copies);
    const body = await postBartender(
      settings,
      JSON.stringify(payload),
      "application/json",
      fetchImpl
    );
    assertBartenderSuccess(product, body);
    return body;
  }
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

  options?.onProgress?.(
    products.length,
    products.length,
    products[products.length - 1]
  );
  return { printed, errors };
}
