"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function resolveImageUrl(image: string | null | undefined) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${apiUrl}${image.startsWith("/") ? image : `/${image}`}`;
}

function parsePrice(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function getDisplayPrice(product: Product): number | null {
  return (
    parsePrice(product.adjustedPrice) ??
    parsePrice(product.priceLevel1) ??
    parsePrice(product.priceLevel2) ??
    parsePrice(product.priceLevel3)
  );
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function splitPrice(value: number) {
  const formatted = formatBRL(value);
  const [main, cents] = formatted.split(",");
  return { main, cents: cents ? `,${cents}` : "" };
}

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const res = await fetch(`${apiUrl}/products?active=true`);
        if (!res.ok) throw new Error("Erro ao buscar produtos");
        const list = await res.json();
        setProducts(list);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao buscar produtos");
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      const haystack = [
        p.name,
        p.code,
        p.sku,
        p.description,
        p.category?.name,
        p.collection?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [products, search]);

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-[#ededed] p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-normal text-[#333] mb-1">
                Catálogo de Produtos
              </h1>
              <p className="text-sm text-[#666]">
                Consulta de preços e produtos cadastrados
              </p>
            </div>

            <div className="bg-white rounded-md shadow-sm p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto, código, SKU ou categoria..."
                className="flex-1 px-4 py-2.5 rounded-sm border border-[#e0e0e0] text-[#333] placeholder:text-[#999] focus:outline-none focus:border-[#3483fa]"
              />
              <span className="text-sm text-[#666] whitespace-nowrap">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "produto" : "produtos"}
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-md p-3 animate-pulse"
                  >
                    <div className="aspect-square bg-[#f5f5f5] rounded-sm mb-3" />
                    <div className="h-4 bg-[#f5f5f5] rounded mb-2" />
                    <div className="h-4 bg-[#f5f5f5] rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-md shadow-sm p-12 text-center text-[#666]">
                {search
                  ? "Nenhum produto encontrado para essa busca."
                  : "Nenhum produto ativo cadastrado."}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => {
                  const imageUrl = resolveImageUrl(product.image);
                  const price = getDisplayPrice(product);
                  const priceParts = price !== null ? splitPrice(price) : null;

                  return (
                    <article
                      key={product.id}
                      className="bg-white rounded-md p-3 flex flex-col hover:shadow-md transition-shadow duration-200 cursor-default"
                    >
                      <div className="relative aspect-square mb-3 flex items-center justify-center">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#f5f5f5] rounded-sm flex items-center justify-center text-xs text-[#999]">
                            Sem imagem
                          </div>
                        )}
                        {product.quantity <= 0 && (
                          <span className="absolute top-0 left-0 bg-[#fff159] text-[#333] text-[10px] font-semibold px-2 py-0.5 rounded-sm">
                            Sem estoque
                          </span>
                        )}
                      </div>

                      <h2 className="text-sm text-[#333] leading-snug line-clamp-2 min-h-[2.5rem] mb-2">
                        {product.name}
                      </h2>

                      {product.category?.name && (
                        <p className="text-xs text-[#999] mb-2 truncate">
                          {product.category.name}
                        </p>
                      )}

                      <div className="mt-auto">
                        {priceParts ? (
                          <p className="text-[#333] leading-none">
                            <span className="text-xl font-normal">
                              {priceParts.main}
                            </span>
                            <span className="text-xs align-top">
                              {priceParts.cents}
                            </span>
                          </p>
                        ) : (
                          <p className="text-sm text-[#999]">
                            Preço não informado
                          </p>
                        )}

                        {price !== null && (
                          <p className="text-xs text-[#00a650] mt-1">
                            em até 12x sem juros
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
