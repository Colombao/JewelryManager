"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import MainLayout from "../components/MainLayout";
import RequireAuth from "../components/RequireAuth";
import {
  addDays,
  buildKitFromTrendPayload,
  buildKitAutomatically,
  consumeTrendKitPayload,
  createLineFromKitItem,
  createLineFromProduct,
  createManualLine,
  formatBRL,
  formatDateInput,
  getAvailableCategories,
  getCommissionLabel,
  getCommissionRate,
  groupItemsByCategory,
  lineTotal,
  fetchNextKitNumber,
  parseApiDateInput,
  Product,
  KitLineItem,
  productMatchesSearch,
  resolveImageUrl,
} from "./kitUtils";

const PAYMENT_OPTIONS = [
  { id: "avista", label: "À vista", discount: 0.03 },
  { id: "prazo", label: "À prazo (2x)", discount: 0 },
] as const;

type PaymentId = (typeof PAYMENT_OPTIONS)[number]["id"];

const inputClass =
  "w-full px-3 py-2 rounded-sm border border-[#d9d9d9] text-[#333] text-sm focus:outline-none focus:border-[#b8860b] bg-white";

const labelClass = "block text-xs font-semibold text-[#666] uppercase tracking-wide mb-1";

export default function MontarKit() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingKitId, setEditingKitId] = useState<number | null>(null);

  const [kitNumber, setKitNumber] = useState(11);
  const [issueDate, setIssueDate] = useState(formatDateInput(new Date()));
  const [returnDate, setReturnDate] = useState(
    formatDateInput(addDays(new Date(), 28))
  );
  const [nature, setNature] = useState("Venda");
  const [observations, setObservations] = useState(
    "O não cumprimento da devolução na data prevista está sujeito a cobrança total deste pedido.\nEste documento não tem valor fiscal."
  );

  const [items, setItems] = useState<KitLineItem[]>([]);
  const [search, setSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentId>("avista");
  const [extraItems, setExtraItems] = useState({ showcase: 0, ringHolder: 0, boxes: 0 });
  const [maxKitValue, setMaxKitValue] = useState(1600);
  const [categoryQty, setCategoryQty] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        const editParam =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("edit")
            : null;
        const editId = editParam ? parseInt(editParam, 10) : NaN;
        const isEditing = Number.isFinite(editId) && editId > 0;

        const productsRes = await fetch(`${apiUrl}/products?active=true`);
        if (productsRes.ok) {
          const loadedProducts = await productsRes.json();
          setProducts(loadedProducts);

          const trendPayload = consumeTrendKitPayload();
          if (trendPayload && !isEditing) {
            const result = buildKitFromTrendPayload(
              loadedProducts,
              trendPayload,
              trendPayload.maxKitValue ?? 1600
            );

            if (result.items.length > 0) {
              setItems(result.items);
              if (trendPayload.maxKitValue) {
                setMaxKitValue(trendPayload.maxKitValue);
              }

              setCategoryQty((prev) => {
                const next = { ...prev };
                for (const category of trendPayload.categories) {
                  next[category] = Math.max(next[category] ?? 0, 1);
                }
                return next;
              });

              toast.success(
                `Kit sugerido pela tendência "${trendPayload.trendName}"`
              );
            }

            for (const warning of result.warnings) {
              toast(warning, { icon: "⚠️" });
            }
          }
        }

        if (isEditing) {
          const kitRes = await fetch(`${apiUrl}/kits/${editId}`);
          if (!kitRes.ok) throw new Error("Kit não encontrado");

          const kit = await kitRes.json();
          setEditingKitId(kit.id);
          setKitNumber(kit.kitNumber);
          setIssueDate(parseApiDateInput(kit.issueDate));
          setReturnDate(parseApiDateInput(kit.returnDate));
          setNature(kit.nature || "Venda");
          setObservations(kit.observations || "");
          setPaymentType(kit.paymentType === "prazo" ? "prazo" : "avista");
          setExtraItems({
            showcase: parseFloat(String(kit.extrasShowcase)) || 0,
            ringHolder: parseFloat(String(kit.extrasRingHolder)) || 0,
            boxes: kit.extrasBoxes || 0,
          });
          setItems(
            (kit.items ?? []).map((item: Parameters<typeof createLineFromKitItem>[0]) =>
              createLineFromKitItem(item)
            )
          );
        } else {
          const kitNumberRes = await fetch(`${apiUrl}/kits/next-number`);
          if (kitNumberRes.ok) {
            const data = await kitNumberRes.json();
            setKitNumber(data.kitNumber);
          } else {
            const next = await fetchNextKitNumber(apiUrl);
            setKitNumber(next);
          }
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar dados do kit"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [apiUrl]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products.slice(0, 24);
    return products.filter((p) => productMatchesSearch(p, term)).slice(0, 48);
  }, [products, search]);

  const availableCategories = useMemo(
    () => getAvailableCategories(products),
    [products]
  );

  const autoRulesPreview = useMemo(
    () =>
      availableCategories
        .filter((category) => (categoryQty[category] ?? 0) > 0)
        .map((category) => ({
          category,
          quantity: categoryQty[category] ?? 0,
        })),
    [availableCategories, categoryQty]
  );

  const autoRequestedQty = useMemo(
    () => autoRulesPreview.reduce((sum, rule) => sum + rule.quantity, 0),
    [autoRulesPreview]
  );

  const groups = useMemo(() => groupItemsByCategory(items), [items]);

  const productsSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + lineTotal(item), 0),
    [items]
  );

  const extrasTotal = useMemo(
    () => extraItems.showcase + extraItems.ringHolder + extraItems.boxes * 3,
    [extraItems]
  );

  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const grandTotal = productsSubtotal + extrasTotal;
  const commissionRate = getCommissionRate(grandTotal);
  const commissionValue = grandTotal * commissionRate;
  const paymentDiscount =
    PAYMENT_OPTIONS.find((p) => p.id === paymentType)?.discount ?? 0;
  const discountValue = grandTotal * paymentDiscount;
  const finalTotal = grandTotal - discountValue;

  function toggleCategory(category: string, enabled: boolean) {
    setCategoryQty((prev) => {
      const next = { ...prev };
      if (enabled) {
        next[category] = prev[category] > 0 ? prev[category] : 1;
      } else {
        next[category] = 0;
      }
      return next;
    });
  }

  function setCategoryQuantity(category: string, quantity: number) {
    setCategoryQty((prev) => ({
      ...prev,
      [category]: Math.max(0, quantity),
    }));
  }

  function handleAutoGenerate(replaceExisting: boolean) {
    if (autoRulesPreview.length === 0) {
      toast.error("Selecione pelo menos um tipo com quantidade");
      return;
    }

    const result = buildKitAutomatically(
      products,
      autoRulesPreview,
      maxKitValue
    );

    if (result.items.length === 0) {
      toast.error(result.warnings[0] || "Não foi possível montar o kit");
      return;
    }

    setItems((prev) =>
      replaceExisting ? result.items : [...prev, ...result.items]
    );

    for (const warning of result.warnings) {
      toast(warning, { icon: "⚠️" });
    }

    toast.success(
      `Kit montado: ${result.items.length} peça(s) — ${formatBRL(result.total)}`
    );
  }

  function handleAutoGenerateClick() {
    if (items.length > 0) {
      const replace = confirm(
        "O kit já tem itens. OK = substituir tudo | Cancelar = adicionar aos existentes"
      );
      handleAutoGenerate(replace);
      return;
    }

    handleAutoGenerate(true);
  }

  function addProduct(product: Product) {
    setItems((prev) => [...prev, createLineFromProduct(product)]);
    toast.success(`${product.name} adicionado ao kit`);
    setSearch("");
    setShowCatalog(false);
  }

  function addProductByReference() {
    const term = search.trim().toUpperCase();
    if (!term) {
      toast.error("Digite uma referência ou nome do produto");
      searchRef.current?.focus();
      return;
    }

    const exact = products.find(
      (p) =>
        p.code?.toUpperCase() === term ||
        p.reference?.toUpperCase() === term ||
        p.sku?.toUpperCase() === term
    );

    if (exact) {
      addProduct(exact);
      return;
    }

    const matches = products.filter((p) => productMatchesSearch(p, term.toLowerCase()));
    if (matches.length === 1) {
      addProduct(matches[0]);
      return;
    }

    if (matches.length > 1) {
      setShowCatalog(true);
      toast("Vários produtos encontrados — selecione na lista", { icon: "🔍" });
      return;
    }

    setItems((prev) => [
      ...prev,
      createManualLine(term, term, "OUTROS", 0),
    ]);
    toast("Referência adicionada manualmente — informe preço e categoria", {
      icon: "✏️",
    });
    setSearch("");
  }

  function updateItem(id: string, patch: Partial<KitLineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addProductByReference();
    }
  }

  async function handleSave() {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um produto ao kit");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        kitNumber,
        nature,
        issueDate,
        returnDate,
        paymentType,
        observations,
        items,
        extras: extraItems,
        totals: {
          totalQty,
          productsSubtotal,
          extrasTotal,
          grandTotal,
          commissionRate,
          commissionValue,
          paymentDiscount,
          discountValue,
          finalTotal,
        },
      };

      const url = editingKitId
        ? `${apiUrl}/kits/${editingKitId}`
        : `${apiUrl}/kits`;
      const method = editingKitId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            (editingKitId ? "Erro ao atualizar kit" : "Erro ao salvar kit")
        );
      }

      toast.success(
        editingKitId
          ? `Kit ${data.kitNumber} atualizado com sucesso!`
          : `Kit ${data.kitNumber} salvo com sucesso!`
      );

      if (editingKitId) {
        router.push("/kits");
        return;
      }

      const nextNumber = await fetchNextKitNumber(apiUrl);
      setKitNumber(nextNumber);
      setItems([]);
      setExtraItems({ showcase: 0, ringHolder: 0, boxes: 0 });
      setIssueDate(formatDateInput(new Date()));
      setReturnDate(formatDateInput(addDays(new Date(), 28)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar kit");
    } finally {
      setIsSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-[#f0f0f0] print:bg-white">
          <style jsx global>{`
            @media print {
              aside,
              .no-print {
                display: none !important;
              }
              main {
                margin-left: 0 !important;
              }
              .kit-document {
                box-shadow: none !important;
                border: none !important;
              }
            }
          `}</style>

          {/* Toolbar */}
          <div className="no-print sticky top-14 lg:top-0 z-20 bg-white border-b border-[#e0e0e0] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-[#222]">
                {editingKitId ? `Editar Kit #${kitNumber}` : "Montar Kit"}
              </h1>
              <p className="text-sm text-[#666]">
                {editingKitId
                  ? "Altere os itens e salve — a revendedora continua vinculada no Fluxo"
                  : "Monte o kit com os produtos — a revendedora é vinculada depois no Fluxo"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editingKitId && (
                <Link
                  href="/kits"
                  className="px-4 py-2 text-sm border border-[#d9d9d9] rounded-sm hover:bg-[#fafafa] text-[#333]"
                >
                  Voltar
                </Link>
              )}
              <button
                type="button"
                onClick={() => setShowCatalog((v) => !v)}
                className="px-4 py-2 text-sm border border-[#d9d9d9] rounded-sm hover:bg-[#fafafa] text-[#333]"
              >
                {showCatalog ? "Fechar catálogo" : "Abrir catálogo"}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 text-sm border border-[#d9d9d9] rounded-sm hover:bg-[#fafafa] text-[#333]"
              >
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 text-sm font-medium rounded-sm bg-[#b8860b] hover:bg-[#9a7209] text-white disabled:opacity-60"
              >
                {isSaving
                  ? "Salvando..."
                  : editingKitId
                  ? "Salvar alterações"
                  : "Salvar kit"}
              </button>
            </div>
          </div>

          <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
              {/* Document */}
              <div className="kit-document bg-white rounded-md shadow-sm border border-[#e8e8e8] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] text-white px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[#d4af37] text-xs font-semibold tracking-[0.2em] uppercase">
                        Empodere
                      </p>
                      <h2 className="text-2xl font-light tracking-wide">
                        Semi Joias
                      </h2>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        <span className="text-[#aaa]">Nº do KIT:</span>{" "}
                        <span className="font-bold text-[#d4af37] text-lg">
                          {kitNumber}
                        </span>
                      </p>
                      <p className="text-[#ccc] mt-1">{nature}</p>
                    </div>
                  </div>
                </div>

                {/* Meta fields */}
                <div className="px-6 py-5 border-b border-[#eee] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Natureza</label>
                    <select
                      value={nature}
                      onChange={(e) => setNature(e.target.value)}
                      className={inputClass}
                    >
                      <option value="Venda">Venda</option>
                      <option value="Consignação">Consignação</option>
                      <option value="Troca">Troca</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Data da emissão</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Data da devolução</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Product search bar */}
                <div className="no-print px-6 py-4 bg-[#faf8f5] border-b border-[#eee]">
                  <label className={labelClass}>
                    Adicionar produto por referência
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={searchRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite AN14, BR18, nome... e pressione Enter"
                      className={`${inputClass} flex-1`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={addProductByReference}
                      className="px-4 py-2 bg-[#333] text-white text-sm rounded-sm hover:bg-[#111] whitespace-nowrap"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Catalog panel */}
                {showCatalog && (
                  <div className="no-print px-6 py-4 border-b border-[#eee] bg-[#fcfcfc]">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar no catálogo..."
                        className={`${inputClass} max-w-md`}
                      />
                      <span className="text-xs text-[#888]">
                        {filteredProducts.length} produtos
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                      {filteredProducts.map((product) => {
                        const imageUrl = resolveImageUrl(product.image);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="text-left p-2 border border-[#eee] rounded-sm hover:border-[#b8860b] hover:shadow-sm bg-white transition"
                          >
                            <div className="aspect-square mb-2 bg-[#f5f5f5] flex items-center justify-center overflow-hidden rounded-sm">
                              {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imageUrl}
                                  alt={product.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <span className="text-[10px] text-[#999]">Sem foto</span>
                              )}
                            </div>
                            <p className="text-[10px] font-semibold text-[#b8860b]">
                              {product.code || product.reference || product.sku}
                            </p>
                            <p className="text-xs text-[#333] line-clamp-2 leading-tight">
                              {product.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items table */}
                <div className="px-4 sm:px-6 py-4 overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b-2 border-[#333] text-left">
                        <th className="py-2 pr-3 font-semibold text-[#333] w-[90px]">
                          Referência
                        </th>
                        <th className="py-2 pr-3 font-semibold text-[#333]">
                          Descrição
                        </th>
                        <th className="py-2 px-2 font-semibold text-[#333] w-[70px] text-center">
                          Qtd.
                        </th>
                        <th className="py-2 px-2 font-semibold text-[#333] w-[110px] text-right">
                          Valor unit.
                        </th>
                        <th className="py-2 pl-2 font-semibold text-[#333] w-[110px] text-right">
                          Total
                        </th>
                        <th className="no-print py-2 w-[40px]" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#999]">
                            Carregando produtos...
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#999]">
                            Nenhum item no kit. Use a busca acima ou abra o catálogo.
                          </td>
                        </tr>
                      ) : (
                        groups.map((group) => (
                          <Fragment key={group.category}>
                            {group.items.map((item) => (
                              <tr
                                key={item.id}
                                className="border-b border-[#f0f0f0] hover:bg-[#fafafa]"
                              >
                                <td className="py-2 pr-3 font-mono text-xs text-[#555]">
                                  {item.reference}
                                </td>
                                <td className="py-2 pr-3 text-[#333]">
                                  {item.description}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateItem(item.id, {
                                        quantity: Math.max(
                                          1,
                                          parseInt(e.target.value, 10) || 1
                                        ),
                                      })
                                    }
                                    className="w-14 px-1 py-1 text-center border border-[#ddd] rounded-sm text-sm"
                                  />
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      updateItem(item.id, {
                                        unitPrice: Math.max(
                                          0,
                                          parseFloat(e.target.value) || 0
                                        ),
                                      })
                                    }
                                    className="w-24 px-1 py-1 text-right border border-[#ddd] rounded-sm text-sm"
                                  />
                                </td>
                                <td className="py-2 pl-2 text-right font-medium text-[#333]">
                                  {formatBRL(lineTotal(item))}
                                </td>
                                <td className="no-print py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="text-[#999] hover:text-red-600 text-lg leading-none"
                                    title="Remover"
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-[#f7f7f7] font-semibold text-[#444]">
                              <td colSpan={2} className="py-2 pr-3 italic">
                                Total — {group.category}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {group.totalQty}
                              </td>
                              <td />
                              <td className="py-2 pl-2 text-right text-[#b8860b]">
                                {formatBRL(group.totalValue)}
                              </td>
                              <td />
                            </tr>
                            <tr>
                              <td colSpan={6} className="h-2" />
                            </tr>
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Extras like Excel */}
                <div className="px-6 pb-4 border-t border-[#eee] pt-4">
                  <p className="text-xs font-semibold text-[#666] uppercase mb-3">
                    Itens complementares
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center justify-between gap-3 p-3 border border-[#eee] rounded-sm">
                      <span className="text-sm text-[#333]">Mostruário e bolsa</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={extraItems.showcase || ""}
                        onChange={(e) =>
                          setExtraItems((prev) => ({
                            ...prev,
                            showcase: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-24 px-2 py-1 text-right border border-[#ddd] rounded-sm text-sm"
                        placeholder="129"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 p-3 border border-[#eee] rounded-sm">
                      <span className="text-sm text-[#333]">Aneleira</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={extraItems.ringHolder || ""}
                        onChange={(e) =>
                          setExtraItems((prev) => ({
                            ...prev,
                            ringHolder: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-24 px-2 py-1 text-right border border-[#ddd] rounded-sm text-sm"
                        placeholder="20"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 p-3 border border-[#eee] rounded-sm">
                      <span className="text-sm text-[#333]">Caixinhas (R$ 3/un)</span>
                      <input
                        type="number"
                        min={0}
                        value={extraItems.boxes || ""}
                        onChange={(e) =>
                          setExtraItems((prev) => ({
                            ...prev,
                            boxes: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-24 px-2 py-1 text-right border border-[#ddd] rounded-sm text-sm"
                        placeholder="4"
                      />
                    </label>
                  </div>
                </div>

                {/* Totals block */}
                <div className="px-6 py-5 bg-[#faf8f5] border-t border-[#eee]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg ml-auto">
                    <div className="flex justify-between text-sm text-[#555]">
                      <span>Total (produtos)</span>
                      <span>
                        {totalQty} peças — {formatBRL(productsSubtotal)}
                      </span>
                    </div>
                    {extrasTotal > 0 && (
                      <div className="flex justify-between text-sm text-[#555]">
                        <span>Complementos</span>
                        <span>{formatBRL(extrasTotal)}</span>
                      </div>
                    )}
                    <div className="sm:col-span-2 flex justify-between text-base font-bold text-[#222] border-t border-[#ddd] pt-3">
                      <span>Total geral</span>
                      <span className="text-[#b8860b]">{formatBRL(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div className="px-6 py-4 border-t border-[#eee]">
                  <label className={labelClass}>Observações</label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              {/* Sidebar summary */}
              <div className="space-y-4">
                <div className="no-print bg-white rounded-md shadow-sm border border-[#e8e8e8] p-5">
                  <h3 className="text-sm font-semibold text-[#333] mb-1 uppercase tracking-wide">
                    Montagem automática
                  </h3>
                  <p className="text-xs text-[#888] mb-4">
                    Escolha os tipos, quantidades por tipo e o valor máximo. Depois
                    ajuste livremente na tabela.
                  </p>

                  <div className="mb-4">
                    <label className={labelClass}>Valor máximo do kit (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={maxKitValue || ""}
                      onChange={(e) =>
                        setMaxKitValue(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className={inputClass}
                      placeholder="1600"
                    />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelClass}>Tipos de produto</label>
                      <span className="text-[10px] text-[#999]">
                        {autoRulesPreview.length} tipo(s) · {autoRequestedQty} peça(s)
                      </span>
                    </div>

                    {isLoading ? (
                      <p className="text-xs text-[#999]">Carregando categorias...</p>
                    ) : availableCategories.length === 0 ? (
                      <p className="text-xs text-[#999]">
                        Nenhuma categoria encontrada nos produtos.
                      </p>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {availableCategories.map((category) => {
                          const qty = categoryQty[category] ?? 0;
                          const enabled = qty > 0;

                          return (
                            <div
                              key={category}
                              className={`flex items-center gap-2 p-2 rounded-sm border ${
                                enabled
                                  ? "border-[#b8860b] bg-[#faf8f5]"
                                  : "border-[#eee]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) =>
                                  toggleCategory(category, e.target.checked)
                                }
                                className="accent-[#b8860b]"
                              />
                              <span
                                className="flex-1 text-xs text-[#333] leading-tight"
                                title={category}
                              >
                                {category}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={enabled ? qty : ""}
                                disabled={!enabled}
                                onChange={(e) =>
                                  setCategoryQuantity(
                                    category,
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                className="w-14 px-1 py-1 text-center border border-[#ddd] rounded-sm text-xs disabled:bg-[#f5f5f5]"
                                placeholder="Qtd"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoGenerateClick}
                    disabled={isLoading || autoRulesPreview.length === 0}
                    className="w-full px-4 py-2 text-sm font-medium rounded-sm bg-[#333] hover:bg-[#111] text-white disabled:opacity-50"
                  >
                    Montar kit automaticamente
                  </button>
                </div>

                <div className="bg-white rounded-md shadow-sm border border-[#e8e8e8] p-5 sticky top-[72px]">
                  <h3 className="text-sm font-semibold text-[#333] mb-4 uppercase tracking-wide">
                    Resumo do kit
                  </h3>

                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#666]">Peças</span>
                      <span className="font-medium">{totalQty}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#666]">Categorias</span>
                      <span className="font-medium">{groups.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#666]">Subtotal produtos</span>
                      <span className="font-medium">{formatBRL(productsSubtotal)}</span>
                    </div>
                    {extrasTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#666]">Complementos</span>
                        <span className="font-medium">{formatBRL(extrasTotal)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#1a1a1a] text-white rounded-md p-4 mb-5">
                    <p className="text-xs text-[#aaa] mb-1">Total geral</p>
                    <p className="text-2xl font-light text-[#d4af37]">
                      {formatBRL(grandTotal)}
                    </p>
                  </div>

                  <div className="border-t border-[#eee] pt-4 mb-4">
                    <p className="text-xs font-semibold text-[#666] uppercase mb-2">
                      Comissionamento
                    </p>
                    <p className="text-xs text-[#888] mb-1">{getCommissionLabel(grandTotal)}</p>
                    <div className="flex justify-between text-sm">
                      <span>{(commissionRate * 100).toFixed(0)}%</span>
                      <span className="font-semibold text-[#00a650]">
                        {formatBRL(commissionValue)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[#eee] pt-4 mb-4">
                    <p className="text-xs font-semibold text-[#666] uppercase mb-2">
                      Forma de pagamento
                    </p>
                    <div className="space-y-2">
                      {PAYMENT_OPTIONS.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center gap-2 p-2 rounded-sm border cursor-pointer text-sm ${
                            paymentType === option.id
                              ? "border-[#b8860b] bg-[#faf8f5]"
                              : "border-[#eee]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentType"
                            checked={paymentType === option.id}
                            onChange={() => setPaymentType(option.id)}
                            className="accent-[#b8860b]"
                          />
                          <span className="flex-1">{option.label}</span>
                          {option.discount > 0 && (
                            <span className="text-xs text-[#00a650]">
                              -{(option.discount * 100).toFixed(0)}%
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    {discountValue > 0 && (
                      <p className="text-xs text-[#00a650] mt-2">
                        Desconto: {formatBRL(discountValue)}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[#eee] pt-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-[#666]">Valor final</span>
                      <span className="text-xl font-bold text-[#333]">
                        {formatBRL(finalTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-md shadow-sm border border-[#e8e8e8] p-5 text-xs text-[#666] leading-relaxed">
                  <p className="font-semibold text-[#333] mb-2 uppercase tracking-wide">
                    Garantia e cuidados
                  </p>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>Garantia de 6 meses com termo assinado</li>
                    <li>Evite álcool gel, perfume e banho com as peças</li>
                    <li>Cuidado ao manusear correntes e brincos</li>
                    <li>Não retire etiquetas antes de finalizar a venda</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
