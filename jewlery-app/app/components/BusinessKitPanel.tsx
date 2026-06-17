"use client";

import { BusinessDetail } from "@/lib/business";
import { formatBRL, resolveImageUrl } from "@/app/kit/kitUtils";

type BusinessKitPanelProps = {
  detail: BusinessDetail;
  mode: "admin" | "reseller";
  updatingUnitId: number | null;
  onToggleUnit: (
    unitId: number,
    field: "owner" | "reseller" | "missing",
    value: boolean
  ) => void;
  onFinalize?: () => void;
  finalizing?: boolean;
};

function StatusButton({
  active,
  disabled,
  onClick,
  title,
  activeClass,
  idleClass,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  activeClass: string;
  idleClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`h-8 w-8 rounded-lg border-2 flex items-center justify-center transition disabled:opacity-40 ${active ? activeClass : idleClass}`}
    >
      {children}
    </button>
  );
}

export default function BusinessKitPanel({
  detail,
  mode,
  updatingUnitId,
  onToggleUnit,
  onFinalize,
  finalizing = false,
}: BusinessKitPanelProps) {
  const canEditOwner = mode === "admin";
  const canEditReseller = mode === "admin" || mode === "reseller";
  const canEditMissing = mode === "admin" || mode === "reseller";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Revendedora
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {detail.reseller?.name ?? "—"}
              </p>
              {detail.reseller?.phone && (
                <p className="text-xs text-slate-500">{detail.reseller.phone}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Kit
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Nº {detail.kit.kitNumber}
              </p>
              <p className="text-xs text-slate-500">
                {detail.summary.totalUnits} peça(s) ·{" "}
                {formatBRL(Number(detail.kit.grandTotal))}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-[#b8860b]/10 px-2.5 py-1 text-[11px] font-medium text-[#9a7209]">
              Empresa: {detail.summary.ownerSold}/{detail.summary.totalUnits}
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700">
              Revendedora: {detail.summary.resellerSold}/
              {detail.summary.totalUnits}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              Confirmadas: {detail.summary.confirmed}/{detail.summary.totalUnits}
            </span>
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700">
              Perdidas/falta: {detail.summary.missing}/{detail.summary.totalUnits}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-[#b8860b]/20 bg-gradient-to-br from-[#fffaf0] to-white p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#9a7209] mb-3">
            Acerto com a revendedora
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">Vendido confirmado</span>
              <span className="font-medium tabular-nums">
                {formatBRL(detail.summary.soldValue)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">
                Comissão ({(detail.summary.commissionRate * 100).toFixed(0)}% ·{" "}
                {detail.summary.commissionLabel})
              </span>
              <span className="font-medium text-emerald-700 tabular-nums">
                − {formatBRL(detail.summary.commissionAmount)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">Perdidas / em falta</span>
              <span className="font-medium text-red-700 tabular-nums">
                + {formatBRL(detail.summary.lostValue)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">Ainda em consignação</span>
              <span className="font-medium text-slate-500 tabular-nums">
                {formatBRL(detail.summary.pendingValue)}
              </span>
            </div>
            <div className="border-t border-[#b8860b]/20 pt-2 flex justify-between gap-3">
              <span className="font-semibold text-slate-900">
                Total a pagar à empresa
              </span>
              <span className="text-lg font-bold text-[#9a7209] tabular-nums">
                {formatBRL(detail.summary.amountDue)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {mode === "reseller"
                ? `Sua comissão estimada: ${formatBRL(detail.summary.resellerEarnings)}`
                : `A revendedora fica com ${formatBRL(detail.summary.resellerEarnings)} de comissão sobre as vendas confirmadas.`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 px-1">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border-2 border-[#b8860b] bg-[#b8860b] text-white text-[10px]">
            ✓
          </span>
          Vendido — Empresa
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border-2 border-blue-600 bg-blue-600 text-white text-[10px]">
            ✓
          </span>
          Vendido — Revendedora
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border-2 border-red-500 bg-red-500 text-white text-[10px]">
            !
          </span>
          Perdida / em falta
        </span>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1fr_90px_70px_70px_70px] gap-3 px-4 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Peça</span>
          <span className="text-right">Preço</span>
          <span className="text-center">Empresa</span>
          <span className="text-center">Revendedora</span>
          <span className="text-center">Falta</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-[52vh] overflow-y-auto">
          {detail.units.map((unit) => {
            const imageUrl = resolveImageUrl(unit.product?.image ?? null);
            const price = Number(unit.unitPrice);
            const isUpdating = updatingUnitId === unit.id;
            const isConfirmed =
              unit.soldByOwner && unit.soldByReseller && !unit.missingOrLost;

            return (
              <div
                key={unit.id}
                className={`px-4 py-3 grid grid-cols-1 lg:grid-cols-[1fr_90px_70px_70px_70px] gap-3 items-center transition ${
                  unit.missingOrLost
                    ? "bg-red-50/70"
                    : isConfirmed
                    ? "bg-emerald-50/60"
                    : unit.soldByOwner || unit.soldByReseller
                    ? "bg-slate-50/80"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={unit.description}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {unit.reference.slice(0, 4)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {unit.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {unit.reference} · {unit.category}
                      {unit.pieceLabel ? ` · ${unit.pieceLabel}` : ""}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-800 lg:text-right tabular-nums">
                  {formatBRL(price)}
                </p>

                <div className="flex lg:justify-center">
                  <StatusButton
                    active={unit.soldByOwner}
                    disabled={isUpdating || unit.missingOrLost || !canEditOwner}
                    onClick={() =>
                      onToggleUnit(unit.id, "owner", !unit.soldByOwner)
                    }
                    title={
                      !canEditOwner
                        ? "Confirmado pela empresa"
                        : unit.soldByOwner
                        ? "Desmarcar venda (empresa)"
                        : "Marcar como vendido (empresa)"
                    }
                    activeClass="border-[#b8860b] bg-[#b8860b] text-white shadow-sm"
                    idleClass="border-[#b8860b]/40 bg-white text-transparent hover:bg-[#b8860b]/10"
                  >
                    ✓
                  </StatusButton>
                </div>

                <div className="flex lg:justify-center">
                  <StatusButton
                    active={unit.soldByReseller}
                    disabled={isUpdating || unit.missingOrLost || !canEditReseller}
                    onClick={() =>
                      onToggleUnit(unit.id, "reseller", !unit.soldByReseller)
                    }
                    title={
                      unit.soldByReseller
                        ? "Desmarcar sua venda"
                        : "Marcar como vendido por mim"
                    }
                    activeClass="border-blue-600 bg-blue-600 text-white shadow-sm"
                    idleClass="border-blue-400/50 bg-white text-transparent hover:bg-blue-50"
                  >
                    ✓
                  </StatusButton>
                </div>

                <div className="flex lg:justify-center">
                  <StatusButton
                    active={unit.missingOrLost}
                    disabled={isUpdating || !canEditMissing}
                    onClick={() =>
                      onToggleUnit(unit.id, "missing", !unit.missingOrLost)
                    }
                    title={
                      unit.missingOrLost
                        ? "Desmarcar perda/falta"
                        : "Marcar como perdida ou em falta"
                    }
                    activeClass="border-red-500 bg-red-500 text-white shadow-sm"
                    idleClass="border-red-300 bg-white text-transparent hover:bg-red-50"
                  >
                    !
                  </StatusButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {mode === "reseller"
          ? "Marque em azul as peças que você vendeu e em vermelho as perdidas ou em falta. A confirmação final depende também da empresa."
          : "Cada linha é uma peça individual. A comissão segue a tabela em Configurações → Comissão Revendedora."}
      </p>

      {onFinalize && mode === "admin" ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-500 max-w-xl">
            Somente a empresa pode finalizar. Peças vendidas/perdidas saem do
            estoque; o restante volta ao estoque e gera o acerto com a
            revendedora.
          </p>
          <button
            type="button"
            disabled={finalizing}
            onClick={onFinalize}
            className="shrink-0 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {finalizing ? "Finalizando..." : "Finalizar entrega"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
