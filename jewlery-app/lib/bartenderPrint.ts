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
  documentFolder: string;
  printer: string;
  copies: number;
  /**
   * Products per physical row on the label (Documento2 has 2 templates → 2).
   * Used for preview text; the RecordSet print lets BarTender place consecutive
   * records on the same row automatically.
   */
  labelsPerRow: number;
  /**
   * Name of the text-database connection inside the .btw
   * (BarTender → Database Connection Setup). Must match or RecordSet
   * won't replace data and the last manual "Reg. selecionados" is used.
   */
  databaseName: string;
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

export const BARTENDER_SETTINGS_STORAGE_KEY =
  "jewlery.bartenderPrint.settings.v2";

/**
 * Column / Named Data Source names sent to Documento2.btw.
 * Must match the field names in the .btw (code, price — not Codigo/Preco).
 */
export const DEFAULT_BARTENDER_FIELD_MAP: BartenderFieldMap = {
  code: "code",
  name: "name",
  sku: "sku",
  reference: "reference",
  barcode: "barcode",
  price: "priceFormatted",
  category: "category",
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
    labelsPerRow: 2,
    databaseName:
      process.env.NEXT_PUBLIC_BARTENDER_DATABASE_NAME?.trim() || "Text File 1",
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
    const labelsPerRow =
      typeof parsed.labelsPerRow === "number" && parsed.labelsPerRow > 0
        ? Math.min(4, Math.floor(parsed.labelsPerRow))
        : defaults.labelsPerRow;

    return {
      ...defaults,
      ...parsed,
      documentPath,
      documentFolder,
      labelsPerRow,
      databaseName: parsed.databaseName?.trim() || defaults.databaseName,
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
  product: LabelProduct | null | undefined,
  field: BartenderProductField
): string {
  if (!product) return "";
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

export function chunkProducts<T>(items: T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size || 1));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += n) {
    rows.push(items.slice(i, i + n));
  }
  return rows;
}

