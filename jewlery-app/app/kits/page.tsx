"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";
import Button from "../components/Button";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";
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

  async function handleDelete(id: number, kitNumber: number) {
    const ok = confirm(`Excluir o kit nº ${kitNumber}? Esta ação não pode ser desfeita.`);
    if (!ok) return;

    try {
      const res = await fetch(`${apiUrl}/kits/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao excluir kit");

      toast.success(`Kit ${kitNumber} excluído`);
      setKits((prev) => prev.filter((kit) => kit.id !== id));
      if (selectedKit?.id === id) {
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

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Kits Montados
              </h1>
              <p className="text-slate-600">
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

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Nº Kit</th>
                    <th className="px-4 py-3">Emissão</th>
                    <th className="px-4 py-3">Devolução</th>
                    <th className="px-4 py-3">Natureza</th>
                    <th className="px-4 py-3 text-center">Peças</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Revendedora</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        Carregando kits...
                      </td>
                    </tr>
                  ) : filteredKits.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        {search
                          ? "Nenhum kit encontrado para essa busca."
                          : "Nenhum kit montado ainda."}
                      </td>
                    </tr>
                  ) : (
                    filteredKits.map((kit, idx) => (
                      <tr
                        key={kit.id}
                        className={`border-t ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                        } hover:bg-slate-100`}
                      >
                        <td className="px-4 py-3 font-bold text-[#b8860b]">
                          #{kit.kitNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(kit.issueDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(kit.returnDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{kit.nature}</td>
                        <td className="px-4 py-3 text-center text-slate-700">
                          {kit.totalQty || kit._count.items}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatBRL(parseDecimal(kit.grandTotal))}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {kit.reseller?.name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(kit)}`}
                          >
                            {getStatusLabel(kit)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-sm px-3 py-1"
                              onClick={() => openKitDetail(kit.id)}
                            >
                              Ver
                            </Button>
                            <Link
                              href={`/kit?edit=${kit.id}`}
                              className="inline-flex text-sm px-3 py-1 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm rounded-md"
                            >
                              Editar
                            </Link>
                            <Button
                              type="button"
                              variant="danger"
                              className="text-sm px-3 py-1"
                              onClick={() => handleDelete(kit.id, kit.kitNumber)}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() =>
                      handleDelete(selectedKit.id, selectedKit.kitNumber)
                    }
                  >
                    Excluir kit
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
