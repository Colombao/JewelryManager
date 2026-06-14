"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";
import TextInput from "../components/TextInput";

type TabId = "categories" | "platings" | "suppliers";

interface NamedItem {
  id: number;
  name: string;
}

interface Supplier extends NamedItem {
  email: string | null;
  phone: string | null;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "categories", label: "Categorias" },
  { id: "platings", label: "Tipos de Banho" },
  { id: "suppliers", label: "Fornecedores" },
];

const API_PATHS: Record<TabId, string> = {
  categories: "/categories",
  platings: "/platings",
  suppliers: "/suppliers",
};

export default function ConfiguracoesPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const [activeTab, setActiveTab] = useState<TabId>("categories");
  const [categories, setCategories] = useState<NamedItem[]>([]);
  const [platings, setPlatings] = useState<NamedItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const tabLabels: Record<TabId, { title: string; singular: string; empty: string }> = {
    categories: {
      title: "Categorias de Produto",
      singular: "Categoria",
      empty: "Nenhuma categoria cadastrada.",
    },
    platings: {
      title: "Tipos de Banho",
      singular: "Tipo de Banho",
      empty: "Nenhum tipo de banho cadastrado.",
    },
    suppliers: {
      title: "Fornecedores",
      singular: "Fornecedor",
      empty: "Nenhum fornecedor cadastrado.",
    },
  };

  function resetForm() {
    setFormData({ name: "", email: "", phone: "" });
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar dados"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleEdit(item: NamedItem | Supplier) {
    setEditingId(item.id);
    setFormData({
      name: item.name || "",
      email: "email" in item ? item.email || "" : "",
      phone: "phone" in item ? item.phone || "" : "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingId
        ? `${apiUrl}${API_PATHS[activeTab]}/${editingId}`
        : `${apiUrl}${API_PATHS[activeTab]}`;
      const method = editingId ? "PUT" : "POST";

      const body =
        activeTab === "suppliers"
          ? {
              name: formData.name,
              email: formData.email || null,
              phone: formData.phone || null,
            }
          : { name: formData.name };

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
    loadTabData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentItems =
    activeTab === "categories"
      ? categories
      : activeTab === "platings"
      ? platings
      : suppliers;

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Configurações
            </h1>
            <p className="text-slate-600">
              Gerencie categorias, tipos de banho e fornecedores do sistema.
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

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              {tabLabels[activeTab].title}
            </h2>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              Novo {tabLabels[activeTab].singular}
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left table-auto">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-700 uppercase tracking-wide">
                    <th className="px-4 py-3">Nome</th>
                    {activeTab === "suppliers" && (
                      <>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Telefone</th>
                      </>
                    )}
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={activeTab === "suppliers" ? 4 : 2}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        {isLoading ? (
                          <div className="animate-pulse">Carregando...</div>
                        ) : (
                          tabLabels[activeTab].empty
                        )}
                      </td>
                    </tr>
                  )}

                  {activeTab !== "suppliers" &&
                    (currentItems as NamedItem[]).map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-t ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                        } hover:bg-slate-100`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {item.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-sm px-3 py-1"
                              onClick={() => handleEdit(item)}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-sm px-3 py-1"
                              onClick={() => handleDelete(item.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {activeTab === "suppliers" &&
                    suppliers.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-t ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                        } hover:bg-slate-100`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.email || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.phone || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-sm px-3 py-1"
                              onClick={() => handleEdit(item)}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-sm px-3 py-1"
                              onClick={() => handleDelete(item.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome *
                </label>
                <TextInput
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Digite o nome"
                  required
                  className="!pl-3"
                />
              </div>

              {activeTab === "suppliers" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email
                    </label>
                    <TextInput
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="fornecedor@email.com"
                      className="!pl-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Telefone
                    </label>
                    <TextInput
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(11) 99999-9999"
                      className="!pl-3"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-4">
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
                    ? "Salvar Alterações"
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
