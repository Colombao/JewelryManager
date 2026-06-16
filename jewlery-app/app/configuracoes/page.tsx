"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";
import { formatMultiplier, ProfitMargin, CommissionTier, formatCommissionRate, formatCurrency } from "@/lib/pricing";
import Button from "../components/Button";
import DataTable, { DataTableColumn } from "../components/DataTable";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";
import TableActions from "../components/TableActions";

type TabId = "categories" | "platings" | "suppliers" | "profitMargins" | "commissionTiers";

interface NamedItem {
  id: number;
  name: string;
}

interface Supplier extends NamedItem {
  email: string | null;
  phone: string | null;
}

type ConfigItem = NamedItem | Supplier | ProfitMargin | CommissionTier;

const TABS: { id: TabId; label: string }[] = [
  { id: "categories", label: "Categorias" },
  { id: "platings", label: "Tipos de Banho" },
  { id: "suppliers", label: "Fornecedores" },
  { id: "profitMargins", label: "Margem de Lucro" },
  { id: "commissionTiers", label: "Comissão Revendedora" },
];

const API_PATHS: Record<TabId, string> = {
  categories: "/categories",
  platings: "/platings",
  suppliers: "/suppliers",
  profitMargins: "/profit-margins",
  commissionTiers: "/commission-tiers",
};

