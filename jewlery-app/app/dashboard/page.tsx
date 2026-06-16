"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";
import Button from "../components/Button";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";

export default function Dashboard() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    phone: "",
    role: "cliente",
    address: "",
    city: "",
    state: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const [resellers, setResellers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear password error when user changes a password field
    if ((name === "password" || name === "confirmPassword") && passwordError) {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar senhas
    if (formData.password !== formData.confirmPassword) {
      const msg = "As senhas não correspondem!";
      setPasswordError(msg);
      toast.error(msg);
      return;
    }

    if (formData.password.length < 6) {
      const msg = "A senha deve ter pelo menos 6 caracteres!";
      setPasswordError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    setGeneralError("");

    try {
      const url = editingId
        ? `${apiUrl}/resellers/${editingId}`
        : `${apiUrl}/resellers`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          cpf: formData.cpf,
          phone: formData.phone,
          role: formData.role,
          address: formData.address,
          city: formData.city,
          state: formData.state,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          data?.error ||
          (editingId
            ? "Erro ao atualizar revendedor"
            : "Erro ao cadastrar revendedor");
        throw new Error(msg);
      }

      toast.success(
        editingId
          ? "Revendedor atualizado com sucesso!"
          : "Revendedor cadastrado com sucesso!"
      );
      // Refresh list and reset form
      await loadResellers();
      resetForm();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao cadastrar revendedor";
      setGeneralError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // if editing, cancel edit, else navigate back
    if (editingId) {
      resetForm();
      return;
    }
    router.push("/usuarios");
  };

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      cpf: "",
      phone: "",
      role: "cliente",
      address: "",
      city: "",
      state: "",
    });
    setEditingId(null);
    setPasswordError("");
    setGeneralError("");
  }

  async function loadResellers() {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/resellers`);
      if (!res.ok) throw new Error("Erro ao buscar revendedores");
      const list = await res.json();
      setResellers(list);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao buscar revendedores"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(item: any) {
    setEditingId(item.id);
    setFormData({
      name: item.name || "",
      email: item.email || "",
      password: "",
      confirmPassword: "",
      cpf: item.cpf || "",
      phone: item.phone || "",
      role: item.role || "cliente",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
    });
    setShowModal(true);
  }

  async function handleToggleActive(id: number, current: boolean) {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/resellers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      toast.success(!current ? "Revendedor ativado" : "Revendedor desativado");
      await loadResellers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar status");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = confirm("Confirma exclusão deste revendedor?");
    if (!ok) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/resellers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir revendedor");
      toast.success("Revendedor excluído");
      await loadResellers();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao excluir revendedor"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadResellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Produtos</h1>
            <p className="text-slate-600">
              Gerencie produtos: visualizar, criar, editar e excluir.
            </p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                Novo Produto
              </Button>
            </div>
          </div>

          <div className="max-w-full">
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                  <thead className="bg-slate-50">
                    <tr className="text-sm text-slate-700 uppercase tracking-wide">
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">CPF</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">Ativo</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resellers.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          {isLoading ? (
                            <div className="animate-pulse">
                              Carregando produtos...
                            </div>
                          ) : (
                            "Nenhum produto cadastrado."
                          )}
                        </td>
                      </tr>
                    )}
                    {resellers.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`border-t ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                        } hover:bg-slate-100`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.email}</td>
                        <td className="px-4 py-3 text-slate-600">{r.cpf}</td>
                        <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.active ? "Sim" : "Não"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-sm px-3 py-1"
                              onClick={() => {
                                handleEdit(r);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-sm px-3 py-1"
                              onClick={() => handleDelete(r.id)}
                            >
                              Excluir
                            </Button>
                            <Button
                              type="button"
                              variant={`${r.active ? "danger" : "success"}`}
                              className="text-sm px-3 py-1"
                              onClick={() => handleToggleActive(r.id, r.active)}
                            >
                              {r.active ? "Desativar" : "Ativar"}
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
              title={editingId ? "Editar Produto" : "Novo Produto"}
              onClose={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
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
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
