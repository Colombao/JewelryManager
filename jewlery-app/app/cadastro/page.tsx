"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";
import TextInput from "../components/TextInput";

interface NamedItem {
  id: number;
  name: string;
}

interface Product {
  id: number;
  code: string | null;
  sku: string | null;
  reference: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  image: string | null;
  supplierId: number | null;
  categoryId: number | null;
  platingTypeId: number | null;
  collectionId: number | null;
  quantity: number;
  weight: string | null;
  unitPrice: string | null;
  totalPrice: string | null;
  platingTotal: string | null;
  piecesTotal: string | null;
  grandTotal: string | null;
  priceLevel1: string | null;
  priceLevel2: string | null;
  priceLevel3: string | null;
  adjustedPrice: string | null;
  active: boolean;
  supplier?: NamedItem | null;
  category?: NamedItem | null;
  platingType?: NamedItem | null;
  collection?: NamedItem | null;
}

const initialFormData = {
  code: "",
  sku: "",
  reference: "",
  barcode: "",
  name: "",
  description: "",
  image: "",
  supplierId: "",
  categoryId: "",
  platingTypeId: "",
  collectionId: "",
  quantity: "0",
  weight: "",
  unitPrice: "",
  totalPrice: "",
  platingTotal: "",
  piecesTotal: "",
  grandTotal: "",
  priceLevel1: "",
  priceLevel2: "",
  priceLevel3: "",
  adjustedPrice: "",
  active: true,
};