export function describePrintRows(
  products: LabelProduct[],
  labelsPerRow: number
): string[] {
  return chunkProducts(products, labelsPerRow).map((row, index) => {
    const codes = row.map((p) => p.code || p.sku || `#${p.id}`);
    while (codes.length < Math.max(1, labelsPerRow)) codes.push("—");
    return `Linha ${index + 1}: ${codes.join(" | ")}`;
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildRecordSetCsv(
  products: LabelProduct[],
  fieldMap: BartenderFieldMap = DEFAULT_BARTENDER_FIELD_MAP
): string {
  const columns = Object.keys(fieldMap);
  const header = columns.map(csvEscape).join(",");
  const lines = products.map((product) =>
    columns
      .map((col) => csvEscape(resolveProductField(product, fieldMap[col])))
      .join(",")
  );
  return [header, ...lines].join("\r\n");
}

function namedSubStringXml(named: Record<string, string>): string {
  return Object.entries(named)
    .map(
      ([name, value]) =>
        `      <NamedSubString Name="${escapeXml(name)}">\n        <Value>${escapeXml(value)}</Value>\n      </NamedSubString>`
    )
    .join("\n");
}

/** Overrides BarTender "Reg. selecionados" (e.g. leftover "6") with 1..N. */
export function buildRecordRange(productCount: number): string {
  const n = Math.max(1, Math.floor(productCount));
  return n === 1 ? "1" : `1-${n}`;
}

function buildPrintSetupXml(options: {
  printerXml: string;
  copies: number;
  recordRange: string;
  useDatabase: boolean;
}): string {
  return `      <PrintSetup>
${options.printerXml}        <IdenticalCopiesOfLabel>${options.copies}</IdenticalCopiesOfLabel>
        <UseDatabase>${options.useDatabase ? "true" : "false"}</UseDatabase>
        <EnablePrompting>false</EnablePrompting>
        <RecordRange>${escapeXml(options.recordRange)}</RecordRange>
      </PrintSetup>`;
}

/**
 * Single BTXML request for the whole selection.
 * Replaces the text DB + forces RecordRange so BarTender does not reuse the
 * last manual "Reg. selecionados" (e.g. only record 6 / BR01).
 */
export function buildBatchPrintBTXML(
  products: LabelProduct[],
  settings: BartenderPrintSettings,
  copiesByProductId?: Record<number, number>
): string {
  if (products.length === 0) {
    throw new Error("Nenhum produto selecionado");
  }

  const formatPath = escapeXml(settings.documentPath.trim());
  const printerXml = settings.printer.trim()
    ? `        <Printer>${escapeXml(settings.printer.trim())}</Printer>\n`
    : "";
  const defaultCopies = Math.max(1, Math.floor(settings.copies || 1));
  const copies = Math.max(
    defaultCopies,
    ...products.map((p) => copiesByProductId?.[p.id] ?? defaultCopies)
  );
  // CDATA keeps CSV intact inside BTXML (and later JSON-wrapped Script).
  const csv = buildRecordSetCsv(products, settings.fieldMap).replace(
    /]]>/g,
    "]]]]><![CDATA[>"
  );
  const jobCodes = products
    .map((p) => p.code || p.sku || String(p.id))
    .join(",");
  const recordRange = buildRecordRange(products.length);
  const databaseName = escapeXml(
    settings.databaseName?.trim() || "Text File 1"
  );
  const printSetup = buildPrintSetupXml({
    printerXml,
    copies,
    recordRange,
    useDatabase: true,
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<XMLScript Version="2.0">
  <Command Name="jewlery-labels">
    <Print WaitForJobToComplete="true" JobName="jewlery-${escapeXml(jobCodes)}" ReturnPrintData="true" ReturnSummary="true" ReturnLabelData="true">
      <Format CloseAtEnd="true" SaveAtEnd="false">${formatPath}</Format>
${printSetup}
      <RecordSet Name="${databaseName}" Type="btTextFile" AddIfNone="true">
        <Delimitation>btDelimQuoteAndComma</Delimitation>
        <UseFieldNamesFromFirstRecord>true</UseFieldNamesFromFirstRecord>
        <TextData><![CDATA[${csv}]]></TextData>
      </RecordSet>
    </Print>
  </Command>
</XMLScript>
`;
}

/** Actions API only accepts JSON/YAML — wrap BTXML in PrintBTXMLScriptAction. */
export function buildPrintBTXMLScriptAction(
  products: LabelProduct[],
  settings: BartenderPrintSettings,
  copiesByProductId?: Record<number, number>
) {
  return {
    PrintBTXMLScriptAction: {
      Name: "JewleryPrintBTXML",
      Script: buildBatchPrintBTXML(products, settings, copiesByProductId),
      ReturnPrintData: true,
      ReturnPrintSummary: true,
      ReturnLabelData: true,
    },
  };
}

/**
 * Fallback: still ONE HTTP request, but one Print per product with NamedSubString.
 * Use when the .btw has Named Data Sources (code, name, price…) instead of a DB.
 */
export function buildNamedSubstringBatchBTXML(
  products: LabelProduct[],
  settings: BartenderPrintSettings,
  copiesByProductId?: Record<number, number>
): string {
  if (products.length === 0) {
    throw new Error("Nenhum produto selecionado");
  }

  const formatPath = escapeXml(settings.documentPath.trim());
  const printerXml = settings.printer.trim()
    ? `        <Printer>${escapeXml(settings.printer.trim())}</Printer>\n`
    : "";
  const defaultCopies = Math.max(1, Math.floor(settings.copies || 1));

  const prints = products
    .map((product, index) => {
      const named = buildNamedDataSources(product, settings.fieldMap);
      const copies = copiesByProductId?.[product.id] ?? defaultCopies;
      const code = product.code || product.sku || String(product.id);
      const printSetup = buildPrintSetupXml({
        printerXml,
        copies,
        recordRange: "1",
        useDatabase: false,
      });
      return `    <Print WaitForJobToComplete="true" JobName="jewlery-${escapeXml(code)}" ReturnLabelData="true">
      <Format CloseAtEnd="${index === products.length - 1 ? "true" : "false"}" SaveAtEnd="false">${formatPath}</Format>
${printSetup}
${namedSubStringXml(named)}
    </Print>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<XMLScript Version="2.0">
  <Command Name="jewlery-labels-named">
${prints}
  </Command>
</XMLScript>
`;
}

export function buildPrintBTXML(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  copies = settings.copies
): string {
  return buildNamedSubstringBatchBTXML([product], settings, {
    [product.id]: copies,
  });
}

export function buildBatchPrintActions(
  products: LabelProduct[],
  settings: BartenderPrintSettings,
  copiesByProductId?: Record<number, number>
) {
  const defaultCopies = Math.max(1, Math.floor(settings.copies || 1));

  // JSON array of actions (Actions API style), not a custom ActionGroup object.
  return products.map((product, index) => {
    const named = buildNamedDataSources(product, settings.fieldMap);
    const rowAction: Record<string, unknown> = {
      Name: `Print_${product.code || product.id}`,
      Document: settings.documentPath,
      DocumentFile: settings.documentPath,
      SaveAfterPrint: false,
      CloseDocumentAfterPrint: index === products.length - 1,
      Copies: String(copiesByProductId?.[product.id] ?? defaultCopies),
      RecordRange: "1",
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
      rowAction.Printer = settings.printer.trim();
    }
    return { PrintBTWAction: rowAction };
  });
}

export function buildPrintBTWAction(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  copies = settings.copies
) {
  return buildBatchPrintActions([product], settings, { [product.id]: copies })[0];
}

export function bartenderActionsUrl(apiUrl: string) {
  const base = apiUrl.replace(/\/+$/, "");
  return `${base}/api/actions?Wait=120s&MessageCount=100&MessageSeverity=Info`;
}

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

function assertBartenderSuccess(body: unknown, context: string) {
  if (!isBartenderFaulted(body)) return;
  const messages = extractBartenderMessages(body);
  const detail =
    messages.find((m) => /\[Error\]/i.test(m)) ||
    messages[0] ||
    "Status Faulted";
  throw new BartenderPrintError(
    `BarTender não imprimiu (${context}): ${detail}`,
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

  // API sometimes returns 400 with a Portuguese deserialization message as text/plain.
  const asText =
    typeof parsed === "string"
      ? parsed
      : parsed && typeof parsed === "object"
        ? JSON.stringify(parsed)
        : "";
  if (
    !response.ok ||
    /formato válido|deserialization|deserializa/i.test(asText)
  ) {
    throw new BartenderPrintError(
      typeof parsed === "string" && parsed.trim()
        ? parsed.trim()
        : `BarTender retornou HTTP ${response.status || 400}.`,
      response.status,
      parsed
    );
  }

  return parsed;
}

/** One HTTP request containing every selected product. */
export async function printProductLabels(
  products: LabelProduct[],
  settings: BartenderPrintSettings,
  options?: {
    copiesByProductId?: Record<number, number>;
    onProgress?: (done: number, total: number, product: LabelProduct) => void;
    fetchImpl?: typeof fetch;
  }
): Promise<{ printed: number; errors: { product: LabelProduct; error: string }[] }> {
  if (products.length === 0) {
    return { printed: 0, errors: [] };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  options?.onProgress?.(0, products.length, products[0]);

  const codes = products.map((p) => p.code || p.sku || String(p.id)).join(", ");

  try {
    // 1) JSON + PrintBTXMLScriptAction (RecordSet + RecordRange) — correct API format
    try {
      const body = await postBartender(
        settings,
        JSON.stringify(
          buildPrintBTXMLScriptAction(
            products,
            settings,
            options?.copiesByProductId
          )
        ),
        "application/json",
        fetchImpl
      );
      assertBartenderSuccess(body, codes);
    } catch (btxmlError) {
      if (
        btxmlError instanceof BartenderPrintError &&
        btxmlError.message.includes("conectar ao BarTender")
      ) {
        throw btxmlError;
      }

      // 2) JSON array of PrintBTWAction (NamedDataSources + RecordRange per item)
      const body = await postBartender(
        settings,
        JSON.stringify(
          buildBatchPrintActions(
            products,
            settings,
            options?.copiesByProductId
          )
        ),
        "application/json",
        fetchImpl
      );
      assertBartenderSuccess(body, codes);
    }

    options?.onProgress?.(
      products.length,
      products.length,
      products[products.length - 1]
    );
    return { printed: products.length, errors: [] };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    return {
      printed: 0,
      errors: products.map((product) => ({ product, error })),
    };
  }
}

export async function printProductLabel(
  product: LabelProduct,
  settings: BartenderPrintSettings,
  options?: { copies?: number; fetchImpl?: typeof fetch }
): Promise<unknown> {
  const result = await printProductLabels([product], settings, {
    copiesByProductId: { [product.id]: options?.copies ?? settings.copies },
    fetchImpl: options?.fetchImpl,
  });
  if (result.errors.length > 0) {
    throw new BartenderPrintError(result.errors[0].error);
  }
  return { Status: "RanToCompletion", printed: result.printed };
}
