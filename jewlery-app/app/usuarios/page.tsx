"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "../components/MainLayout";
import TextInput from "../components/TextInput";

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

  const roles = [
    { value: "admin", label: "Administrador" },
    { value: "vendedor", label: "Vendedor" },
    { value: "cliente", label: "Cliente" },
  ];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar senhas
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("As senhas não correspondem!");
      return;
    }

    if (formData.password.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres!");
      return;
    }

    console.log("Usuário cadastrado:", {
      name: formData.name,
      email: formData.email,
      cpf: formData.cpf,
      phone: formData.phone,
      role: formData.role,
      address: formData.address,
      city: formData.city,
      state: formData.state,
    });

    router.push("/dashboard");
  };

  const handleCancel = () => {
    router.push("/dashboard");
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Cadastrar Novo Usuário
          </h1>
          <p className="text-slate-600">
            Adicione um novo usuário ao sistema
          </p>
        </div>

        {/* Form Container */}
        <div className="max-w-4xl">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grid 2 colunas - Dados Pessoais */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Dados Pessoais
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
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

                  {/* CPF */}
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

                  {/* Email */}
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

                  {/* Telefone */}
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

              {/* Divider */}
              <div className="border-t border-slate-200"></div>

              {/* Dados de Acesso */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Dados de Acesso
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Senha */}
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

                  {/* Confirmar Senha */}
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

                {/* Password Error */}
                {passwordError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{passwordError}</p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200"></div>

              {/* Grid 2 colunas - Cargo e Endereço */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Informações Adicionais
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Cargo */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tipo de Usuário *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      className="w-full h-12 px-4 pl-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      {roles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Endereço */}
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

                  {/* Cidade */}
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

                  {/* Estado */}
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

              {/* Divider */}
              <div className="border-t border-slate-200"></div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-medium shadow-md"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Os campos marcados com * são obrigatórios.
              A senha deve ter no mínimo 6 caracteres.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