function formatDecimal(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function truncate(text: string | null | undefined, max = 40) {
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function toNum(value: string) {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function resolveImageUrl(image: string | null | undefined, apiUrl: string) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${apiUrl}${image.startsWith("/") ? image : `/${image}`}`;
}

export default function CadastroItem() {
  const [formData, setFormData] = useState(initialFormData);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<NamedItem[]>([]);
  const [categories, setCategories] = useState<NamedItem[]>([]);
  const [platings, setPlatings] = useState<NamedItem[]>([]);
  const [collections, setCollections] = useState<NamedItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  function clearImageSelection() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
  }

  function resetForm() {
    setFormData(initialFormData);
    setEditingId(null);
    clearImageSelection();
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch(`${apiUrl}/upload/product-image`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Erro ao enviar imagem");
    }

    return data.url as string;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB");
      return;
    }

    clearImageSelection();
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function loadProducts() {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/products`);
      if (!res.ok) throw new Error("Erro ao buscar produtos");
      const list = await res.json();
      setProducts(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar produtos");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLookups() {
    try {
      const [suppliersRes, categoriesRes, platingsRes, collectionsRes] =
        await Promise.all([
          fetch(`${apiUrl}/suppliers`),
          fetch(`${apiUrl}/categories`),
          fetch(`${apiUrl}/platings`),
          fetch(`${apiUrl}/collections`),
        ]);

      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (platingsRes.ok) setPlatings(await platingsRes.json());
      if (collectionsRes.ok) setCollections(await collectionsRes.json());
    } catch {
      toast.error("Erro ao carregar opções do formulário");
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  function buildPayload(imageUrl?: string | null) {
    return {
      code: formData.code || null,
      sku: formData.sku || null,
      reference: formData.reference || null,
      barcode: formData.barcode || null,
      name: formData.name.trim(),
      description: formData.description || null,
      image: (imageUrl ?? formData.image) || null,
      supplierId: formData.supplierId ? Number(formData.supplierId) : null,
      categoryId: formData.categoryId ? Number(formData.categoryId) : null,
      platingTypeId: formData.platingTypeId
        ? Number(formData.platingTypeId)
        : null,
      collectionId: formData.collectionId
        ? Number(formData.collectionId)
        : null,
      quantity: Number(formData.quantity || 0),
      weight: formData.weight || null,
      unitPrice: formData.unitPrice || null,
      totalPrice: formData.totalPrice || null,
      platingTotal: formData.platingTotal || null,
      piecesTotal: formData.piecesTotal || null,
      grandTotal: formData.grandTotal || null,
      priceLevel1: formData.priceLevel1 || null,
      priceLevel2: formData.priceLevel2 || null,
      priceLevel3: formData.priceLevel3 || null,
      adjustedPrice: formData.adjustedPrice || null,
      active: formData.active,
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = formData.image || null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const url = editingId
        ? `${apiUrl}/products/${editingId}`
        : `${apiUrl}/products`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(imageUrl)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (editingId
              ? "Erro ao atualizar produto"
              : "Erro ao cadastrar produto")
        );
      }

      toast.success(
        editingId
          ? "Produto atualizado com sucesso!"
          : "Produto cadastrado com sucesso!"
      );

      setShowModal(false);
      resetForm();
      await loadProducts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar produto"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleEdit(item: Product) {
    clearImageSelection();
    setEditingId(item.id);
    setFormData({
      code: item.code || "",
      sku: item.sku || "",
      reference: item.reference || "",
      barcode: item.barcode || "",
      name: item.name || "",
      description: item.description || "",
      image: item.image || "",
      supplierId: item.supplierId?.toString() || "",
      categoryId: item.categoryId?.toString() || "",
      platingTypeId: item.platingTypeId?.toString() || "",
      collectionId: item.collectionId?.toString() || "",
      quantity: item.quantity?.toString() || "0",
      weight: item.weight || "",
      unitPrice: item.unitPrice || "",
      totalPrice: item.totalPrice || "",
      platingTotal: item.platingTotal || "",
      piecesTotal: item.piecesTotal || "",
      grandTotal: item.grandTotal || "",
      priceLevel1: item.priceLevel1 || "",
      priceLevel2: item.priceLevel2 || "",
      priceLevel3: item.priceLevel3 || "",
      adjustedPrice: item.adjustedPrice || "",
      active: item.active,
    });
    if (item.image) {
      setImagePreview(resolveImageUrl(item.image, apiUrl));
    }
    setShowModal(true);
  }

  async function handleToggleActive(id: number, current: boolean) {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      toast.success(!current ? "Produto ativado" : "Produto desativado");
      await loadProducts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar status");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = confirm("Confirma exclusão deste produto?");
    if (!ok) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir produto");
      toast.success("Produto excluído");
      await loadProducts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir produto");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const qty = toNum(formData.quantity);
    const unit = toNum(formData.unitPrice);
    const plating = toNum(formData.platingTotal);

    const total = qty * unit;
    const pieces = total;
    const grand = pieces + plating;

    setFormData((prev) => {
      const next = { ...prev };

      if (qty > 0 || unit > 0) {
        next.totalPrice = formatMoney(total);
        next.piecesTotal = formatMoney(pieces);
      }

      if (pieces > 0 || plating > 0) {
        next.grandTotal = formatMoney(grand);
        if (grand > 0) {
          next.priceLevel1 = formatMoney(grand * 1.5);
          next.priceLevel2 = formatMoney(grand * 2.0);
          next.priceLevel3 = formatMoney(grand * 2.5);
        }
      }

      const changed =
        prev.totalPrice !== next.totalPrice ||
        prev.piecesTotal !== next.piecesTotal ||
        prev.grandTotal !== next.grandTotal ||
        prev.priceLevel1 !== next.priceLevel1 ||
        prev.priceLevel2 !== next.priceLevel2 ||
        prev.priceLevel3 !== next.priceLevel3;

      return changed ? next : prev;
    });
  }, [formData.quantity, formData.unitPrice, formData.platingTotal]);

  const selectClass =
    "w-full h-12 px-3 rounded-md border border-slate-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white";

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Produtos</h1>
            <p className="text-slate-600">
              Gerencie produtos: visualizar, criar, editar e excluir.
            </p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div />
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

          <div className="max-w-full">
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-auto min-w-[2400px]">
                  <thead className="bg-slate-50">
                    <tr className="text-xs text-slate-700 uppercase tracking-wide">
                      <th className="px-3 py-3 whitespace-nowrap">Código</th>
                      <th className="px-3 py-3 whitespace-nowrap">SKU</th>
                      <th className="px-3 py-3 whitespace-nowrap">Referência</th>
                      <th className="px-3 py-3 whitespace-nowrap">Cód. Barras</th>
                      <th className="px-3 py-3 whitespace-nowrap">Nome</th>
                      <th className="px-3 py-3 whitespace-nowrap">Descrição</th>
                      <th className="px-3 py-3 whitespace-nowrap">Imagem</th>
                      <th className="px-3 py-3 whitespace-nowrap">Fornecedor</th>
                      <th className="px-3 py-3 whitespace-nowrap">Categoria</th>
                      <th className="px-3 py-3 whitespace-nowrap">Banho</th>
                      <th className="px-3 py-3 whitespace-nowrap">Coleção</th>
                      <th className="px-3 py-3 whitespace-nowrap">Qtd</th>
                      <th className="px-3 py-3 whitespace-nowrap">Peso</th>
                      <th className="px-3 py-3 whitespace-nowrap">Preço Unit.</th>
                      <th className="px-3 py-3 whitespace-nowrap">Total</th>
                      <th className="px-3 py-3 whitespace-nowrap">Banho Total</th>
                      <th className="px-3 py-3 whitespace-nowrap">Peças Total</th>
                      <th className="px-3 py-3 whitespace-nowrap">Total Geral</th>
                      <th className="px-3 py-3 whitespace-nowrap">Nível 1</th>
                      <th className="px-3 py-3 whitespace-nowrap">Nível 2</th>
                      <th className="px-3 py-3 whitespace-nowrap">Nível 3</th>
                      <th className="px-3 py-3 whitespace-nowrap">Preço Ajust.</th>
                      <th className="px-3 py-3 whitespace-nowrap">Ativo</th>
                      <th className="px-3 py-3 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 && (
                      <tr>
                        <td
                          colSpan={24}
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
                    {products.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`border-t text-sm ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                        } hover:bg-slate-100`}
                      >
                        <td className="px-3 py-3 text-slate-600">{p.code || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{p.sku || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{p.reference || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{p.barcode || "-"}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{p.name}</td>
                        <td className="px-3 py-3 text-slate-600">{truncate(p.description)}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveImageUrl(p.image, apiUrl) ?? ""}
                              alt={p.name}
                              className="h-10 w-10 rounded object-cover border border-slate-200"
                            />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{p.supplier?.name || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{p.category?.name || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{p.platingType?.name || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{p.collection?.name || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{p.quantity}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.weight)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.unitPrice)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.totalPrice)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.platingTotal)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.piecesTotal)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.grandTotal)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.priceLevel1)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.priceLevel2)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.priceLevel3)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDecimal(p.adjustedPrice)}</td>
                        <td className="px-3 py-3 text-slate-600">{p.active ? "Sim" : "Não"}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-sm px-3 py-1"
                              onClick={() => handleEdit(p)}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-sm px-3 py-1"
                              onClick={() => handleDelete(p.id)}
                            >
                              Excluir
                            </Button>
                            <Button
                              type="button"
                              variant={p.active ? "danger" : "success"}
                              className="text-sm px-3 py-1"
                              onClick={() => handleToggleActive(p.id, p.active)}
                            >
                              {p.active ? "Desativar" : "Ativar"}
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
              size="2xl"
              title={editingId ? "Editar Produto" : "Novo Produto"}
              onClose={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <section>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                      Identificação
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Código" name="code" value={formData.code} onChange={handleChange} />
                      <Field label="SKU" name="sku" value={formData.sku} onChange={handleChange} />
                      <Field label="Referência" name="reference" value={formData.reference} onChange={handleChange} />
                      <Field label="Código de Barras" name="barcode" value={formData.barcode} onChange={handleChange} />
                    </div>
                  </section>

                  <section>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                      Relacionamentos
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="Fornecedor" name="supplierId" value={formData.supplierId} onChange={handleChange} options={suppliers} className={selectClass} />
                      <SelectField label="Categoria" name="categoryId" value={formData.categoryId} onChange={handleChange} options={categories} className={selectClass} />
                      <SelectField label="Tipo de Banho" name="platingTypeId" value={formData.platingTypeId} onChange={handleChange} options={platings} className={selectClass} />
                      <SelectField label="Coleção" name="collectionId" value={formData.collectionId} onChange={handleChange} options={collections} className={selectClass} />
                    </div>
                  </section>
                </div>

                <section>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                    Informações Básicas
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <Field label="Nome *" name="name" value={formData.name} onChange={handleChange} required />
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Imagem do Produto
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG ou WEBP — máx. 5 MB</p>
                    </div>
                    <div className="flex items-end">
                      {imagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-24 w-24 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                          Sem imagem
                        </div>
                      )}
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Descrição
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 rounded-md border border-slate-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="Descrição do produto"
                      />
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <section>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                      Estoque
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Quantidade" name="quantity" type="number" value={formData.quantity} onChange={handleChange} />
                      <Field label="Peso (kg)" name="weight" type="number" step="0.001" value={formData.weight} onChange={handleChange} />
                    </div>
                  </section>

                  <section>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                      Custos
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <Field label="Preço Unitário" name="unitPrice" type="number" step="0.01" value={formData.unitPrice} onChange={handleChange} />
                      <Field label="Total Banho" name="platingTotal" type="number" step="0.01" value={formData.platingTotal} onChange={handleChange} />
                      <Field label="Total" name="totalPrice" type="number" step="0.01" value={formData.totalPrice} onChange={handleChange} readOnly hint="Qtd × Preço unitário" />
                      <Field label="Total Peças" name="piecesTotal" type="number" step="0.01" value={formData.piecesTotal} onChange={handleChange} readOnly hint="Igual ao total de peças" />
                      <Field label="Total Geral" name="grandTotal" type="number" step="0.01" value={formData.grandTotal} onChange={handleChange} readOnly hint="Peças + Banho" />
                    </div>
                  </section>

                  <section>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                      Tabelas de Preço
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nível 1" name="priceLevel1" type="number" step="0.01" value={formData.priceLevel1} onChange={handleChange} readOnly hint="Total geral × 1,5" />
                      <Field label="Nível 2" name="priceLevel2" type="number" step="0.01" value={formData.priceLevel2} onChange={handleChange} readOnly hint="Total geral × 2,0" />
                      <Field label="Nível 3" name="priceLevel3" type="number" step="0.01" value={formData.priceLevel3} onChange={handleChange} readOnly hint="Total geral × 2,5" />
                      <Field label="Preço Ajustado" name="adjustedPrice" type="number" step="0.01" value={formData.adjustedPrice} onChange={handleChange} />
                    </div>
                  </section>
                </div>

                <section>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-700">Produto ativo</span>
                  </label>
                </section>

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

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
  required,
  readOnly,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: string;
  required?: boolean;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <TextInput
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        required={required}
        readOnly={readOnly}
        className={`!pl-3 ${readOnly ? "bg-slate-50 text-slate-600 cursor-default" : ""}`}
      />
      {hint && (
        <p className="text-xs text-slate-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: NamedItem[];
  className: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <select name={name} value={value} onChange={onChange} className={className}>
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
