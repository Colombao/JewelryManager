"use client";

import BusinessKitPanel from "@/app/components/BusinessKitPanel";
import RequireResellerAuth from "@/app/components/RequireResellerAuth";
import ResellerLayout from "@/app/components/ResellerLayout";
import { useAuth } from "@/app/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { BusinessDetail, ResellerBusinessListItem } from "@/lib/business";
import { formatBRL } from "@/app/kit/kitUtils";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function RevendedoraPortalPage() {
  const { token } = useAuth();
  const [businesses, setBusinesses] = useState<ResellerBusinessListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingUnitId, setUpdatingUnitId] = useState<number | null>(null);

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
    if (token) loadBusinesses();
  }, [token, loadBusinesses]);

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

  return (
    <RequireResellerAuth>
      <ResellerLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Meus kits
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Marque em azul o que você vendeu. A empresa confirma do lado dela.
          </p>
        </div>

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
