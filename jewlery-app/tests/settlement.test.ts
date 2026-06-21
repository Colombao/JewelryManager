import {
  getPaymentStatusClass,
  getPaymentStatusLabel,
  getPaymentStatusLabelForPayment,
  getSettlementEventLabel,
  parseMoneyInput,
} from "@/lib/settlement";

describe("settlement helpers", () => {
  it("maps payment status labels", () => {
    expect(getPaymentStatusLabel("confirmado")).toBe("Quitado");
    expect(getPaymentStatusLabel("aguardando_confirmacao")).toBe(
      "Aguardando confirmação"
    );
    expect(getPaymentStatusLabel("parcial")).toBe("Parcialmente pago");
    expect(getPaymentStatusLabel("pendente")).toBe("Pendente");
  });

  it("maps payment status css classes", () => {
    expect(getPaymentStatusClass("confirmado")).toContain("emerald");
    expect(getPaymentStatusClass("pendente")).toContain("red");
  });

  it("maps settlement event labels", () => {
    expect(getSettlementEventLabel("finalizado")).toBe("Kit finalizado");
    expect(getSettlementEventLabel("custom_event")).toBe("custom_event");
  });

  it("maps payment parcel status", () => {
    expect(getPaymentStatusLabelForPayment("confirmado")).toBe("Confirmado");
    expect(getPaymentStatusLabelForPayment("informado")).toBe(
      "Aguardando confirmação"
    );
  });
});

describe("parseMoneyInput", () => {
  it("parses Brazilian currency input", () => {
    expect(parseMoneyInput("1.234,56")).toBe(1234.56);
    expect(parseMoneyInput("89,90")).toBe(89.9);
  });

  it("rejects invalid values", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("0")).toBeNull();
  });
});
