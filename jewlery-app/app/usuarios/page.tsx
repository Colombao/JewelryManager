"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";
import Button from "../components/Button";
import DataTable, { DataTableColumn } from "../components/DataTable";
import MainLayout from "../components/MainLayout";
import RequireAuth from "../components/RequireAuth";
import TableActions, { StatusBadge } from "../components/TableActions";

import Modal from "../components/Modal";
import TextInput from "../components/TextInput";

interface Reseller {
  id: number;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  active: boolean;
}

export default function CadastroUsuario() {
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

  const [resellers, setResellers] = useState<Reseller[]>([]);
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

  const resellerColumns: DataTableColumn<Reseller>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Ações",
        align: "center",
        headerClassName: "sticky left-0 z-20 bg-slate-800 w-[108px]",
        cellClassName: "sticky left-0 z-10 bg-white",
        render: (r) => (
          <TableActions
            onEdit={() => handleEdit(r)}
            onDelete={() => handleDelete(r.id)}
            onToggle={() => handleToggleActive(r.id, r.active)}
            isActive={r.active}
          />
        ),
      },
      {
        key: "name",
        header: "Nome",
        render: (r) => (
          <span className="font-medium text-slate-900">{r.name}</span>
        ),
      },
      {
        key: "email",
        header: "Email",
        cellClassName: "text-slate-600",
        render: (r) => r.email,
      },
      {
        key: "cpf",
        header: "CPF",
        cellClassName: "text-slate-600 whitespace-nowrap",
        render: (r) => r.cpf,
      },
      {
        key: "phone",
        header: "Telefone",
        cellClassName: "text-slate-600 whitespace-nowrap",
        render: (r) => r.phone,
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        render: (r) => <StatusBadge active={r.active} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const renderResellerMobileCard = (r: Reseller) => (
    <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
        <TableActions
          onEdit={() => handleEdit(r)}
          onDelete={() => handleDelete(r.id)}
          onToggle={() => handleToggleActive(r.id, r.active)}
          isActive={r.active}
          compact={false}
        />
        <StatusBadge active={r.active} />
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-semibold text-slate-900">{r.name}</h3>
        <p className="text-sm text-slate-600">{r.email}</p>
        <p className="text-sm text-slate-600">{r.cpf}</p>
        <p className="text-sm text-slate-600">{r.phone}</p>
      </div>
    </article>
  );

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
              Revendedores
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Gerencie revendedores: visualizar, criar, editar e excluir.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                Novo Revendedor
              </Button>
            </div>
          </div>

          <div className="max-w-full">
            <DataTable
              data={resellers}
              columns={resellerColumns}
              rowKey={(r) => r.id}
              isLoading={isLoading}
              emptyMessage="Nenhum revendedor cadastrado."
              loadingMessage="Carregando revendedores..."
              minWidth="720px"
              mobileCardRender={renderResellerMobileCard}
            />

            <Modal
              open={showModal}
              title={editingId ? "Editar Revendedor" : "Novo Revendedor"}
              onClose={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Grid 2 colunas - Dados Pessoais */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Dados Pessoais
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Nome Completo *
                      </label>
                      <TextInput
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ex: João Silva"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        CPF *
                      </label>
                      <TextInput
                        type="text"
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleChange}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email *
                      </label>
                      <TextInput
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="usuario@email.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Telefone *
                      </label>
                      <TextInput
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="(11) 99999-9999"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200"></div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Dados de Acesso
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Senha *
                      </label>
                      <TextInput
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Confirmar Senha *
                      </label>
                      <TextInput
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Repita a senha"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200"></div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Informações Adicionais
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Endereço
                      </label>
                      <TextInput
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Rua, número e complemento"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Cidade
                      </label>
                      <TextInput
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Estado
                      </label>
                      <TextInput
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

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
