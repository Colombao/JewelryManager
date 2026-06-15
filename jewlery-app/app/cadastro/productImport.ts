import * as XLSX from "xlsx";

export interface ImportProductRow {
  code?: string;
  reference?: string;
  sku?: string;
  name: string;
  description?: string;
  supplierName?: string;
  categoryName?: string;
  platingTypeName?: string;
  quantity?: number;
  weight?: string | number;
  unitPrice?: string | number;
  totalPrice?: string | number;
  platingTotal?: string | number;
  piecesTotal?: string | number;
  grandTotal?: string | number;
  priceLevel1?: string | number;
  priceLevel2?: string | number;
  priceLevel3?: string | number;
  adjustedPrice?: string | number;
}

const COLUMN_ALIASES: Record<string, keyof ImportProductRow | "skip"> = {
  cod: "code",
  codigo: "code",
  referencia: "reference",
  ref: "reference",
  descricao: "name",
  desc: "name",
  nome: "name",
  fornecedor: "supplierName",
  "preco total": "skip",
  quantidade: "quantity",
  qtd: "quantity",
  peso: "weight",
  "preco peca": "unitPrice",
  "preco unitario": "unitPrice",
  banho: "skip",
  "total banho": "platingTotal",
  "total pecas": "piecesTotal",
  "total geral": "grandTotal",
  pv1: "priceLevel1",
  pv2: "priceLevel2",
  pv3: "priceLevel3",
  "preco ajustado": "adjustedPrice",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellToNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function cellToDecimal(value: unknown): string | undefined {
  const n = cellToNumber(value);
  if (n === undefined) return undefined;
  return n.toFixed(2);
}

function mapHeaderRow(headers: unknown[]): (keyof ImportProductRow | "skip" | null)[] {
  return headers.map((header) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return null;
    return COLUMN_ALIASES[normalized] ?? null;
  });
}

function rowToProduct(
  row: unknown[],
  mapping: (keyof ImportProductRow | "skip" | null)[]
): ImportProductRow | null {
  const item: Partial<ImportProductRow> = {};

  mapping.forEach((field, index) => {
    if (!field || field === "skip") return;
    const value = row[index];

    if (
      field === "quantity"
    ) {
      const qty = cellToNumber(value);
      if (qty !== undefined) item.quantity = Math.round(qty);
      return;
    }

    if (
      field === "weight" ||
      field === "unitPrice" ||
      field === "totalPrice" ||
      field === "platingTotal" ||
      field === "piecesTotal" ||
      field === "grandTotal" ||
      field === "priceLevel1" ||
      field === "priceLevel2" ||
      field === "priceLevel3" ||
      field === "adjustedPrice"
    ) {
      const decimal = cellToDecimal(value);
      if (decimal !== undefined) item[field] = decimal;
      return;
    }

    const text = cellToString(value);
    if (text) item[field] = text;
  });

  const reference = item.reference?.trim();
  const name = item.name?.trim();

  if (!name && !reference) return null;
  if (!name && reference) item.name = reference;

  if (reference && !item.sku) item.sku = reference;
  if (name && !item.description) item.description = name;
  if (name && !item.categoryName) item.categoryName = name;

  return item as ImportProductRow;
}

function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];
}

export function parseSpreadsheetFile(file: File): Promise<ImportProductRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (!buffer) {
          reject(new Error("Não foi possível ler o arquivo"));
          return;
        }

        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error("Planilha vazia"));
          return;
        }

        const rows = sheetToRows(workbook.Sheets[sheetName]);
        if (rows.length < 2) {
          resolve([]);
          return;
        }

        const mapping = mapHeaderRow(rows[0]);
        const hasMappedColumn = mapping.some(Boolean);

        if (!hasMappedColumn) {
          reject(
            new Error(
              "Cabeçalho não reconhecido. Use colunas como Cód., Referencia, Descrição, Fornecedor..."
            )
          );
          return;
        }

        const products: ImportProductRow[] = [];

        for (let i = 1; i < rows.length; i++) {
          const product = rowToProduct(rows[i], mapping);
          if (product) products.push(product);
        }

        resolve(products);
      } catch (err) {
        reject(
          err instanceof Error ? err : new Error("Erro ao processar planilha")
        );
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

export const IMPORT_BATCH_SIZE = 50;

export const IMPORT_ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

export interface ImportBatchResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function importProductsInBatches(
  apiUrl: string,
  items: ImportProductRow[],
  skipDuplicates: boolean,
  onProgress?: (processed: number, total: number) => void
): Promise<ImportBatchResult> {
  const batches = chunkArray(items, IMPORT_BATCH_SIZE);
  const total = items.length;
  let processed = 0;

  const result: ImportBatchResult = { created: 0, skipped: 0, errors: [] };

  for (const batch of batches) {
    const res = await fetch(`${apiUrl}/products/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: batch, skipDuplicates }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Erro ao importar produtos");
    }

    result.created += data.created ?? 0;
    result.skipped += data.skipped ?? 0;

    for (const err of data.errors ?? []) {
      result.errors.push({
        row: processed + (err.row ?? 0),
        message: err.message ?? "Erro desconhecido",
      });
    }

    processed += batch.length;
    onProgress?.(processed, total);
  }

  return result;
}
