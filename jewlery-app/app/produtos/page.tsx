"use client";

import MainLayout from "../components/MainLayout";
import RequireAuth from "../components/RequireAuth";

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

export default function Produtos() {
  return (
    <RequireAuth>
      <MainLayout>
        <h1 className="text-2xl font-bold mb-4">Produtos</h1>
        <p className="mb-4"></p>
      </MainLayout>
    </RequireAuth>
  );
}
