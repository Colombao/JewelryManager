"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";
import {
  formatMultiplier,
  getMarginMultipliers,
  ProfitMargin,
} from "@/lib/pricing";
import Button from "../components/Button";
import DataTable, { DataTableColumn } from "../components/DataTable";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";
import TableActions, { StatusBadge } from "../components/TableActions";
import {
  IMPORT_ACCEPT,
  ImportProductRow,
  importProductsInBatches,
  parseSpreadsheetFile,
} from "./productImport";

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

function toNum(value: string) {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function formatCurrency(value: string | null | undefined) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportProductRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [search, setSearch] = useState("");
  const [profitMargins, setProfitMargins] = useState<ProfitMargin[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const rows = await parseSpreadsheetFile(file);
      if (rows.length === 0) {
        toast.error("Nenhum produto válido encontrado na planilha");
        return;
      }
      setImportPreview(rows);
      setShowImportModal(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao ler planilha"
      );
    }
  }

  async function handleConfirmImport() {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    setImportProgress({ done: 0, total: importPreview.length });

    try {
      const data = await importProductsInBatches(
        apiUrl,
        importPreview,
        skipDuplicates,
        (done, total) => setImportProgress({ done, total })
      );

      const errorCount = data.errors.length;
      toast.success(
        `Importação concluída: ${data.created} criados, ${data.skipped} ignorados${
          errorCount ? `, ${errorCount} com erro` : ""
        }`
      );

      setShowImportModal(false);
      setImportPreview([]);
      setImportProgress({ done: 0, total: 0 });
      await loadProducts();
      await loadLookups();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao importar produtos"
      );
    } finally {
      setIsImporting(false);
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

  async function loadProfitMargins() {
    try {
      const res = await fetch(`${apiUrl}/profit-margins`);
      if (!res.ok) throw new Error("Erro ao carregar margens de lucro");
      const data = await res.json();
      setProfitMargins(data);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao carregar margens de lucro"
      );
    }
  }

  useEffect(() => {
    loadProducts();
    loadLookups();
    loadProfitMargins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const marginMultipliers = useMemo(
    () => getMarginMultipliers(profitMargins),
    [profitMargins]
  );

  useEffect(() => {
    const qty = toNum(formData.quantity);
    const unit = toNum(formData.unitPrice);
    const plating = toNum(formData.platingTotal);

    const total = qty * unit;
    const pieces = total;
    const grand = unit + plating;

    setFormData((prev) => {
      const next = { ...prev };

      if (qty > 0 || unit > 0) {
        next.totalPrice = formatMoney(total);
        next.piecesTotal = formatMoney(pieces);
      }

      if (unit > 0 || plating > 0) {
        next.grandTotal = formatMoney(grand);
        if (grand > 0) {
          next.priceLevel1 = formatMoney(grand * marginMultipliers.level1);
          next.priceLevel2 = formatMoney(grand * marginMultipliers.level2);
          next.priceLevel3 = formatMoney(grand * marginMultipliers.level3);
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
  }, [
    formData.quantity,
    formData.unitPrice,
    formData.platingTotal,
    marginMultipliers.level1,
    marginMultipliers.level2,
    marginMultipliers.level3,
  ]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      const haystack = [
        p.code,
        p.sku,
        p.reference,
        p.barcode,
        p.name,
        p.description,
        p.supplier?.name,
        p.category?.name,
        p.platingType?.name,
        p.collection?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [products, search]);

  const productColumns: DataTableColumn<Product>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Ações",
        align: "center",
        headerClassName: "sticky left-0 z-20 bg-slate-800 w-[108px]",
        cellClassName: "sticky left-0 z-10 bg-white",
        render: (p) => (
          <TableActions
            onEdit={() => handleEdit(p)}
            onDelete={() => handleDelete(p.id)}
            onToggle={() => handleToggleActive(p.id, p.active)}
            isActive={p.active}
          />
        ),
      },
      {
        key: "code",
        header: "Código",
        headerClassName:
          "sticky left-[108px] z-20 bg-slate-800 w-24 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)]",
        cellClassName:
          "sticky left-[108px] z-10 bg-white font-mono text-xs font-semibold text-slate-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)]",
        render: (p) => p.code || "-",
      },
      {
        key: "product",
        header: "Produto",
        headerClassName: "min-w-[200px]",
        render: (p) => (
          <>
            <p className="font-medium text-slate-900 leading-snug">{p.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">
              {[p.sku && `SKU ${p.sku}`, p.reference && `Ref. ${p.reference}`]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </>
        ),
      },
      {
        key: "image",
        header: "Foto",
        align: "center",
        headerClassName: "w-16",
        render: (p) =>
          p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(p.image, apiUrl) ?? ""}
              alt={p.name}
              className="h-10 w-10 rounded-md object-cover border border-slate-200 mx-auto"
            />
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          ),
      },
      {
        key: "supplier",
        header: "Fornecedor",
        cellClassName: "text-slate-600 whitespace-nowrap",
        render: (p) => p.supplier?.name || "-",
      },
      {
        key: "category",
        header: "Categoria",
        cellClassName: "text-slate-600 whitespace-nowrap",
        render: (p) => p.category?.name || "-",
      },
      {
        key: "plating",
        header: "Banho",
        cellClassName: "text-slate-600 whitespace-nowrap",
        render: (p) => p.platingType?.name || "-",
      },
      {
        key: "collection",
        header: "Coleção",
        headerClassName: "hidden xl:table-cell",
        cellClassName: "text-slate-600 whitespace-nowrap hidden xl:table-cell",
        render: (p) => p.collection?.name || "-",
      },
      {
        key: "quantity",
        header: "Qtd",
        align: "center",
        headerClassName: "w-14",
        cellClassName: "text-center font-medium text-slate-800",
        render: (p) => p.quantity,
      },
      {
        key: "weight",
        header: "Peso",
        align: "right",
        headerClassName: "hidden lg:table-cell",
        cellClassName: "text-right text-slate-600 tabular-nums hidden lg:table-cell",
        render: (p) => formatDecimal(p.weight),
      },
      {
        key: "unitPrice",
        header: "Preço Unit.",
        align: "right",
        cellClassName: "text-right text-slate-700 tabular-nums whitespace-nowrap",
        render: (p) => formatCurrency(p.unitPrice),
      },
      {
        key: "platingTotal",
        header: "Banho",
        align: "right",
        headerClassName: "hidden xl:table-cell",
        cellClassName:
          "text-right text-slate-600 tabular-nums whitespace-nowrap hidden xl:table-cell",
        render: (p) => formatCurrency(p.platingTotal),
      },
      {
        key: "grandTotal",
        header: "Total Geral",
        align: "right",
        cellClassName: "text-right text-slate-800 tabular-nums whitespace-nowrap",
        render: (p) => formatCurrency(p.grandTotal),
      },
      {
        key: "priceLevel1",
        header: "Nível 1",
        align: "right",
        headerClassName: "hidden lg:table-cell",
        cellClassName:
          "text-right text-slate-600 tabular-nums whitespace-nowrap hidden lg:table-cell",
        render: (p) => formatCurrency(p.priceLevel1),
      },
      {
        key: "priceLevel2",
        header: "Nível 2",
        align: "right",
        headerClassName: "hidden xl:table-cell",
        cellClassName:
          "text-right text-slate-600 tabular-nums whitespace-nowrap hidden xl:table-cell",
        render: (p) => formatCurrency(p.priceLevel2),
      },
      {
        key: "priceLevel3",
        header: "Nível 3",
        align: "right",
        headerClassName: "hidden xl:table-cell",
        cellClassName:
          "text-right text-slate-600 tabular-nums whitespace-nowrap hidden xl:table-cell",
        render: (p) => formatCurrency(p.priceLevel3),
      },
      {
        key: "adjustedPrice",
        header: "Ajustado",
        align: "right",
        headerClassName: "font-semibold",
        cellClassName:
          "text-right font-semibold text-blue-700 tabular-nums whitespace-nowrap",
        render: (p) => formatCurrency(p.adjustedPrice),
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        headerClassName: "w-20",
        render: (p) => <StatusBadge active={p.active} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const renderProductMobileCard = (p: Product) => (
    <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
        <TableActions
          onEdit={() => handleEdit(p)}
          onDelete={() => handleDelete(p.id)}
          onToggle={() => handleToggleActive(p.id, p.active)}
          isActive={p.active}
          compact={false}
        />
        <span className="ml-auto text-xs font-mono font-semibold text-slate-500">
          {p.code || `#${p.id}`}
        </span>
      </div>
      <div className="p-4 flex gap-3">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(p.image, apiUrl) ?? ""}
            alt={p.name}
            className="h-16 w-16 rounded-lg object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
            Sem foto
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 leading-tight">{p.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {[p.sku, p.reference].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-600">
            <span>{p.category?.name || "—"}</span>
            <span>Qtd: {p.quantity}</span>
            <span>{formatCurrency(p.adjustedPrice || p.priceLevel1)}</span>
          </div>
        </div>
        <StatusBadge active={p.active} />
      </div>
    </article>
  );

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Produtos</h1>
            <p className="text-sm sm:text-base text-slate-600">
              Gerencie produtos: visualizar, criar, editar e excluir.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-xl">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, nome, SKU, categoria..."
                className="w-full h-11 pl-4 pr-4 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                {filteredProducts.length} de {products.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              <input
                ref={importInputRef}
                type="file"
                accept={IMPORT_ACCEPT}
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => importInputRef.current?.click()}
              >
                Importar Excel/CSV
              </Button>
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
            <DataTable
              data={filteredProducts}
              columns={productColumns}
              rowKey={(p) => p.id}
              isLoading={isLoading}
              emptyMessage="Nenhum produto encontrado."
              loadingMessage="Carregando produtos..."
              minWidth="1200px"
              mobileCardRender={renderProductMobileCard}
            />

            <Modal
              open={showModal}
              size="2xl"
              title={editingId ? "Editar Produto" : "Novo Produto"}
              onClose={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-5 pb-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormCard title="Identificação" subtitle="Códigos e referências do produto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Código" name="code" value={formData.code} onChange={handleChange} />
                      <Field label="SKU" name="sku" value={formData.sku} onChange={handleChange} />
                      <Field label="Referência" name="reference" value={formData.reference} onChange={handleChange} />
                      <Field label="Código de Barras" name="barcode" value={formData.barcode} onChange={handleChange} />
                    </div>
                  </FormCard>

                  <FormCard title="Classificação" subtitle="Fornecedor, categoria e banho">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SelectField label="Fornecedor" name="supplierId" value={formData.supplierId} onChange={handleChange} options={suppliers} />
                      <SelectField label="Categoria" name="categoryId" value={formData.categoryId} onChange={handleChange} options={categories} />
                      <SelectField label="Tipo de Banho" name="platingTypeId" value={formData.platingTypeId} onChange={handleChange} options={platings} />
                      <SelectField label="Coleção" name="collectionId" value={formData.collectionId} onChange={handleChange} options={collections} />
                    </div>
                  </FormCard>
                </div>

                <FormCard title="Produto" subtitle="Informações exibidas no catálogo e nos kits">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-5">
                    <div className="space-y-3">
                      <Field label="Nome *" name="name" value={formData.name} onChange={handleChange} required />
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                          Descrição
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                          placeholder="Descrição opcional do produto"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <div className="relative w-full aspect-square max-w-[140px] rounded-xl overflow-hidden border-2 border-dashed border-slate-200 bg-white flex items-center justify-center">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-slate-400 text-center px-2">
                            Sem imagem
                          </span>
                        )}
                      </div>
                      <label className="w-full cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                        <span className="flex items-center justify-center w-full h-9 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                          Escolher foto
                        </span>
                      </label>
                      <p className="text-[10px] text-slate-400 text-center leading-tight">
                        PNG, JPG ou WEBP · máx. 5 MB
                      </p>
                    </div>
                  </div>
                </FormCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <FormCard title="Estoque">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Quantidade" name="quantity" type="number" value={formData.quantity} onChange={handleChange} />
                      <Field label="Peso (kg)" name="weight" type="number" step="0.001" value={formData.weight} onChange={handleChange} />
                    </div>
                  </FormCard>

                  <FormCard title="Custos" subtitle="Base para cálculo por peça">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Preço Unitário" name="unitPrice" type="number" step="0.01" value={formData.unitPrice} onChange={handleChange} />
                        <Field label="Banho (por peça)" name="platingTotal" type="number" step="0.01" value={formData.platingTotal} onChange={handleChange} />
                      </div>
                      <ComputedGroup label="Calculado">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Valor em estoque" name="totalPrice" type="number" step="0.01" value={formData.totalPrice} onChange={handleChange} readOnly hint="Qtd × Preço unitário" />
                          <Field label="Custo por peça" name="grandTotal" type="number" step="0.01" value={formData.grandTotal} onChange={handleChange} readOnly hint="Preço unit. + Banho" />
                        </div>
                      </ComputedGroup>
                    </div>
                  </FormCard>

                  <FormCard title="Tabela de preços" subtitle="Usada na montagem de kits">
                    <div className="space-y-3">
                      <ComputedGroup label="Níveis automáticos">
                        <div className="grid grid-cols-3 gap-2">
                          <Field label="Nível 1" name="priceLevel1" type="number" step="0.01" value={formData.priceLevel1} onChange={handleChange} readOnly compact hint={`× ${formatMultiplier(marginMultipliers.level1)}`} />
                          <Field label="Nível 2" name="priceLevel2" type="number" step="0.01" value={formData.priceLevel2} onChange={handleChange} readOnly compact hint={`× ${formatMultiplier(marginMultipliers.level2)}`} />
                          <Field label="Nível 3" name="priceLevel3" type="number" step="0.01" value={formData.priceLevel3} onChange={handleChange} readOnly compact hint={`× ${formatMultiplier(marginMultipliers.level3)}`} />
                        </div>
                      </ComputedGroup>
                      <Field
                        label="Preço ajustado unitário"
                        name="adjustedPrice"
                        type="number"
                        step="0.01"
                        value={formData.adjustedPrice}
                        onChange={handleChange}
                        highlight
                      />
                    </div>
                  </FormCard>
                </div>

                <div className="sticky bottom-0 -mx-1 px-1 pt-4 mt-2 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">
                      Produto ativo no catálogo
                    </span>
                  </label>

                  <div className="flex items-center gap-2 sm:gap-3">
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
                        : "Cadastrar produto"}
                    </Button>
                  </div>
                </div>
              </form>
            </Modal>

            <Modal
              open={showImportModal}
              size="2xl"
              title="Importar produtos"
              onClose={() => {
                if (isImporting) return;
                setShowImportModal(false);
                setImportPreview([]);
              }}
            >
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  {importPreview.length} produto(s) prontos para importação.
                  Fornecedores, categorias e tipos de banho serão criados
                  automaticamente se não existirem.
                </p>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    Ignorar produtos com referência ou SKU já cadastrados
                  </span>
                </label>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2">Referência</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Fornecedor</th>
                        <th className="px-3 py-2">Qtd</th>
                        <th className="px-3 py-2">Preço Unit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 8).map((row, index) => (
                        <tr key={`${row.reference}-${index}`} className="border-t">
                          <td className="px-3 py-2">{row.code || "-"}</td>
                          <td className="px-3 py-2">{row.reference || "-"}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">{row.supplierName || "-"}</td>
                          <td className="px-3 py-2">{row.quantity ?? 0}</td>
                          <td className="px-3 py-2">{row.unitPrice ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importPreview.length > 8 && (
                  <p className="text-xs text-slate-500">
                    Exibindo 8 de {importPreview.length} linhas na prévia.
                  </p>
                )}

                {isImporting && importProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Enviando em lotes...</span>
                      <span>
                        {importProgress.done} / {importProgress.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            (importProgress.done / importProgress.total) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isImporting}
                    onClick={() => {
                      setShowImportModal(false);
                      setImportPreview([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={isImporting}
                    onClick={handleConfirmImport}
                  >
                    {isImporting
                      ? `Importando (${importProgress.done}/${importProgress.total})...`
                      : "Confirmar importação"}
                  </Button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}

function FormCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ComputedGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

const fieldInputClass =
  "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition";

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
  compact,
  highlight,
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
  compact?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <label
        className={`block font-medium text-slate-600 mb-1 ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        required={required}
        readOnly={readOnly}
        className={`${fieldInputClass} ${
          readOnly
            ? "bg-slate-100/80 text-slate-600 border-slate-100 cursor-default focus:ring-0 focus:border-slate-100"
            : ""
        } ${
          highlight
            ? "border-blue-300 bg-blue-50/40 font-semibold text-blue-900 focus:ring-blue-500/40 focus:border-blue-400"
            : ""
        } ${compact ? "h-9 text-xs" : ""}`}
      />
      {hint && (
        <p className="text-[10px] text-slate-400 mt-1 leading-tight">{hint}</p>
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
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: NamedItem[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`${fieldInputClass} cursor-pointer`}
      >
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
