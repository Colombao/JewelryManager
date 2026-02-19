"use client";

import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  gradient: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "Anel de Diamante",
    category: "Anéis",
    price: 1299.99,
    rating: 4.8,
    reviews: 124,
    gradient: "from-pink-400 to-rose-500",
  },
  {
    id: 2,
    name: "Colar de Ouro",
    category: "Colares",
    price: 899.99,
    rating: 4.6,
    reviews: 89,
    gradient: "from-yellow-300 to-yellow-500",
  },
  {
    id: 3,
    name: "Brinco de Pérola",
    category: "Brincos",
    price: 599.99,
    rating: 4.9,
    reviews: 156,
    gradient: "from-purple-300 to-purple-500",
  },
  {
    id: 4,
    name: "Pulseira de Ouro",
    category: "Pulseiras",
    price: 799.99,
    rating: 4.7,
    reviews: 92,
    gradient: "from-amber-300 to-amber-500",
  },
  {
    id: 5,
    name: "Colar de Safira",
    category: "Colares",
    price: 1599.99,
    rating: 4.9,
    reviews: 201,
    gradient: "from-blue-400 to-blue-600",
  },
  {
    id: 6,
    name: "Anel de Esmeralda",
    category: "Anéis",
    price: 1399.99,
    rating: 4.8,
    reviews: 178,
    gradient: "from-green-400 to-emerald-500",
  },
  {
    id: 7,
    name: "Brinco de Diamante",
    category: "Brincos",
    price: 1199.99,
    rating: 4.7,
    reviews: 143,
    gradient: "from-cyan-300 to-blue-400",
  },
  {
    id: 8,
    name: "Pulseira de Diamante",
    category: "Pulseiras",
    price: 1499.99,
    rating: 4.9,
    reviews: 198,
    gradient: "from-slate-300 to-slate-400",
  },
];

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [priceRange, setPriceRange] = useState(2000);
  const [favorites, setFavorites] = useState<number[]>([]);

  const categories = ["Todos", "Anéis", "Colares", "Brincos", "Pulseiras"];

  const filteredProducts = products.filter((product) => {
    const categoryMatch =
      selectedCategory === "Todos" || product.category === selectedCategory;
    const priceMatch = product.price <= priceRange;
    return categoryMatch && priceMatch;
  });

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Nossas Joias Exquisitas
          </h1>
          <p className="text-slate-600">
            Descubra nossa coleção exclusiva de joias elegantes
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Filtros</h2>

              {/* Category Filter */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                  Categoria
                </h3>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`block w-full text-left px-4 py-2 rounded-lg transition text-sm font-medium ${
                        selectedCategory === category
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                  Preço
                </h3>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between mt-3">
                  <span className="text-sm text-slate-600">R$ 0</span>
                  <span className="text-sm font-bold text-slate-900">
                    R$ {priceRange.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-slate-600">
                {filteredProducts.length} produtos encontrados
              </p>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden group"
                  >
                    {/* Product Image Placeholder */}
                    <div
                      className={`relative w-full h-64 bg-gradient-to-br ${product.gradient} flex items-center justify-center overflow-hidden`}
                    >
                      <div className="text-white text-6xl opacity-50 group-hover:scale-110 transition duration-300">
                        ✨
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(product.id)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition"
                      >
                        <span
                          className={`text-lg ${
                            favorites.includes(product.id)
                              ? "text-red-500"
                              : "text-slate-400"
                          }`}
                        >
                          {favorites.includes(product.id) ? "❤️" : "🤍"}
                        </span>
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-5">
                      <h3 className="font-bold text-slate-900 mb-2">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={
                                i < Math.floor(product.rating)
                                  ? "text-yellow-400"
                                  : "text-slate-300"
                              }
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-slate-600">
                          ({product.reviews})
                        </span>
                      </div>

                      {/* Price and Button */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            R$ {product.price.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-sm font-medium">
                          Comprar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600">
                  Nenhum produto encontrado com os filtros selecionados.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
