export type ClosureUnit = {
  id: number;
  reference: string;
  description: string;
  category: string;
  unitPrice: string | number;
  unitIndex: number;
  pieceLabel?: string | null;
  outcome: "vendida" | "devolvida" | "perdida";
};

export type KitSettlementPayment = {
  id: number;
  settlementId: number;
  amount: string | number;
  note?: string | null;
  status: "informado" | "confirmado";
  reportedAt: string;
  confirmedAt?: string | null;
};

export type KitSettlementDetail = {
  id: number;
  kitId: number;
  amountDue: string | number;
  soldValue: string | number;
  lostValue: string | number;
  returnedValue: string | number;
  soldCount: number;
  lostCount: number;
  returnedCount: number;
  commissionRate: string | number;
  commissionAmount: string | number;
  paymentStatus:
    | "pendente"
    | "aguardando_confirmacao"
    | "parcial"
    | "confirmado";
  amountConfirmed: number;
  amountAwaitingConfirm: number;
  amountRemaining: number;
  finalizedAt: string;
  paidAt?: string | null;
  confirmedAt?: string | null;
  payments: KitSettlementPayment[];
  events: Array<{
    id: number;
    type: string;
    note?: string | null;
    actor: string;
    createdAt: string;
  }>;
  closure?: {
    soldUnits: ClosureUnit[];
    returnedUnits: ClosureUnit[];
    lostUnits: ClosureUnit[];
  };
};

export type ResellerSettlementsResponse = {
  summary: {
    pendingTotal: number;
    awaitingConfirmTotal: number;
    openCount: number;
  };
  settlements: Array<
    KitSettlementDetail & {
      kit: {
        id: number;
        kitNumber: number;
        totalQty: number;
        grandTotal: string | number;
        returnDate: string;
      };
    }
  >;
};

export function getPaymentStatusLabel(
  status: KitSettlementDetail["paymentStatus"]
) {
  if (status === "confirmado") return "Quitado";
  if (status === "aguardando_confirmacao") return "Aguardando confirmação";
  if (status === "parcial") return "Parcialmente pago";
  return "Pendente";
}

export function getPaymentStatusClass(
  status: KitSettlementDetail["paymentStatus"]
) {
  if (status === "confirmado") return "bg-emerald-100 text-emerald-800";
  if (status === "aguardando_confirmacao") return "bg-amber-100 text-amber-800";
  if (status === "parcial") return "bg-blue-100 text-blue-800";
  return "bg-red-100 text-red-800";
}

export function getSettlementEventLabel(type: string) {
  if (type === "finalizado") return "Kit finalizado";
  if (type === "marcado_pago_revendedora") return "Revendedora informou pagamento";
  if (type === "pagamento_informado") return "Pagamento informado";
  if (type === "pagamento_confirmado") return "Pagamento confirmado";
  if (type === "confirmado_empresa") return "Empresa confirmou recebimento";
  return type;
}

export function getPaymentStatusLabelForPayment(
  status: KitSettlementPayment["status"]
) {
  return status === "confirmado" ? "Confirmado" : "Aguardando confirmação";
}

export function parseMoneyInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}
