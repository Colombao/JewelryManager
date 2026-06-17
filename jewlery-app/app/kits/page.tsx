"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";
import { apiUrl } from "@/lib/api";
import Button from "../components/Button";
import DataTable, { DataTableColumn } from "../components/DataTable";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";
import TableActions from "../components/TableActions";
import {
  createLineFromKitItem,
  formatBRL,
  getCommissionLabel,
  groupItemsByCategory,
  KitLineItem,
} from "../kit/kitUtils";

interface KitSummary {
  id: number;
  kitNumber: number;
  nature: string;
  issueDate: string;
  returnDate: string;
  status: string;
  paymentType: string;
  totalQty: number;
  grandTotal: string;
  finalTotal: string;
  commissionValue: string;
  reseller: { id: number; name: string } | null;
  card: { id: number; title: string } | null;
  _count: { items: number };
}

interface KitDetail extends Omit<KitSummary, "_count"> {
  observations: string | null;
  extrasShowcase: string;
  extrasRingHolder: string;
  extrasBoxes: number;
  productsSubtotal: string;
  extrasTotal: string;
  commissionRate: string;
  paymentDiscount: string;
  discountValue: string;
  items: {
    id: number;
    productId?: number | null;
    reference: string;
    description: string;
    category: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
}

function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function canDeleteKit(kit: Pick<KitSummary, "card" | "status">) {
  return !kit.card && kit.status === "montado";
}

function getStatusLabel(kit: Pick<KitSummary, "card" | "status">) {
  if (kit.card) return "No fluxo";
  if (kit.status === "montado") return "Montado";
  return kit.status;
}

function getStatusClass(kit: Pick<KitSummary, "card">) {
  if (kit.card) return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

function detailItemsToLines(items: KitDetail["items"]): KitLineItem[] {
  return items.map((item) => createLineFromKitItem(item));
}

export default function KitsMontados() {
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedKit, setSelectedKit] = useState<KitDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  async function loadKits() {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/kits`);
      if (!res.ok) throw new Error("Erro ao buscar kits");
      setKits(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar kits");
    } finally {
      setIsLoading(false);
    }
  }

  async function openKitDetail(id: number) {
    try {
      setIsLoadingDetail(true);
      setShowDetail(true);
      const res = await fetch(`${apiUrl}/kits/${id}`);
      if (!res.ok) throw new Error("Erro ao carregar kit");
      setSelectedKit(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar kit");
      setShowDetail(false);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleDelete(kit: Pick<KitSummary, "id" | "kitNumber" | "card" | "status">) {
    if (!canDeleteKit(kit)) {
      toast.error("Kits no fluxo não podem ser excluídos");
      return;
    }

    const ok = confirm(`Excluir o kit nº ${kit.kitNumber}? Esta ação não pode ser desfeita.`);
    if (!ok) return;

    try {
      const res = await fetch(`${apiUrl}/kits/${kit.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao excluir kit");

      toast.success(`Kit ${kit.kitNumber} excluído`);
      setKits((prev) => prev.filter((entry) => entry.id !== kit.id));
      if (selectedKit?.id === kit.id) {
        setShowDetail(false);
        setSelectedKit(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir kit");
    }
  }

  useEffect(() => {
    loadKits();
  }, []);

  const filteredKits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return kits;

    return kits.filter((kit) => {
      const haystack = [
        String(kit.kitNumber),
        kit.nature,
        kit.status,
        kit.reseller?.name,
        kit.card?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [kits, search]);

  const detailGroups = useMemo(
    () =>
      selectedKit
        ? groupItemsByCategory(detailItemsToLines(selectedKit.items))
        : [],
    [selectedKit]
  );

  const kitColumns: DataTableColumn<KitSummary>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Ações",
        align: "center",
        headerClassName: "sticky left-0 z-20 bg-slate-800 w-[120px]",
        cellClassName: "sticky left-0 z-10 bg-white",
        render: (kit) => (
          <TableActions
            onDelete={
              canDeleteKit(kit)
                ? () => handleDelete(kit)
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => openKitDetail(kit.id)}
              title="Ver detalhes"
              aria-label="Ver detalhes"
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition"
            >
              <FiEye size={16} />
            </button>
            <Link
              href={`/kit?edit=${kit.id}`}
              title="Editar kit"
              aria-label="Editar kit"
              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 transition inline-flex"
            >
              <FiEdit2 size={16} />
            </Link>
          </TableActions>
        ),
      },
      {
        key: "kitNumber",
        header: "Nº Kit",
        render: (kit) => (
          <span className="font-bold text-[#b8860b]">#{kit.kitNumber}</span>
        ),
      },
      {
        key: "issueDate",
        header: "Emissão",
        cellClassName: "text-slate-600 whitespace-nowrap",
        render: (kit) => formatDate(kit.issueDate),
      },
      {
        key: "returnDate",
        header: "Devolução",
        cellClassName: "text-slate-600 whitespace-nowrap",
        render: (kit) => formatDate(kit.returnDate),
      },
      {
        key: "nature",
        header: "Natureza",
        cellClassName: "text-slate-700",
        render: (kit) => kit.nature,
      },
      {
        key: "totalQty",
        header: "Peças",
        align: "center",
        cellClassName: "text-slate-700",
        render: (kit) => kit.totalQty || kit._count.items,
      },
      {
        key: "grandTotal",
        header: "Total",
        align: "right",
        cellClassName: "font-medium text-slate-800 tabular-nums",
        render: (kit) => formatBRL(parseDecimal(kit.grandTotal)),
      },
      {
        key: "reseller",
        header: "Revendedora",
        cellClassName: "text-slate-600",
        render: (kit) => kit.reseller?.name || "-",
      },
      {
        key: "status",
        header: "Status",
        render: (kit) => (
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(kit)}`}
          >
            {getStatusLabel(kit)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const renderKitMobileCard = (kit: KitSummary) => (
    <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
        <button
          type="button"
          onClick={() => openKitDetail(kit.id)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          aria-label="Ver"
        >
          <FiEye size={18} />
        </button>
        <Link
          href={`/kit?edit=${kit.id}`}
          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
          aria-label="Editar"
        >
          <FiEdit2 size={18} />
        </Link>
        {canDeleteKit(kit) ? (
          <button
            type="button"
            onClick={() => handleDelete(kit)}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
            aria-label="Excluir"
          >
            <FiTrash2 size={18} />
          </button>
        ) : null}
        <span className="ml-auto font-bold text-[#b8860b]">#{kit.kitNumber}</span>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span>{formatDate(kit.issueDate)} → {formatDate(kit.returnDate)}</span>
          <span>{kit.nature}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {kit.reseller?.name || "Sem revendedora"} · {kit.totalQty || kit._count.items} peças
          </div>
          <span className="font-semibold text-slate-900">
            {formatBRL(parseDecimal(kit.grandTotal))}
          </span>
        </div>
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(kit)}`}
        >
          {getStatusLabel(kit)}
        </span>
      </div>
    </article>
  );

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                Kits Montados
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Visualize, consulte e gerencie os kits já salvos.
              </p>
            </div>
            <Link
              href="/kit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md hover:from-blue-700 hover:to-blue-600"
            >
              Montar novo kit
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nº, natureza, revendedora ou status..."
                className="flex-1 px-4 py-2.5 rounded-md border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-sm text-slate-500 whitespace-nowrap">
                {filteredKits.length}{" "}
                {filteredKits.length === 1 ? "kit" : "kits"}
              </span>
            </div>
          </div>

          <DataTable
            data={filteredKits}
            columns={kitColumns}
            rowKey={(kit) => kit.id}
            isLoading={isLoading}
            emptyMessage={
              search
                ? "Nenhum kit encontrado para essa busca."
                : "Nenhum kit montado ainda."
            }
            loadingMessage="Carregando kits..."
            minWidth="960px"
            mobileCardRender={renderKitMobileCard}
          />

          <Modal
            open={showDetail}
            size="2xl"
            title={
              selectedKit
                ? `Kit #${selectedKit.kitNumber}`
                : "Detalhes do kit"
            }
            onClose={() => {
              setShowDetail(false);
              setSelectedKit(null);
            }}
          >
            {isLoadingDetail || !selectedKit ? (
              <p className="py-8 text-center text-slate-500">Carregando...</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Emissão</p>
                    <p className="font-medium">{formatDate(selectedKit.issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Devolução</p>
                    <p className="font-medium">{formatDate(selectedKit.returnDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Natureza</p>
                    <p className="font-medium">{selectedKit.nature}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                    <p className="font-medium">{getStatusLabel(selectedKit)}</p>
                  </div>
                </div>

                {selectedKit.reseller && (
                  <div className="p-3 bg-slate-50 rounded-lg text-sm">
                    <p className="text-xs text-slate-500 uppercase mb-1">Revendedora</p>
                    <p className="font-medium">{selectedKit.reseller.name}</p>
                  </div>
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Referência</th>
                        <th className="px-3 py-2 text-left">Descrição</th>
                        <th className="px-3 py-2 text-center">Qtd</th>
                        <th className="px-3 py-2 text-right">Unit.</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailGroups.map((group) => (
                        <Fragment key={group.category}>
                          {group.items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-3 py-2 font-mono text-xs">
                                {item.reference}
                              </td>
                              <td className="px-3 py-2">{item.description}</td>
                              <td className="px-3 py-2 text-center">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">
                                {formatBRL(item.unitPrice)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatBRL(item.quantity * item.unitPrice)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-semibold text-slate-600">
                            <td colSpan={2} className="px-3 py-2 italic">
                              Total — {group.category}
                            </td>
                            <td className="px-3 py-2 text-center">{group.totalQty}</td>
                            <td />
                            <td className="px-3 py-2 text-right text-[#b8860b]">
                              {formatBRL(group.totalValue)}
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg ml-auto text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal produtos</span>
                    <span>{formatBRL(parseDecimal(selectedKit.productsSubtotal))}</span>
                  </div>
                  {parseDecimal(selectedKit.extrasTotal) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Complementos</span>
                      <span>{formatBRL(parseDecimal(selectedKit.extrasTotal))}</span>
                    </div>
                  )}
                  <div className="sm:col-span-2 flex justify-between font-bold border-t pt-2">
                    <span>Total geral</span>
                    <span className="text-[#b8860b]">
                      {formatBRL(parseDecimal(selectedKit.grandTotal))}
                    </span>
                  </div>
                  <div className="sm:col-span-2 flex justify-between text-green-700">
                    <span>
                      Comissão ({getCommissionLabel(parseDecimal(selectedKit.grandTotal))})
                    </span>
                    <span>{formatBRL(parseDecimal(selectedKit.commissionValue))}</span>
                  </div>
                  {parseDecimal(selectedKit.discountValue) > 0 && (
                    <div className="sm:col-span-2 flex justify-between text-green-700">
                      <span>Desconto pagamento</span>
                      <span>-{formatBRL(parseDecimal(selectedKit.discountValue))}</span>
                    </div>
                  )}
                  <div className="sm:col-span-2 flex justify-between text-base font-bold">
                    <span>Valor final</span>
                    <span>{formatBRL(parseDecimal(selectedKit.finalTotal))}</span>
                  </div>
                </div>

                {selectedKit.observations && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Observações</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {selectedKit.observations}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Link
                    href={`/kit?edit=${selectedKit.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md hover:from-blue-700 hover:to-blue-600"
                  >
                    Editar kit
                  </Link>
                  {canDeleteKit(selectedKit) ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(selectedKit)}
                    >
                      Excluir kit
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </Modal>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
