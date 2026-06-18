import { ImportProductInput, ImportProductRow } from "./productImport";

export const PDF_ACCEPT = ".pdf,application/pdf";

export interface PdfCatalogMeta {
  orderNumber?: string;
  clientName?: string;
  goldQuote?: string;
  date?: string;
}

export type ImportProductRowWithFile = ImportProductInput;

type PdfPage = {
  pageNumber: number;
  imageCoordinates?: Float32Array | null;
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    intent?: string;
    recordImages?: boolean;
  }) => { promise: Promise<void> };
  getTextContent: () => Promise<{
    items: Array<{ str?: string; transform: number[] } | Record<string, unknown>>;
  }>;
};

let workerReady = false;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!workerReady && typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    workerReady = true;
  }

  return pdfjs;
}

function cleanProductName(name: string): string {
  const lines = name
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const filtered = lines.filter((line) => {
    if (/^N[°º]?:/i.test(line)) return false;
    if (/^\d+$/.test(line)) return false;
    if (/^Data:/i.test(line)) return false;
    if (/Ouro/i.test(line) || /Cota/i.test(line)) return false;
    if (/REGIANE/i.test(line) && /COLOMBO/i.test(line)) return false;
    return true;
  });

  return filtered[filtered.length - 1] || lines[lines.length - 1] || name.trim();
}

function parseMoney(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.replace(/R\$\s*/g, "").match(/([\d.,]+)/);
  if (!match) return undefined;

  const normalized = match[1].includes(",")
    ? match[1].replace(/\./g, "").replace(",", ".")
    : match[1];

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount.toFixed(2) : undefined;
}

function parseWeight(value: string): string | undefined {
  const match = value.match(/([\d.,]+)/);
  if (!match) return undefined;
  return match[1].replace(",", ".");
}

function extractPlatingTypeName(productName: string): string | undefined {
  const parts = productName.trim().split(/\s+/);
  if (parts.length < 2) return undefined;
  return parts.slice(1).join(" ");
}

const STANDARD_PRODUCT_PATTERN =
  /([\s\S]+?)\s+Produto:\s*\n([\s\S]+?)\s+Fornecedor:\s*\n([\s\S]+?)\s+Peso:\s*\n(R\$\s*[\d.,]+)\s+Bruto:\s*\n(R\$\s*[\d.,]+)\s+Banho:\s*\nCUSTO TOTAL:\s*(R\$\s*[\d.,]+)\s*\n([^\n]+?)\s+Ref\.:\s*\n(?:(\S+)\s+)?Obs:\s*(\d+)\s+Qtde\.:/g;

const BANHO_ONLY_PRODUCT_PATTERN =
  /([\s\S]+?)\s+Produto:\s*\n([\s\S]+?)\s+Fornecedor:\s*\n([\s\S]+?)\s+Peso:\s*\n(R\$\s*[\d.,]+)\s+Banho:\s*\nCUSTO BANHO:\s*(R\$\s*[\d.,]+)\s*\n(\S+)\s+Obs:\s*(\d+)\s+Qtde\.:/g;

function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ \n/g, "\n")
    .replace(/\n /g, "\n");
}

function mapStandardMatch(
  match: RegExpExecArray,
  collectionName?: string
): ImportProductRowWithFile {
  const nameRaw = match[1];
  const supplier = match[2];
  const weightRaw = match[3];
  const bruto = match[4];
  const banho = match[5];
  const total = match[6];
  const reference = match[7];
  const obs = match[8] ?? "";
  const qtyRaw = match[9];

  const name = cleanProductName(nameRaw);
  const unitPrice = parseMoney(bruto);
  const platingTotal = parseMoney(banho);
  const grandTotal = parseMoney(total);
  const quantity = Number(qtyRaw);
  const weight = parseWeight(weightRaw);

  const piecesTotal =
    unitPrice && Number.isFinite(quantity)
      ? (Number(unitPrice) * quantity).toFixed(2)
      : undefined;

  return {
    reference: reference.trim(),
    sku: reference.trim(),
    name,
    description: obs.trim() ? `${name} (${obs.trim()})` : name,
    supplierName: supplier.trim(),
    categoryName: name,
    platingTypeName: extractPlatingTypeName(name),
    collectionName,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    weight,
    unitPrice,
    totalPrice: piecesTotal,
    platingTotal,
    piecesTotal,
    grandTotal,
  };
}

function mapBanhoOnlyMatch(
  match: RegExpExecArray,
  collectionName?: string
): ImportProductRowWithFile {
  const nameRaw = match[1];
  const supplier = match[2];
  const weightRaw = match[3];
  const banho = match[4];
  const total = match[5];
  const obs = match[6];
  const qtyRaw = match[7];

  const name = cleanProductName(nameRaw);
  const weight = parseWeight(weightRaw);
  const obsText = obs.trim();
  const reference = `${obsText}-${weight ?? "0"}`;
  const platingTotal = parseMoney(banho);
  const grandTotal = parseMoney(total);
  const quantity = Number(qtyRaw);

  return {
    reference,
    sku: reference,
    name,
    description: obsText ? `${name} (${obsText})` : name,
    supplierName: supplier.trim(),
    categoryName: name,
    platingTypeName: extractPlatingTypeName(name),
    collectionName,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    weight,
    platingTotal,
    grandTotal,
  };
}

