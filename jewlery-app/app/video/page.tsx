"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import toast from "react-hot-toast";
import { FaVideo } from "react-icons/fa";
import { useAuth } from "@/app/contexts/AuthContext";
import type { Product } from "@/app/kit/kitUtils";
import MainLayout from "@/app/components/MainLayout";
import RequireAuth from "@/app/components/RequireAuth";
import Button from "@/app/components/Button";
import { apiUrl } from "@/lib/api";
import {
  catalogDurationInFrames,
  productToSlide,
  type ProductCatalogProps,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "@/lib/videoCatalog";
import { ProductCatalogVideo } from "@/remotion/ProductCatalogVideo";

const Player = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  { ssr: false, loading: () => <PlayerSkeleton /> }
);

function PlayerSkeleton() {
  return (
    <div className="flex aspect-[9/16] w-full max-w-sm items-center justify-center rounded-xl bg-slate-900 text-sm text-slate-400">
      Carregando preview...
    </div>
  );
}

export default function VideoPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [brandName, setBrandName] = useState("Jewlery");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const res = await fetch(`${apiUrl}/products?active=true`);
        if (!res.ok) throw new Error("Erro ao buscar produtos");
        const list: Product[] = await res.json();
        setProducts(list);
        setSelectedIds(new Set(list.slice(0, 6).map((p) => p.id)));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar produtos");
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      [p.name, p.code, p.sku, p.category?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  );

  const inputProps = useMemo(
    () => ({
      brandName,
      products: selectedProducts.map(productToSlide),
    }),
    [brandName, selectedProducts]
  );

  const durationInFrames = catalogDurationInFrames(selectedProducts.length);

  const toggleProduct = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  }, [filteredProducts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exportVideo = useCallback(async () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecione ao menos um produto");
      return;
    }
    if (!token) {
      toast.error("Faça login para exportar o vídeo");
      return;
    }

    setIsExporting(true);
    toast.loading("Gerando MP4... a primeira exportação pode demorar alguns minutos", {
      id: "video-export",
    });

    try {
      const response = await fetch("/api/video/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inputProps),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Falha ao exportar o vídeo");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `catalogo-${Date.now()}.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      toast.success("Vídeo exportado com sucesso", { id: "video-export" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao exportar o vídeo",
        { id: "video-export" }
      );
    } finally {
      setIsExporting(false);
    }
  }, [inputProps, selectedProducts.length, token]);

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <FaVideo />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Gerar vídeo do catálogo
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Preview com produtos reais do sistema — formato vertical (Stories/Reels)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nome da marca no vídeo
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Produtos no vídeo
                      </h2>
                      <p className="text-xs text-slate-500">
                        {selectedProducts.length} selecionado
                        {selectedProducts.length === 1 ? "" : "s"} · ~
                        {Math.round(durationInFrames / VIDEO_FPS)}s
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Selecionar visíveis
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto..."
                    className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />

                  {isLoading ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Carregando produtos...
                    </p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Nenhum produto ativo encontrado.
                    </p>
                  ) : (
                    <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {filteredProducts.map((product) => {
                        const checked = selectedIds.has(product.id);
                        const slide = productToSlide(product);
                        return (
                          <li key={product.id}>
                            <label
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                                checked
                                  ? "border-blue-300 bg-blue-50/60"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(product.id)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {product.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {slide.price}
                                  {product.category?.name
                                    ? ` · ${product.category.name}`
                                    : ""}
                                </p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Exportar MP4
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Gere o arquivo de vídeo com os produtos selecionados.
                  </p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={exportVideo}
                      disabled={selectedProducts.length === 0 || isExporting}
                    >
                      {isExporting ? "Exportando..." : "Exportar MP4"}
                    </Button>
                  </div>
                  {isExporting && (
                    <p className="mt-3 text-xs text-amber-700">
                      Renderizando frames e montando o vídeo. Não feche esta página.
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-slate-900">
                    Preview
                  </h2>
                  {selectedProducts.length === 0 ? (
                    <div className="flex aspect-[9/16] items-center justify-center rounded-xl bg-slate-900 text-center text-sm text-slate-400">
                      Selecione produtos para ver o preview
                    </div>
                  ) : (
                    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-slate-900 shadow-lg">
                      <Player
                        component={
                          ProductCatalogVideo as unknown as ComponentType<
                            Record<string, unknown>
                          >
                        }
                        inputProps={inputProps}
                        durationInFrames={durationInFrames}
                        fps={VIDEO_FPS}
                        compositionWidth={VIDEO_WIDTH}
                        compositionHeight={VIDEO_HEIGHT}
                        controls
                        loop
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
