"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import RequireAuth from "../components/RequireAuth";

import TextInput from "../components/TextInput";

interface Product {
  id: number;
  name: string;
  price: number;
}

// Produtos disponíveis para montar os kits
const availableProducts: Product[] = [
  { id: 1, name: "Anel de Diamante", price: 1299.99 },
  { id: 2, name: "Colar de Ouro", price: 899.99 },
  { id: 3, name: "Brinco de Pérola", price: 599.99 },
  { id: 4, name: "Pulseira de Ouro", price: 799.99 },
  { id: 5, name: "Colar de Safira", price: 1599.99 },
  { id: 6, name: "Anel de Esmeralda", price: 1399.99 },
  { id: 7, name: "Brinco de Diamante", price: 1199.99 },
  { id: 8, name: "Pulseira de Diamante", price: 1499.99 },
];

export default function MontarKit() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedProducts: [] as number[],
    kitPrice: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductToggle = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId],
    }));
  };

  const calculateTotalPrice = () => {
    return availableProducts
      .filter((p) => formData.selectedProducts.includes(p.id))
      .reduce((sum, p) => sum + p.price, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedProducts.length === 0) {
      alert("Selecione pelo menos um produto para o kit!");
      return;
    }
    console.log("Kit criado:", {
      ...formData,
      totalPrice: formData.kitPrice || calculateTotalPrice(),
    });
    router.push("/dashboard");
  };

  const totalPrice = calculateTotalPrice();
  const kitPrice = formData.kitPrice
    ? parseFloat(formData.kitPrice)
    : totalPrice;

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Montar Kit de Joias
            </h1>
            <p className="text-slate-600">
              Combine produtos para criar kits exclusivos
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nome do Kit */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nome do Kit *
                    </label>
                    <TextInput
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ex: Kit Noiva Elegância"
                      required
                    />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Descrição *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descreva o kit e sua ocasião de uso..."
                      required
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    />
                  </div>

                  {/* Preço Personalizado */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Preço do Kit (opcional)
                    </label>
                    <TextInput
                      type="number"
                      name="kitPrice"
                      value={formData.kitPrice}
                      onChange={handleChange}
                      placeholder="Deixe em branco para usar o preço total dos produtos"
                      step="0.01"
                      min="0"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Se deixar em branco, o preço será calculado
                      automaticamente
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200"></div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-medium shadow-md"
                    >
                      Criar Kit
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Products Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Selecionar Produtos
                </h2>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableProducts.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedProducts.includes(product.id)}
                        onChange={() => handleProductToggle(product.id)}
                        className="w-4 h-4 mt-1 accent-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          R$ {product.price.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Summary */}
                <div className="border-t border-slate-200 mt-4 pt-4">
                  <div className="mb-3">
                    <p className="text-sm text-slate-600">
                      Produtos selecionados:{" "}
                      <span className="font-bold text-slate-900">
                        {formData.selectedProducts.length}
                      </span>
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">Preço Total</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {kitPrice.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