function parseProductsFromPageText(
  text: string,
  collectionName?: string
): ImportProductRowWithFile[] {
  const normalized = normalizePdfText(text);
  const products: Array<{ index: number; product: ImportProductRowWithFile }> = [];

  for (const match of normalized.matchAll(STANDARD_PRODUCT_PATTERN)) {
    products.push({
      index: match.index ?? 0,
      product: mapStandardMatch(match, collectionName),
    });
  }

  for (const match of normalized.matchAll(BANHO_ONLY_PRODUCT_PATTERN)) {
    products.push({
      index: match.index ?? 0,
      product: mapBanhoOnlyMatch(match, collectionName),
    });
  }

  products.sort((a, b) => a.index - b.index);
  return products.map((entry) => entry.product);
}

function extractPageText(page: PdfPage): Promise<string> {
  return page.getTextContent().then((content) => {
    let text = "";
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item) || !Array.isArray(item.transform)) continue;

      const y = item.transform[5] as number;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += "\n";
      } else if (lastY !== null && text && !text.endsWith("\n")) {
        text += " ";
      }

      text += String(item.str);
      lastY = y;
    }

    return `${text}\n`;
  });
}

function isProductImageRegion(width: number, height: number): boolean {
  if (width < 40 || height < 40) return false;
  return width / height < 2.5;
}

async function canvasRegionToFile(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  filename: string
): Promise<File | null> {
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = width;
  cropCanvas.height = height;

  const context = cropCanvas.getContext("2d");
  if (!context) return null;

  context.drawImage(source, x, y, width, height, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    cropCanvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) return null;

  return new File([blob], filename, { type: "image/jpeg" });
}

async function extractProductImages(page: PdfPage): Promise<File[]> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const context = canvas.getContext("2d");
  if (!context) return [];

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
    intent: "display",
    recordImages: true,
  }).promise;

  const coords = (page as { imageCoordinates?: Float32Array | null })
    .imageCoordinates;
  if (!coords || coords.length === 0) return [];

  const files: File[] = [];
  let imageIndex = 0;

  for (let i = 0; i < coords.length; i += 6) {
    const xs = [
      coords[i] * canvas.width,
      coords[i + 2] * canvas.width,
      coords[i + 4] * canvas.width,
    ];
    const ys = [
      coords[i + 1] * canvas.height,
      coords[i + 3] * canvas.height,
      coords[i + 5] * canvas.height,
    ];

    const minX = Math.max(0, Math.floor(Math.min(...xs)));
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxX = Math.min(canvas.width, Math.ceil(Math.max(...xs)));
    const maxY = Math.min(canvas.height, Math.ceil(Math.max(...ys)));

    const width = maxX - minX;
    const height = maxY - minY;

    if (!isProductImageRegion(width, height)) continue;

    imageIndex += 1;
    const file = await canvasRegionToFile(
      canvas,
      minX,
      minY,
      width,
      height,
      `pdf-product-${page.pageNumber}-${imageIndex}.jpg`
    );

    if (file) files.push(file);
  }

  return files;
}

function extractCatalogMeta(firstPageText: string): PdfCatalogMeta {
  const text = normalizePdfText(firstPageText);
  const meta: PdfCatalogMeta = {};
  const orderMatch = text.match(/N[°º]?:\s*(\d{3,})/i);
  if (orderMatch) meta.orderNumber = orderMatch[1];

  const clientMatch = text.match(
    /(?:^|\n)([A-ZÀ-Ú][A-ZÀ-Ú\s]{8,}?)\s+Cota[cç][aã]o do Ouro/i
  );
  if (clientMatch) meta.clientName = clientMatch[1].trim();

  const goldMatch = text.match(/Cota[cç][aã]o do Ouro:\s*(R\$\s*[\d.,]+)/i);
  if (goldMatch) meta.goldQuote = goldMatch[1].trim();

  const dateMatch = text.match(/Data:\s*([\d/]+)/i);
  if (dateMatch) meta.date = dateMatch[1].trim();

  return meta;
}

export interface PdfImportResult {
  products: ImportProductRowWithFile[];
  meta: PdfCatalogMeta;
}

export async function parsePdfCatalog(file: File): Promise<PdfImportResult> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const products: ImportProductRowWithFile[] = [];
  let collectionName: string | undefined;
  let meta: PdfCatalogMeta = {};

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = (await pdf.getPage(pageNumber)) as unknown as PdfPage;
    const pageText = await extractPageText(page);

    if (pageNumber === 1) {
      meta = extractCatalogMeta(pageText);
      collectionName = meta.clientName;
    }

    const pageProducts = parseProductsFromPageText(pageText, collectionName);
    const pageImages = await extractProductImages(page);

    pageProducts.forEach((product, index) => {
      const imageFile = pageImages[index];
      if (imageFile) {
        product.imageFile = imageFile;
      }
      if (meta.orderNumber && !product.code) {
        product.code = meta.orderNumber;
      }
      products.push(product);
    });
  }

  if (products.length === 0) {
    throw new Error(
      "Nenhum produto reconhecido no PDF. Verifique se é um catálogo no formato esperado."
    );
  }

  return { products, meta };
}
