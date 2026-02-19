"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "../components/MainLayout";
import TextInput from "../components/TextInput";

export default function CadastroItem() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    category: "Anéis",
    price: "",
    description: "",
    material: "",
    weight: "",
    stock: "",
    color: "",
  });

  const categories = ["Anéis", "Colares", "Brincos", "Pulseiras"];
  const materials = ["Ouro", "Prata", "Platina", "Diamante", "Pérola"];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Produto cadastrado:", formData);
    // Aqui você pode fazer a requisição para o backend
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
            Cadastrar Novo Produto
          </h1>
          <p className="text-slate-600">
            Preencha os detalhes do novo item para sua coleção
          </p>
        </div>

        {/* Form Container */}
        <div className="max-w-4xl">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grid 2 colunas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome do Produto */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nome do Produto *
                  </label>
                  <TextInput
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Anel de Diamante"
                    required
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preço */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Preço (R$) *
                  </label>
                  <TextInput
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="1299.99"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {/* Material */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Material *
                  </label>
                  <select
                    name="material"
                    value={formData.material}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Selecione um material</option>
                    {materials.map((mat) => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Peso */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Peso (g)
                  </label>
                  <TextInput
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="5.5"
                    step="0.1"
                    min="0"
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cor
                  </label>
                  <TextInput
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="Ex: Ouro Amarelo"
                  />
                </div>

                {/* Estoque */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Quantidade em Estoque *
                  </label>
                  <TextInput
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="10"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Descrição - Full Width */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Descrição *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descreva os detalhes do produto..."
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
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
                  Cadastrar Produto
                </button>
              </div>
            </form>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Os campos marcados com * são obrigatórios.
              Certifique-se de preencher todas as informações necessárias para
              uma melhor experiência do cliente.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
