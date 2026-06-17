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
  ClosureUnit,
  getPaymentStatusClass,
  getPaymentStatusLabel,
  getPaymentStatusLabelForPayment,
  getSettlementEventLabel,
  KitSettlementDetail,
} from "@/lib/settlement";
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
  settlement?: {
    amountDue: string | number;
    paymentStatus: KitSettlementDetail["paymentStatus"];
  } | null;
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
  settlement?: KitSettlementDetail | null;
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

function canEditKit(kit: Pick<KitSummary, "status">) {
  return kit.status !== "finalizado";
}

function ClosureUnitList({
  title,
  units,
  tone,
}: {
  title: string;
  units: ClosureUnit[];
  tone: "emerald" | "slate" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/60"
      : tone === "red"
      ? "border-red-200 bg-red-50/60"
      : "border-slate-200 bg-slate-50/60";

  if (!units || units.length === 0) {
    return (
      <div className={`rounded-lg border p-3 ${toneClass}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          {title}
        </p>
        <p className="text-sm text-slate-500">Nenhuma peça</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {title} ({units.length})
      </p>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
        {units.map((unit) => (
          <li key={unit.id} className="text-sm text-slate-700 flex justify-between gap-3">
            <span className="truncate">
              {unit.reference} · {unit.description}
              {unit.pieceLabel ? ` · ${unit.pieceLabel}` : ""}
            </span>
            <span className="shrink-0 tabular-nums font-medium">
              {formatBRL(parseDecimal(unit.unitPrice))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getStatusLabel(kit: Pick<KitSummary, "card" | "status">) {
  if (kit.card) return "No fluxo";
  if (kit.status === "montado") return "Montado";
  if (kit.status === "finalizado") return "Finalizado";
  if (kit.status === "vinculado") return "Vinculado";
  return kit.status;
}

function getStatusClass(kit: Pick<KitSummary, "card" | "status">) {
  if (kit.card) return "bg-blue-100 text-blue-800";
  if (kit.status === "finalizado") return "bg-emerald-100 text-emerald-800";
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
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(
    null
  );

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

  async function handleConfirmPayment(paymentId: number) {
    if (!selectedKit?.settlement) return;

    const targetPayment = selectedKit.settlement.payments.find(
      (payment) => payment.id === paymentId
    );

    if (!targetPayment || targetPayment.status !== "informado") return;

    const ok = confirm(
      `Confirmar recebimento de ${formatBRL(parseDecimal(targetPayment.amount))}?`
    );
    if (!ok) return;

    setConfirmingPaymentId(paymentId);
    try {
      const res = await fetch(
        `${apiUrl}/kits/${selectedKit.id}/settlement/payments/${paymentId}/confirm`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao confirmar parcela");

      toast.success(data?.message || "Parcela confirmada");
      await openKitDetail(selectedKit.id);
      await loadKits();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao confirmar parcela");
    } finally {
      setConfirmingPaymentId(null);
    }
  }

  async function handleConfirmAllPending() {
    if (!selectedKit?.settlement) return;

    const pending = selectedKit.settlement.payments.filter(
      (payment) => payment.status === "informado"
    );

    if (pending.length === 0) {
      toast.error("Não há parcelas aguardando confirmação");
      return;
    }

    const total = pending.reduce(
      (sum, payment) => sum + parseDecimal(payment.amount),
      0
    );

    const ok = confirm(
      `Confirmar ${pending.length} parcela(s) no total de ${formatBRL(total)}?`
    );
    if (!ok) return;

    setConfirmingPayment(true);
    try {
      const res = await fetch(
        `${apiUrl}/kits/${selectedKit.id}/settlement/confirm`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao confirmar pagamento");

      toast.success(data?.message || "Pagamentos confirmados");
      await openKitDetail(selectedKit.id);
      await loadKits();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao confirmar pagamento");
    } finally {
      setConfirmingPayment(false);
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
              title={canEditKit(kit) ? "Editar kit" : "Kit finalizado não pode ser editado"}
              aria-label="Editar kit"
              className={`p-1.5 rounded-md transition inline-flex ${
                canEditKit(kit)
                  ? "text-blue-600 hover:bg-blue-100"
                  : "text-slate-300 pointer-events-none"
              }`}
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
        key: "payment",
        header: "Acerto",
        render: (kit) => {
          if (kit.status !== "finalizado" || !kit.settlement) {
            return <span className="text-slate-400">—</span>;
          }

          return (
            <div className="space-y-1">
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClass(kit.settlement.paymentStatus)}`}
              >
                {getPaymentStatusLabel(kit.settlement.paymentStatus)}
              </span>
              <p className="text-xs text-slate-600 tabular-nums">
                {formatBRL(parseDecimal(kit.settlement.amountDue))}
              </p>
            </div>
          );
        },
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
          href={canEditKit(kit) ? `/kit?edit=${kit.id}` : "#"}
          className={`p-2 rounded-lg transition ${
            canEditKit(kit)
              ? "text-blue-600 hover:bg-blue-50"
              : "text-slate-300 pointer-events-none"
          }`}
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
            minWidth="1100px"
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

                {selectedKit.settlement && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#b8860b]/20 bg-gradient-to-br from-[#fffaf0] to-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-[#9a7209] mb-1">
                            Acerto com revendedora
                          </p>
                          <p className="text-2xl font-bold text-slate-900 tabular-nums">
                            {formatBRL(parseDecimal(selectedKit.settlement.amountDue))}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Confirmado:{" "}
                            {formatBRL(selectedKit.settlement.amountConfirmed)} · Saldo:{" "}
                            {formatBRL(selectedKit.settlement.amountRemaining)}
                          </p>
                        </div>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClass(selectedKit.settlement.paymentStatus)}`}
                        >
                          {getPaymentStatusLabel(selectedKit.settlement.paymentStatus)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg bg-white/80 border border-emerald-100 p-3">
                          <p className="text-xs text-slate-500">Vendidas</p>
                          <p className="font-semibold text-emerald-700">
                            {selectedKit.settlement.soldCount} ·{" "}
                            {formatBRL(parseDecimal(selectedKit.settlement.soldValue))}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 border border-red-100 p-3">
                          <p className="text-xs text-slate-500">Perdidas/falta</p>
                          <p className="font-semibold text-red-700">
                            {selectedKit.settlement.lostCount} ·{" "}
                            {formatBRL(parseDecimal(selectedKit.settlement.lostValue))}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 border border-slate-200 p-3">
                          <p className="text-xs text-slate-500">Devolvidas ao estoque</p>
                          <p className="font-semibold text-slate-700">
                            {selectedKit.settlement.returnedCount} ·{" "}
                            {formatBRL(parseDecimal(selectedKit.settlement.returnedValue))}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedKit.settlement.closure && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <ClosureUnitList
                          title="Vendidas"
                          units={selectedKit.settlement.closure.soldUnits}
                          tone="emerald"
                        />
                        <ClosureUnitList
                          title="Devolvidas"
                          units={selectedKit.settlement.closure.returnedUnits}
                          tone="slate"
                        />
                        <ClosureUnitList
                          title="Perdidas / falta"
                          units={selectedKit.settlement.closure.lostUnits}
                          tone="red"
                        />
                      </div>
                    )}

                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">
                        Parcelas de pagamento
                      </p>
                      {selectedKit.settlement.payments.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nenhuma parcela informada ainda.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedKit.settlement.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800 tabular-nums">
                                  {formatBRL(parseDecimal(payment.amount))}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatDate(payment.reportedAt)}
                                  {payment.note ? ` · ${payment.note}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    payment.status === "confirmado"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {getPaymentStatusLabelForPayment(payment.status)}
                                </span>
                                {payment.status === "informado" ? (
                                  <Button
                                    type="button"
                                    onClick={() => handleConfirmPayment(payment.id)}
                                    disabled={confirmingPaymentId === payment.id}
                                  >
                                    {confirmingPaymentId === payment.id
                                      ? "Confirmando..."
                                      : "Confirmar"}
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">
                        Histórico
                      </p>
                      <div className="space-y-3">
                        {selectedKit.settlement.events.map((event) => (
                          <div
                            key={event.id}
                            className="flex gap-3 text-sm border-l-2 border-slate-200 pl-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-800">
                                {getSettlementEventLabel(event.type)}
                              </p>
                              {event.note ? (
                                <p className="text-slate-500">{event.note}</p>
                              ) : null}
                              <p className="text-xs text-slate-400 mt-0.5">
                                {formatDate(event.createdAt)} ·{" "}
                                {event.actor === "empresa" ? "Empresa" : "Revendedora"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedKit.settlement.payments.some(
                      (payment) => payment.status === "informado"
                    ) ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleConfirmAllPending}
                          disabled={confirmingPayment}
                        >
                          {confirmingPayment
                            ? "Confirmando..."
                            : "Confirmar todas as parcelas pendentes"}
                        </Button>
                      </div>
                    ) : null}
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
                  {canEditKit(selectedKit) ? (
                    <Link
                      href={`/kit?edit=${selectedKit.id}`}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md hover:from-blue-700 hover:to-blue-600"
                    >
                      Editar kit
                    </Link>
                  ) : (
                    <p className="text-sm text-slate-500 self-center mr-auto">
                      Kits finalizados não podem ser editados.
                    </p>
                  )}
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
