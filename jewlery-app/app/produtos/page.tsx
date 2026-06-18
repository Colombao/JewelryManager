"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";
import {
  formatBRL,
  parsePrice,
  resolveImageUrl,
} from "@/app/kit/kitUtils";
import MainLayout from "../components/MainLayout";
import RequireAuth from "../components/RequireAuth";

interface NamedItem {
  id: number;
  name: string;
}

interface Product {
  id: number;
  code: string | null;
  sku: string | null;
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
  collection?: NamedItem | null;
}

interface ProductKitInfo {
  id: number;
  kitNumber: number;
  status: string;
  resellerName: string | null;
  card: { id: number; title: string } | null;
  quantity: number;
}

type KitsUsageMap = Record<string, ProductKitInfo[]>;

function formatPriceValue(value: string | null | undefined) {
  const n = parsePrice(value);
  return n !== null ? formatBRL(n) : "—";
}

function getKitStatusLabel(kit: Pick<ProductKitInfo, "card" | "status">) {
  if (kit.card) return "No fluxo";
  if (kit.status === "montado") return "Montado";
  if (kit.status === "finalizado") return "Finalizado";
  if (kit.status === "vinculado") return "Vinculado";
  return kit.status;
}

function getKitStatusClass(kit: Pick<ProductKitInfo, "card" | "status">) {
  if (kit.card) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (kit.status === "finalizado") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function StockBadge({ quantity }: { quantity: number }) {
  const outOfStock = quantity <= 0;
  const lowStock = quantity > 0 && quantity <= 5;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        outOfStock
          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
          : lowStock
            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      }`}
    >
      <span className="uppercase tracking-wide text-[9px] opacity-70">Qtd</span>
      {outOfStock ? "0" : quantity}
    </span>
  );
}

function PriceRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  const formatted = formatPriceValue(value);
  const hasValue = parsePrice(value) !== null;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs ${
        highlight ? "bg-slate-900 text-white rounded-md" : ""
      }`}
    >
      <span
        className={
          highlight
            ? "font-medium text-slate-300"
            : "font-medium text-slate-500"
        }
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          hasValue
            ? highlight
              ? "font-semibold text-white"
              : "font-semibold text-slate-900"
            : "text-slate-400"
        }`}
      >
        {formatted}
      </span>
    </div>
  );
}

function KitBadges({
  kits,
  compact = false,
}: {
  kits: ProductKitInfo[];
  compact?: boolean;
}) {
  if (kits.length === 0) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {kits.length === 1 ? "Kit" : `Kits (${kits.length})`}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {kits.map((kit) => {
          const canEdit = !kit.card && kit.status === "montado";
          const badge = (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ring-1 ${getKitStatusClass(kit)} ${
                canEdit ? "transition hover:opacity-80" : ""
              }`}
            >
              <span className="font-semibold">#{kit.kitNumber}</span>
              <span className="opacity-70">·</span>
              <span>{getKitStatusLabel(kit)}</span>
              {kit.quantity > 1 && (
                <>
                  <span className="opacity-70">·</span>
                  <span>{kit.quantity} un.</span>
                </>
              )}
            </span>
          );

          if (canEdit) {
            return (
              <Link
                key={kit.id}
                href={`/kit?edit=${kit.id}`}
                title={`Abrir kit #${kit.kitNumber}`}
                className="no-underline"
              >
                {badge}
              </Link>
            );
          }

          return (
            <span key={kit.id} title={kit.resellerName ?? undefined}>
              {badge}
            </span>
          );
        })}
      </div>
      {!compact && kits.some((k) => k.resellerName) && (
        <p className="text-[11px] text-slate-400">
          {kits
            .filter((k) => k.resellerName)
            .map((k) => `#${k.kitNumber}: ${k.resellerName}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function ImageLightbox({
  product,
  kits,
  onClose,
}: {
  product: Product;
  kits: ProductKitInfo[];
  onClose: () => void;
}) {
  const imageUrl = resolveImageUrl(product.image);
  const meta = [product.code, product.sku].filter(Boolean).join(" · ");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Visualizar ${product.name}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar visualização"
      />

      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 text-white">
            <p className="truncate text-lg font-semibold">{product.name}</p>
            {meta && (
              <p className="truncate font-mono text-sm text-slate-400">{meta}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-h-[50vh] flex-1 items-center justify-center rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={product.name}
                className="max-h-[70vh] max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-slate-400">Sem imagem disponível</p>
            )}
          </div>

          <div className="w-full shrink-0 space-y-4 rounded-2xl bg-white p-4 shadow-xl lg:w-72">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Estoque</span>
              <StockBadge quantity={product.quantity} />
            </div>

            <div className="space-y-0.5 rounded-lg border border-slate-100 bg-slate-50/80 p-1">
              <PriceRow label="Nvl 1" value={product.priceLevel1} />
              <PriceRow label="Nvl 2" value={product.priceLevel2} />
              <PriceRow label="Nvl 3" value={product.priceLevel3} />
            </div>

            {kits.length > 0 ? (
              <KitBadges kits={kits} />
            ) : (
              <p className="text-xs text-slate-400">
                Este produto não está em nenhum kit.
              </p>
            )}

            <Link
              href="/kits"
              className="block text-center text-xs font-medium text-slate-500 transition hover:text-slate-800"
            >
              Ver todos os kits →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  kits,
  onImageClick,
}: {
  product: Product;
  kits: ProductKitInfo[];
  onImageClick: () => void;
}) {
  const imageUrl = resolveImageUrl(product.image);
  const adjusted = parsePrice(product.adjustedPrice);
  const hasAdjusted =
    adjusted !== null &&
    adjusted !== parsePrice(product.priceLevel1) &&
    adjusted !== parsePrice(product.priceLevel2) &&
    adjusted !== parsePrice(product.priceLevel3);

  const meta = [product.code, product.sku].filter(Boolean).join(" · ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <button
        type="button"
        onClick={onImageClick}
        disabled={!imageUrl}
        className={`relative aspect-square bg-slate-50 p-4 text-left ${
          imageUrl
            ? "cursor-zoom-in transition-colors hover:bg-slate-100/80"
            : "cursor-default"
        }`}
        aria-label={imageUrl ? `Ampliar imagem de ${product.name}` : undefined}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="pointer-events-none h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
            Sem imagem
          </div>
        )}

        {imageUrl && (
          <span className="absolute bottom-2.5 right-2.5 rounded-md bg-slate-900/70 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
            Ampliar
          </span>
        )}

        <div className="absolute left-2.5 top-2.5">
          <StockBadge quantity={product.quantity} />
        </div>

        {product.quantity <= 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Sem estoque
            </span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="space-y-1">
          {product.category?.name && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {product.category.name}
            </p>
          )}
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
            {product.name}
          </h2>
          {meta && (
            <p className="truncate font-mono text-[11px] text-slate-400">
              {meta}
            </p>
          )}
        </div>

        <div className="space-y-0.5 rounded-lg border border-slate-100 bg-slate-50/80 p-1">
          <PriceRow label="Nvl 1" value={product.priceLevel1} />
          <PriceRow label="Nvl 2" value={product.priceLevel2} />
          <PriceRow label="Nvl 3" value={product.priceLevel3} />
          {hasAdjusted && (
            <PriceRow
              label="Ajustado"
              value={product.adjustedPrice}
              highlight
            />
          )}
        </div>

        <KitBadges kits={kits} compact />
      </div>
    </article>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="space-y-2 p-3.5">
        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 space-y-1.5 rounded-lg border border-slate-100 p-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [kitsByProduct, setKitsByProduct] = useState<KitsUsageMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const closePreview = useCallback(() => setPreviewProduct(null), []);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [productsRes, kitsRes] = await Promise.all([
          fetch(`${apiUrl}/products?active=true`),
          fetch(`${apiUrl}/products/kits-usage`),
        ]);

        if (!productsRes.ok) throw new Error("Erro ao buscar produtos");
        if (!kitsRes.ok) throw new Error("Erro ao buscar kits dos produtos");

        const [list, kitsMap] = await Promise.all([
          productsRes.json(),
          kitsRes.json(),
        ]);

        setProducts(list);
        setKitsByProduct(kitsMap);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao buscar produtos");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      const kits = kitsByProduct[String(p.id)] ?? [];
      const haystack = [
        p.name,
        p.code,
        p.sku,
        p.description,
        p.category?.name,
        p.collection?.name,
        ...kits.map((k) => `#${k.kitNumber}`),
        ...kits.map((k) => k.resellerName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [products, search, kitsByProduct]);

  const inStockCount = filteredProducts.filter((p) => p.quantity > 0).length;
  const inKitCount = filteredProducts.filter(
    (p) => (kitsByProduct[String(p.id)]?.length ?? 0) > 0
  ).length;

  const previewKits = previewProduct
    ? kitsByProduct[String(previewProduct.id)] ?? []
    : [];

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Catálogo de Produtos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Consulta de estoque, preços por nível e kits vinculados
              </p>
            </div>

            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                  />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto, código, SKU, categoria ou kit..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>
                  <strong className="font-semibold text-slate-900">
                    {filteredProducts.length}
                  </strong>{" "}
                  {filteredProducts.length === 1 ? "produto" : "produtos"}
                </span>
                <span className="hidden h-4 w-px bg-slate-200 sm:block" />
                <span className="hidden sm:inline">
                  <strong className="font-semibold text-emerald-700">
                    {inStockCount}
                  </strong>{" "}
                  em estoque
                </span>
                <span className="hidden h-4 w-px bg-slate-200 lg:block" />
                <span className="hidden lg:inline">
                  <strong className="font-semibold text-blue-700">
                    {inKitCount}
                  </strong>{" "}
                  em kits
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <p className="text-sm text-slate-500">
                  {search
                    ? "Nenhum produto encontrado para essa busca."
                    : "Nenhum produto ativo cadastrado."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    kits={kitsByProduct[String(product.id)] ?? []}
                    onImageClick={() => setPreviewProduct(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {previewProduct && (
          <ImageLightbox
            product={previewProduct}
            kits={previewKits}
            onClose={closePreview}
          />
        )}
      </MainLayout>
    </RequireAuth>
  );
}
