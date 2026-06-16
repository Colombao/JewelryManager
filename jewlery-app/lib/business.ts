export type BusinessUnit = {
  id: number;
  kitItemId: number;
  unitIndex: number;
  pieceLabel?: string | null;
  reference: string;
  description: string;
  category: string;
  unitPrice: string | number;
  soldByOwner: boolean;
  soldByReseller: boolean;
  missingOrLost: boolean;
  product?: {
    id: number;
    code: string | null;
    name: string;
    image: string | null;
  } | null;
};

export type BusinessSummary = {
  totalUnits: number;
  ownerSold: number;
  resellerSold: number;
  confirmed: number;
  missing: number;
  pending: number;
  soldValue: number;
  lostValue: number;
  pendingValue: number;
  kitTotal: number;
  commissionRate: number;
  commissionLabel: string;
  commissionAmount: number;
  amountDue: number;
  resellerEarnings: number;
};

export type BusinessDetail = {
  id: number;
  title: string;
  description?: string | null;
  stepId: number;
  kitId: number;
  resellerId?: number | null;
  kit: {
    id: number;
    kitNumber: number;
    issueDate: string;
    returnDate: string;
    totalQty: number;
    grandTotal: string | number;
    finalTotal: string | number;
  };
  units: BusinessUnit[];
  summary: BusinessSummary;
  reseller?: {
    id: number;
    name: string;
    email?: string | null;
    cpf?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
};

export type ResellerBusinessListItem = {
  id: number;
  title: string;
  description?: string | null;
  stepName?: string | null;
  kit: {
    id: number;
    kitNumber: number;
    totalQty: number;
    grandTotal: string | number;
    returnDate: string;
    status: string;
  };
  createdAt: string;
};
