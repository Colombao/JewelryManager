"use client";

import BusinessKitPanel from "@/app/components/BusinessKitPanel";
import RequireResellerAuth from "@/app/components/RequireResellerAuth";
import ResellerLayout from "@/app/components/ResellerLayout";
import { useAuth } from "@/app/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { BusinessDetail, ResellerBusinessListItem } from "@/lib/business";
import { formatBRL } from "@/app/kit/kitUtils";
import {
  getPaymentStatusClass,
  getPaymentStatusLabel,
  getPaymentStatusLabelForPayment,
  getSettlementEventLabel,
  parseMoneyInput,
  ResellerSettlementsResponse,
} from "@/lib/settlement";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export default function RevendedoraPortalPage() {
  const { token } = useAuth();
  const [businesses, setBusinesses] = useState<ResellerBusinessListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [settlementsData, setSettlementsData] =
    useState<ResellerSettlementsResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSettlements, setLoadingSettlements] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingUnitId, setUpdatingUnitId] = useState<number | null>(null);
  const [markingPaidKitId, setMarkingPaidKitId] = useState<number | null>(null);
  const [paymentDrafts, setPaymentDrafts] = useState<
    Record<number, { amount: string; note: string }>
  >({});

  const authHeader = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    }),
    [token]
  );

  const loadBusinesses = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${apiUrl}/reseller-portal/businesses`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar negócios");
      }

      setBusinesses(data);
      if (data.length > 0) {
        setSelectedId((prev) => prev ?? data[0].id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar negócios");
    } finally {
      setLoadingList(false);
    }
  }, [authHeader]);

  const loadSettlements = useCallback(async () => {
    setLoadingSettlements(true);
    try {
      const res = await fetch(`${apiUrl}/reseller-portal/settlements`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar acertos");
      }
      setSettlementsData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar acertos");
    } finally {
      setLoadingSettlements(false);
    }
  }, [authHeader]);

  const loadDetail = useCallback(
    async (cardId: number) => {
      setLoadingDetail(true);
      setDetail(null);
      try {
        const res = await fetch(`${apiUrl}/reseller-portal/businesses/${cardId}`, {
          headers: authHeader,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar kit");
        }
        setDetail(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar kit");
      } finally {
        setLoadingDetail(false);
      }
    },
    [authHeader]
  );

  useEffect(() => {
    if (token) {
      loadBusinesses();
      loadSettlements();
    }
  }, [token, loadBusinesses, loadSettlements]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function toggleUnitStatus(
    unitId: number,
    field: "owner" | "reseller" | "missing",
    value: boolean
  ) {
    if (!detail || !selectedId) return;

    setUpdatingUnitId(unitId);
    try {
      const res = await fetch(
        `${apiUrl}/reseller-portal/businesses/${selectedId}/units/${unitId}`,
        {
          method: "PATCH",
          headers: authHeader,
          body: JSON.stringify({ field, value }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao atualizar peça");
      }

      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          units: prev.units.map((unit) =>
            unit.id === unitId ? data.unit : unit
          ),
          summary: data.summary,
        };
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar peça");
    } finally {
      setUpdatingUnitId(null);
    }
  }

  async function handleRegisterPayment(
    kitId: number,
    kitNumber: number,
    maxAmount: number
  ) {
    const draft = paymentDrafts[kitId] ?? { amount: "", note: "" };
    const amount = parseMoneyInput(draft.amount);

    if (amount === null) {
      toast.error("Informe um valor válido para o pagamento");
      return;
    }

    if (amount > maxAmount + 0.009) {
      toast.error(`O valor máximo disponível é ${formatBRL(maxAmount)}`);
      return;
    }

    setMarkingPaidKitId(kitId);
    try {
      const res = await fetch(
        `${apiUrl}/reseller-portal/settlements/${kitId}/payments`,
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({
            amount,
            note: draft.note.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao informar pagamento");
      }

      toast.success(data?.message || "Pagamento informado");
      setPaymentDrafts((prev) => ({
        ...prev,
        [kitId]: { amount: "", note: "" },
      }));
      await loadSettlements();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao informar pagamento");
    } finally {
      setMarkingPaidKitId(null);
    }
  }

  async function handleMarkPaidFull(
    kitId: number,
    kitNumber: number,
    amountDue: number
  ) {
    const ok = confirm(
      `Informar pagamento de ${formatBRL(amountDue)} à empresa para o kit #${kitNumber}?`
    );
    if (!ok) return;

    setMarkingPaidKitId(kitId);
    try {
      const res = await fetch(
        `${apiUrl}/reseller-portal/settlements/${kitId}/mark-paid`,
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao informar pagamento");
      }

      toast.success(data?.message || "Pagamento informado");
      await loadSettlements();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao informar pagamento");
    } finally {
      setMarkingPaidKitId(null);
    }
  }

  return (
    <RequireResellerAuth>
      <ResellerLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Meus kits
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Marque em azul o que você vendeu. A empresa confirma e finaliza a
            entrega do kit.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Acertos e pagamentos
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Valores dos kits já finalizados pela empresa.
              </p>
            </div>
            {settlementsData ? (
              <div className="rounded-xl bg-[#fffaf0] border border-[#b8860b]/20 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-wide text-[#9a7209]">
                  Total em aberto
                </p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {formatBRL(settlementsData.summary.pendingTotal)}
                </p>
              </div>
            ) : null}
          </div>

          {loadingSettlements ? (
            <p className="text-sm text-slate-500">Carregando acertos...</p>
          ) : !settlementsData || settlementsData.settlements.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum kit finalizado ainda. Quando a empresa encerrar um negócio,
              o valor a pagar aparecerá aqui.
            </p>
          ) : (
            <div className="space-y-3">
              {settlementsData.settlements.map((settlement) => (
                <article
                  key={settlement.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Kit {settlement.kit.kitNumber}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Finalizado em {formatDate(settlement.finalizedAt)} ·{" "}
                        {settlement.soldCount} vendida(s) ·{" "}
                        {settlement.returnedCount} devolvida(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#9a7209] tabular-nums">
                        {formatBRL(Number(settlement.amountDue))}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Confirmado: {formatBRL(settlement.amountConfirmed)} · Saldo:{" "}
                        {formatBRL(settlement.amountRemaining)}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClass(settlement.paymentStatus)}`}
                      >
                        {getPaymentStatusLabel(settlement.paymentStatus)}
                      </span>
                    </div>
                  </div>

                  {settlement.payments.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                        Parcelas informadas
                      </p>
                      <div className="space-y-2">
                        {settlement.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium text-slate-800 tabular-nums">
                                {formatBRL(Number(payment.amount))}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(payment.reportedAt)}
                                {payment.note ? ` · ${payment.note}` : ""}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                payment.status === "confirmado"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {getPaymentStatusLabelForPayment(payment.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {settlement.events.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {settlement.events.map((event) => (
                        <p key={event.id} className="text-xs text-slate-500">
                          {formatDate(event.createdAt)} ·{" "}
                          {getSettlementEventLabel(event.type)}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {settlement.paymentStatus !== "confirmado" &&
                  settlement.amountRemaining > 0 ? (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-sm font-medium text-slate-800">
                        Informar pagamento
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                        <div>
                          <label className="text-xs text-slate-500">Valor</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={paymentDrafts[settlement.kitId]?.amount ?? ""}
                            onChange={(e) =>
                              setPaymentDrafts((prev) => ({
                                ...prev,
                                [settlement.kitId]: {
                                  amount: e.target.value,
                                  note: prev[settlement.kitId]?.note ?? "",
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">
                            Observação (opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: PIX, dinheiro, 1ª parcela..."
                            value={paymentDrafts[settlement.kitId]?.note ?? ""}
                            onChange={(e) =>
                              setPaymentDrafts((prev) => ({
                                ...prev,
                                [settlement.kitId]: {
                                  amount: prev[settlement.kitId]?.amount ?? "",
                                  note: e.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={markingPaidKitId === settlement.kitId}
                          onClick={() =>
                            handleMarkPaidFull(
                              settlement.kitId,
                              settlement.kit.kitNumber,
                              settlement.amountRemaining
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium disabled:opacity-50"
                        >
                          Quitar saldo restante
                        </button>
                        <button
                          type="button"
                          disabled={markingPaidKitId === settlement.kitId}
                          onClick={() =>
                            handleRegisterPayment(
                              settlement.kitId,
                              settlement.kit.kitNumber,
                              settlement.amountRemaining
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {markingPaidKitId === settlement.kitId
                            ? "Informando..."
                            : "Informar parcela"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        {loadingList ? (
          <p className="text-sm text-slate-500">Carregando seus kits...</p>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-700 font-medium">
              Nenhum kit vinculado a você ainda.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Quando a empresa abrir um negócio com seu nome no Fluxo, ele
              aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Kits em andamento
            </h2>

            {businesses.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {businesses.map((business) => (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => setSelectedId(business.id)}
                    className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${
                      selectedId === business.id
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Kit {business.kit.kitNumber}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {business.kit.totalQty} peças ·{" "}
                      {formatBRL(Number(business.kit.grandTotal))}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {loadingDetail || !detail ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Carregando peças do kit...
              </p>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {detail.title}
                  </h2>
                  {detail.description && (
                    <p className="text-sm text-slate-500 mt-1">
                      {detail.description}
                    </p>
                  )}
                </div>

                <BusinessKitPanel
                  detail={detail}
                  mode="reseller"
                  updatingUnitId={updatingUnitId}
                  onToggleUnit={toggleUnitStatus}
                />
              </div>
            )}
          </div>
        )}
      </ResellerLayout>
    </RequireResellerAuth>
  );
}