const fieldInputClass =
  "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition";

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("categories");
  const [categories, setCategories] = useState<NamedItem[]>([]);
  const [platings, setPlatings] = useState<NamedItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [profitMargins, setProfitMargins] = useState<ProfitMargin[]>([]);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    level: "",
    multiplier: "",
    maxAmount: "",
    ratePercent: "",
    sortOrder: "",
  });

  const tabLabels: Record<
    TabId,
    { title: string; singular: string; empty: string; subtitle: string }
  > = {
    categories: {
      title: "Categorias de Produto",
      singular: "Categoria",
      empty: "Nenhuma categoria cadastrada.",
      subtitle: "Classificação usada no cadastro e montagem de kits",
    },
    platings: {
      title: "Tipos de Banho",
      singular: "Tipo de Banho",
      empty: "Nenhum tipo de banho cadastrado.",
      subtitle: "Banho aplicado aos produtos de joalheria",
    },
    suppliers: {
      title: "Fornecedores",
      singular: "Fornecedor",
      empty: "Nenhum fornecedor cadastrado.",
      subtitle: "Empresas e fornecedores vinculados aos produtos",
    },
    profitMargins: {
      title: "Margem de Lucro",
      singular: "Margem",
      empty: "Nenhuma margem configurada.",
      subtitle: "Multiplicadores aplicados ao custo por peça na tabela de preços",
    },
    commissionTiers: {
      title: "Tabela de Comissão",
      singular: "Faixa",
      empty: "Nenhuma faixa de comissão configurada.",
      subtitle: "Percentual de comissão da revendedora conforme o valor vendido no negócio",
    },
  };

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      phone: "",
      level: "",
      multiplier: "",
      maxAmount: "",
      ratePercent: "",
      sortOrder: "",
    });
    setEditingId(null);
  }

  async function loadTabData(tab: TabId = activeTab) {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}${API_PATHS[tab]}`);
      if (!res.ok) throw new Error("Erro ao carregar dados");

      const data = await res.json();

      if (tab === "categories") setCategories(data);
      if (tab === "platings") setPlatings(data);
      if (tab === "suppliers") setSuppliers(data);
      if (tab === "profitMargins") setProfitMargins(data);
      if (tab === "commissionTiers") setCommissionTiers(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar dados"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleEdit(item: ConfigItem) {
    setEditingId(item.id);

    if ("multiplier" in item && "level" in item) {
      const margin = item as ProfitMargin;
      setFormData({
        name: margin.name || "",
        email: "",
        phone: "",
        level: String(margin.level),
        multiplier: String(margin.multiplier),
        maxAmount: "",
        ratePercent: "",
        sortOrder: "",
      });
    } else if ("rate" in item && "maxAmount" in item) {
      const tier = item as CommissionTier;
      setFormData({
        name: tier.label || "",
        email: "",
        phone: "",
        level: "",
        multiplier: "",
        maxAmount: String(tier.maxAmount),
        ratePercent: String(Number(tier.rate) * 100),
        sortOrder: String(tier.sortOrder),
      });
    } else {
      setFormData({
        name: item.name || "",
        email: "email" in item ? item.email || "" : "",
        phone: "phone" in item ? item.phone || "" : "",
        level: "",
        multiplier: "",
        maxAmount: "",
        ratePercent: "",
        sortOrder: "",
      });
    }

    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (activeTab === "profitMargins") {
      const level = Number(formData.level);
      const multiplier = Number(formData.multiplier.replace(",", "."));

      if (!Number.isInteger(level) || level < 1) {
        toast.error("Informe um nível válido");
        return;
      }

      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        toast.error("Informe um multiplicador válido");
        return;
      }
    }

    if (activeTab === "commissionTiers") {
      const maxAmount = Number(formData.maxAmount.replace(",", "."));
      const ratePercent = Number(formData.ratePercent.replace(",", "."));

      if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
        toast.error("Informe um valor máximo válido");
        return;
      }

      if (!Number.isFinite(ratePercent) || ratePercent <= 0 || ratePercent > 100) {
        toast.error("Informe uma comissão entre 1% e 100%");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const url = editingId
        ? `${apiUrl}${API_PATHS[activeTab]}/${editingId}`
        : `${apiUrl}${API_PATHS[activeTab]}`;
      const method = editingId ? "PUT" : "POST";

      let body: Record<string, unknown>;

      if (activeTab === "suppliers") {
        body = {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
        };
      } else if (activeTab === "profitMargins") {
        body = {
          name: formData.name,
          level: Number(formData.level),
          multiplier: Number(formData.multiplier.replace(",", ".")),
        };
      } else if (activeTab === "commissionTiers") {
        body = {
          label: formData.name.trim(),
          maxAmount: Number(formData.maxAmount.replace(",", ".")),
          rate: Number(formData.ratePercent.replace(",", ".")) / 100,
          sortOrder: formData.sortOrder
            ? Number(formData.sortOrder)
            : Number(formData.maxAmount.replace(",", ".")),
        };
      } else {
        body = { name: formData.name };
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar registro");
      }

      toast.success(
        editingId
          ? `${tabLabels[activeTab].singular} atualizado com sucesso!`
          : `${tabLabels[activeTab].singular} cadastrado com sucesso!`
      );

      setShowModal(false);
      resetForm();
      await loadTabData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar registro"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = confirm(
      `Confirma exclusão deste ${tabLabels[activeTab].singular.toLowerCase()}?`
    );
    if (!ok) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}${API_PATHS[activeTab]}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir registro");

      toast.success(`${tabLabels[activeTab].singular} excluído com sucesso!`);
      await loadTabData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir registro"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setSearch("");
    loadTabData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((item) => item.name.toLowerCase().includes(term));
  }, [categories, search]);

  const filteredPlatings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return platings;
    return platings.filter((item) => item.name.toLowerCase().includes(term));
  }, [platings, search]);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((item) => {
      const haystack = [item.name, item.email, item.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [suppliers, search]);

  const filteredProfitMargins = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profitMargins;
    return profitMargins.filter((item) => {
      const haystack = [item.name, String(item.level), String(item.multiplier)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [profitMargins, search]);

  const filteredCommissionTiers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return commissionTiers;
    return commissionTiers.filter((item) => {
      const haystack = [
        item.label,
        String(item.maxAmount),
        String(item.rate),
        String(item.sortOrder),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [commissionTiers, search]);

  const itemCount =
    activeTab === "categories"
      ? filteredCategories.length
      : activeTab === "platings"
      ? filteredPlatings.length
      : activeTab === "suppliers"
      ? filteredSuppliers.length
      : activeTab === "profitMargins"
      ? filteredProfitMargins.length
      : filteredCommissionTiers.length;

  const totalCount =
    activeTab === "categories"
      ? categories.length
      : activeTab === "platings"
      ? platings.length
      : activeTab === "suppliers"
      ? suppliers.length
      : activeTab === "profitMargins"
      ? profitMargins.length
      : commissionTiers.length;

  const currentData = useMemo(() => {
    if (activeTab === "categories") return filteredCategories;
    if (activeTab === "platings") return filteredPlatings;
    if (activeTab === "suppliers") return filteredSuppliers;
    if (activeTab === "profitMargins") return filteredProfitMargins;
    return filteredCommissionTiers;
  }, [
    activeTab,
    filteredCategories,
    filteredPlatings,
    filteredSuppliers,
    filteredProfitMargins,
    filteredCommissionTiers,
  ]);

  const actionsColumn = {
    key: "actions",
    header: "Ações",
    align: "center" as const,
    headerClassName: "sticky left-0 z-20 bg-slate-800 w-[88px]",
    cellClassName: "sticky left-0 z-10 bg-white",
    render: (item: ConfigItem) => (
      <TableActions
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item.id)}
      />
    ),
  };

  const tableColumns: DataTableColumn<ConfigItem>[] = useMemo(() => {
      if (activeTab === "suppliers") {
        return [
          actionsColumn,
          {
            key: "name",
            header: "Nome",
            render: (item) => (
              <span className="font-medium text-slate-900">
                {"name" in item ? item.name : ""}
              </span>
            ),
          },
          {
            key: "email",
            header: "Email",
            render: (item) => (
              <span className="text-slate-600">
                {"email" in item ? item.email || "—" : "—"}
              </span>
            ),
          },
          {
            key: "phone",
            header: "Telefone",
            cellClassName: "whitespace-nowrap",
            render: (item) => (
              <span className="text-slate-600">
                {"phone" in item ? item.phone || "—" : "—"}
              </span>
            ),
          },
        ];
      }

      if (activeTab === "profitMargins") {
        return [
          actionsColumn,
          {
            key: "level",
            header: "Nível",
            align: "center",
            headerClassName: "w-24",
            render: (item) =>
              "level" in item ? (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {item.level}
                </span>
              ) : null,
          },
          {
            key: "name",
            header: "Nome",
            render: (item) => (
              <span className="font-medium text-slate-900">
                {"name" in item ? item.name : ""}
              </span>
            ),
          },
          {
            key: "multiplier",
            header: "Multiplicador",
            align: "right",
            render: (item) =>
              "multiplier" in item ? (
                <span className="font-semibold text-blue-700 tabular-nums">
                  × {formatMultiplier(item.multiplier)}
                </span>
              ) : null,
          },
          {
            key: "usage",
            header: "Uso",
            headerClassName: "hidden lg:table-cell",
            cellClassName: "text-slate-500 text-xs hidden lg:table-cell",
            render: (item) =>
              "multiplier" in item && "level" in item
                ? `Custo por peça × ${formatMultiplier(item.multiplier)} → Preço nível ${item.level}`
                : null,
          },
        ];
      }

      if (activeTab === "commissionTiers") {
        return [
          actionsColumn,
          {
            key: "sortOrder",
            header: "Ordem",
            align: "center",
            headerClassName: "w-20",
            render: (item) =>
              "sortOrder" in item ? (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#b8860b]/10 text-xs font-bold text-[#9a7209]">
                  {item.sortOrder}
                </span>
              ) : null,
          },
          {
            key: "label",
            header: "Faixa",
            render: (item) => (
              <span className="font-medium text-slate-900">
                {"label" in item ? item.label : ""}
              </span>
            ),
          },
          {
            key: "maxAmount",
            header: "Até valor vendido",
            align: "right",
            render: (item) =>
              "maxAmount" in item ? (
                <span className="tabular-nums text-slate-700">
                  {item.maxAmount >= 999999999
                    ? "Acima das demais faixas"
                    : formatCurrency(item.maxAmount)}
                </span>
              ) : null,
          },
          {
            key: "rate",
            header: "Comissão",
            align: "right",
            render: (item) =>
              "rate" in item ? (
                <span className="font-semibold text-[#9a7209] tabular-nums">
                  {formatCommissionRate(item.rate)}
                </span>
              ) : null,
          },
        ];
      }

      return [
        actionsColumn,
        {
          key: "name",
          header: "Nome",
          render: (item) => (
            <span className="font-medium text-slate-900">
              {"name" in item ? item.name : ""}
            </span>
          ),
        },
      ];
    }, [activeTab]);

  function renderMobileCard(item: ConfigItem) {
    if (activeTab === "suppliers") {
      const supplier = item as Supplier;
      return (
        <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
            <TableActions
              onEdit={() => handleEdit(supplier)}
              onDelete={() => handleDelete(supplier.id)}
              compact={false}
            />
          </div>
          <div className="p-4 space-y-1">
            <h3 className="font-semibold text-slate-900">{supplier.name}</h3>
            <p className="text-sm text-slate-600">{supplier.email || "—"}</p>
            <p className="text-sm text-slate-600">{supplier.phone || "—"}</p>
          </div>
        </article>
      );
    }

    if (activeTab === "profitMargins") {
      const margin = item as ProfitMargin;
      return (
        <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
            <TableActions
              onEdit={() => handleEdit(margin)}
              onDelete={() => handleDelete(margin.id)}
              compact={false}
            />
            <span className="ml-auto text-xs font-mono text-slate-500">
              Nível {margin.level}
            </span>
          </div>
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">{margin.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Multiplicador do custo por peça
              </p>
            </div>
            <span className="text-lg font-bold text-blue-700 tabular-nums">
              × {formatMultiplier(margin.multiplier)}
            </span>
          </div>
        </article>
      );
    }

    if (activeTab === "commissionTiers") {
      const tier = item as CommissionTier;
      return (
        <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
            <TableActions
              onEdit={() => handleEdit(tier)}
              onDelete={() => handleDelete(tier.id)}
              compact={false}
            />
            <span className="ml-auto text-xs font-mono text-slate-500">
              Ordem {tier.sortOrder}
            </span>
          </div>
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">{tier.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Até {tier.maxAmount >= 999999999 ? "valor acima das faixas" : formatCurrency(tier.maxAmount)}
              </p>
            </div>
            <span className="text-lg font-bold text-[#9a7209] tabular-nums">
              {formatCommissionRate(tier.rate)}
            </span>
          </div>
        </article>
      );
    }

    const named = item as NamedItem;
    return (
      <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
          <TableActions
            onEdit={() => handleEdit(named)}
            onDelete={() => handleDelete(named.id)}
            compact={false}
          />
          <span className="ml-auto font-semibold text-slate-800">{named.name}</span>
        </div>
      </article>
    );
  }

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
              Configurações
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Gerencie categorias, banhos, fornecedores, margens e comissão.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
              {tabLabels[activeTab].title}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {tabLabels[activeTab].subtitle}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-xl">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar registros..."
                className="w-full h-11 pl-4 pr-4 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                {itemCount} de {totalCount}
              </span>
            </div>
            <Button
              type="button"
              variant="primary"
              className="shrink-0"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              Novo {tabLabels[activeTab].singular}
            </Button>
          </div>

          <DataTable<ConfigItem>
            key={activeTab}
            data={currentData}
            columns={tableColumns}
            rowKey={(item) => item.id}
            isLoading={isLoading}
            emptyMessage={tabLabels[activeTab].empty}
            minWidth={
              activeTab === "suppliers"
                ? "640px"
                : activeTab === "profitMargins" || activeTab === "commissionTiers"
                ? "560px"
                : undefined
            }
            mobileCardRender={renderMobileCard}
          />

          <Modal
            open={showModal}
            title={
              editingId
                ? `Editar ${tabLabels[activeTab].singular}`
                : `Novo ${tabLabels[activeTab].singular}`
            }
            onClose={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {activeTab === "profitMargins" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nível *
                    </label>
                    <input
                      type="number"
                      name="level"
                      min={1}
                      value={formData.level}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Multiplicador *
                    </label>
                    <input
                      type="number"
                      name="multiplier"
                      step="0.01"
                      min="0.01"
                      value={formData.multiplier}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                      placeholder="1,5"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Ex.: 1,5 = 50% de margem sobre o custo
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "commissionTiers" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Valor máximo (R$) *
                    </label>
                    <input
                      type="number"
                      name="maxAmount"
                      step="0.01"
                      min="0.01"
                      value={formData.maxAmount}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Comissão (%) *
                    </label>
                    <input
                      type="number"
                      name="ratePercent"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={formData.ratePercent}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Ordem
                    </label>
                    <input
                      type="number"
                      name="sortOrder"
                      min={1}
                      value={formData.sortOrder}
                      onChange={handleChange}
                      className={fieldInputClass}
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {activeTab === "commissionTiers" ? "Nome da faixa *" : "Nome *"}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Digite o nome"
                  required
                  className={fieldInputClass}
                />
              </div>

              {activeTab === "suppliers" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="fornecedor@email.com"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(11) 99999-9999"
                      className={fieldInputClass}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Salvando..."
                    : editingId
                    ? "Salvar alterações"
                    : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
