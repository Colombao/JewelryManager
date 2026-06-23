"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { formatMultiplier, getMarginMultipliers, ProfitMargin } from "@/lib/pricing";
import Button from "../components/Button";
import Modal from "../components/Modal";

export interface CarouselProduct {
  id: number;
  code: string | null;
  sku: string | null;
  reference: string | null;
  name: string;
  description: string | null;
  image: string | null;
  priceLevel1: string | null;
  priceLevel2: string | null;
  priceLevel3: string | null;
  adjustedPrice: string | null;
  category?: { name: string } | null;
}

interface AdjustedPriceCarouselProps {
  open: boolean;
  onClose: () => void;
  products: CarouselProduct[];
  profitMargins: ProfitMargin[];
  apiUrl: string;
  resolveImageUrl: (image: string | null | undefined) => string | null;
  onProductUpdated: (product: CarouselProduct) => void;
}

function hasAdjustedPrice(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return false;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) && n > 0;
}

function formatCurrency(value: string | null | undefined) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseInputPrice(value: string) {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function AdjustedPriceCarousel({
  open,
  onClose,
  products,
  profitMargins,
  apiUrl,
  resolveImageUrl,
  onProductUpdated,
}: AdjustedPriceCarouselProps) {
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const marginMultipliers = useMemo(
    () => getMarginMultipliers(profitMargins),
    [profitMargins]
  );

  const marginLabels = useMemo(() => {
    const byLevel = Object.fromEntries(
      profitMargins.map((m) => [m.level, m.name])
    );
    return {
      level1: byLevel[1] ?? "Nível 1",
      level2: byLevel[2] ?? "Nível 2",
      level3: byLevel[3] ?? "Nível 3",
    };
  }, [profitMargins]);

  const pendingProducts = useMemo(() => {
    const list = showAll
      ? products
      : products.filter((p) => !hasAdjustedPrice(p.adjustedPrice));
    return list;
  }, [products, showAll]);

  const pendingCount = useMemo(
    () => products.filter((p) => !hasAdjustedPrice(p.adjustedPrice)).length,
    [products]
  );

  const current = pendingProducts[index] ?? null;
  const total = pendingProducts.length;

  const syncInputFromProduct = useCallback((product: CarouselProduct | null) => {
    if (!product) {
      setInputValue("");
      return;
    }
    setInputValue(
      hasAdjustedPrice(product.adjustedPrice)
        ? String(product.adjustedPrice).replace(".", ",")
        : ""
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setShowAll(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (index >= total && total > 0) {
      setIndex(total - 1);
      return;
    }
    syncInputFromProduct(current);
  }, [open, index, total, current, syncInputFromProduct]);

  useEffect(() => {
    if (!open || !current) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, current?.id]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (isSaving) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(total - 1, i + 1));
      } else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        void handleSave();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isSaving, total, inputValue, current]);

  async function handleSave() {
    if (!current) return;

    const price = parseInputPrice(inputValue);
    if (price === null) {
      toast.error("Informe um preço ajustado válido");
      inputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/products/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustedPrice: price.toFixed(2) }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar preço ajustado");
      }

      onProductUpdated(data as CarouselProduct);
      toast.success(`Preço salvo — ${current.name}`);

      if (!showAll) {
        const nextTotal = pendingProducts.length - 1;
        if (nextTotal <= 0) {
          onClose();
        } else if (index >= nextTotal) {
          setIndex(nextTotal - 1);
        }
      } else {
        setIndex((i) => Math.min(i + 1, total - 1));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  }

  function applyLevel(value: string | null) {
    if (!value) return;
    const n = parseFloat(String(value).replace(",", "."));
    if (!Number.isFinite(n)) return;
    setInputValue(n.toFixed(2).replace(".", ","));
    inputRef.current?.focus();
  }

  function handleSkip() {
    if (index < total - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      size="2xl"
      title="Ajustar preços"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {total > 0 ? (
              <>
                <span className="font-medium text-slate-800">
                  {index + 1} de {total}
                </span>
                {pendingCount > 0 && !showAll && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {pendingCount} sem preço ajustado
                  </span>
                )}
              </>
            ) : (
              <span className="font-medium text-emerald-700">
                Todos os produtos já têm preço ajustado
              </span>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => {
                setShowAll(e.target.checked);
                setIndex(0);
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Incluir produtos já ajustados
          </label>
        </div>

        {total === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-8 text-center">
            <p className="text-sm text-emerald-800">
              Não há produtos pendentes de preço ajustado.
            </p>
            <Button type="button" variant="secondary" className="mt-4" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : current ? (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col gap-3">
                <div className="relative flex aspect-square max-h-[min(52vh,420px)] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {resolveImageUrl(current.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(current.image) ?? ""}
                      alt={current.name}
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <span className="text-sm text-slate-400">Sem imagem</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={index === 0 || isSaving}
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  >
                    ← Anterior
                  </Button>
                  <div className="flex flex-1 justify-center gap-1.5 overflow-x-auto px-1 py-1">
                    {pendingProducts.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        title={p.name}
                        onClick={() => setIndex(i)}
                        className={`h-2 w-2 shrink-0 rounded-full transition ${
                          i === index
                            ? "bg-blue-600 scale-125"
                            : hasAdjustedPrice(p.adjustedPrice)
                            ? "bg-emerald-300 hover:bg-emerald-400"
                            : "bg-slate-300 hover:bg-slate-400"
                        }`}
                        aria-label={`Produto ${i + 1}: ${p.name}`}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={index >= total - 1 || isSaving}
                    onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                  >
                    Próximo →
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  {current.category?.name && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {current.category.name}
                    </p>
                  )}
                  <h2 className="text-xl font-bold leading-tight text-slate-900">
                    {current.name}
                  </h2>
                  <p className="font-mono text-xs text-slate-500">
                    {[current.code, current.sku, current.reference]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {current.description ? (
                    <p className="text-sm leading-relaxed text-slate-600">
                      {current.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-400">Sem descrição</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Níveis de preço
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(
                      [
                        {
                          key: "level1",
                          label: marginLabels.level1,
                          value: current.priceLevel1,
                          mult: marginMultipliers.level1,
                        },
                        {
                          key: "level2",
                          label: marginLabels.level2,
                          value: current.priceLevel2,
                          mult: marginMultipliers.level2,
                        },
                        {
                          key: "level3",
                          label: marginLabels.level3,
                          value: current.priceLevel3,
                          mult: marginMultipliers.level3,
                        },
                      ] as const
                    ).map((level) => (
                      <button
                        key={level.key}
                        type="button"
                        disabled={!level.value || isSaving}
                        onClick={() => applyLevel(level.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {level.label}
                        </span>
                        <span className="block text-sm font-semibold tabular-nums text-slate-800">
                          {formatCurrency(level.value)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          × {formatMultiplier(level.mult)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Clique em um nível para usar como preço ajustado
                  </p>
                </div>

                <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
                  <label
                    htmlFor="adjusted-price-input"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Preço ajustado unitário
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      R$
                    </span>
                    <input
                      ref={inputRef}
                      id="adjusted-price-input"
                      type="text"
                      inputMode="decimal"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="0,00"
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-lg font-semibold tabular-nums text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  {hasAdjustedPrice(current.adjustedPrice) && (
                    <p className="mt-2 text-xs text-slate-500">
                      Atual: {formatCurrency(current.adjustedPrice)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSaving}
                    onClick={handleSkip}
                  >
                    Pular
                  </Button>
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                  >
                    {isSaving ? "Salvando..." : "Salvar e próximo"}
                  </Button>
                </div>

                <p className="text-center text-[11px] text-slate-400">
                  Atalhos: ← → navegar · Enter salvar
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

export function countProductsWithoutAdjustedPrice(
  products: Pick<CarouselProduct, "adjustedPrice">[]
) {
  return products.filter((p) => !hasAdjustedPrice(p.adjustedPrice)).length;
}
