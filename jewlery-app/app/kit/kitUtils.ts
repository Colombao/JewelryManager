export interface NamedItem {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  code: string | null;
  sku: string | null;
  reference: string | null;
  name: string;
  description: string | null;
  image: string | null;
  quantity: number;
  priceLevel1: string | null;
  priceLevel2: string | null;
  priceLevel3: string | null;
  adjustedPrice: string | null;
  active: boolean;
  category?: NamedItem | null;
}

export interface Reseller {
  id: number;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

export interface KitLineItem {
  id: string;
  productId: number | null;
  reference: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
}

export interface CategoryGroup {
  category: string;
  items: KitLineItem[];
  totalQty: number;
  totalValue: number;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function resolveImageUrl(image: string | null | undefined) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${apiUrl}${image.startsWith("/") ? image : `/${image}`}`;
}

export function parsePrice(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function getDisplayPrice(product: Product): number {
  return (
    parsePrice(product.adjustedPrice) ??
    parsePrice(product.priceLevel1) ??
    parsePrice(product.priceLevel2) ??
    parsePrice(product.priceLevel3) ??
    0
  );
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function normalizeCategory(name: string | null | undefined) {
  if (!name?.trim()) return "OUTROS";
  return name.trim().toUpperCase();
}

export function getProductReference(product: Product) {
  return (product.code || product.reference || product.sku || `P${product.id}`).toUpperCase();
}

export function lineTotal(item: KitLineItem) {
  return item.quantity * item.unitPrice;
}

export function groupItemsByCategory(items: KitLineItem[]): CategoryGroup[] {
  const map = new Map<string, KitLineItem[]>();

  for (const item of items) {
    const key = normalizeCategory(item.category);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .map(([category, groupItems]) => ({
      category,
      items: groupItems,
      totalQty: groupItems.reduce((sum, i) => sum + i.quantity, 0),
      totalValue: groupItems.reduce((sum, i) => sum + lineTotal(i), 0),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "pt-BR"));
}

export function getCommissionRate(total: number): number {
  if (total <= 500) return 0.25;
  if (total <= 1000) return 0.3;
  if (total <= 1600) return 0.35;
  return 0.4;
}

export function getCommissionLabel(total: number): string {
  if (total <= 500) return "Até R$ 500,00";
  if (total <= 1000) return "R$ 501,00 a R$ 1.000,00";
  if (total <= 1600) return "R$ 1.001,00 a R$ 1.600,00";
  return "Acima de R$ 1.601,00";
}

export function createLineFromProduct(product: Product): KitLineItem {
  const reference = getProductReference(product);
  const category = normalizeCategory(product.category?.name || product.name.split(" ")[0]);

  return {
    id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: product.id,
    reference,
    description: product.name,
    category,
    quantity: 1,
    unitPrice: getDisplayPrice(product),
  };
}

export function createManualLine(
  reference: string,
  description: string,
  category: string,
  unitPrice: number
): KitLineItem {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: null,
    reference: reference.toUpperCase(),
    description,
    category: normalizeCategory(category),
    quantity: 1,
    unitPrice,
  };
}

export function nextKitNumber(): number {
  if (typeof window === "undefined") return 1;
  const key = "empodere_kit_number";
  const current = parseInt(localStorage.getItem(key) ?? "10", 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  localStorage.setItem(key, String(next));
  return next;
}

export async function fetchNextKitNumber(apiUrl: string): Promise<number> {
  const res = await fetch(`${apiUrl}/kits/next-number`);
  if (!res.ok) throw new Error("Erro ao buscar próximo número do kit");
  const data = await res.json();
  return data.kitNumber as number;
}

export function productMatchesSearch(product: Product, term: string) {
  const haystack = [
    product.name,
    product.code,
    product.sku,
    product.reference,
    product.description,
    product.category?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}
