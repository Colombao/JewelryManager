"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import Modal from "../components/Modal";
import {
  BartenderPrintError,
  BartenderPrintSettings,
  LabelProduct,
  applySelectedBtwFileName,
  buildNamedDataSources,
  buildRecordSetCsv,
  describePrintRows,
  fileNameFromDocumentPath,
  getProductLabelType,
  joinWindowsPath,
  listProductLabelTypes,
  loadBartenderSettings,
  printProductLabels,
  saveBartenderSettings,
  validateBartenderDocumentPath,
} from "@/lib/bartenderPrint";
import { formatBRL, parsePrice, resolveImageUrl } from "@/app/kit/kitUtils";

interface LabelPrintDialogProps {
  open: boolean;
  products: LabelProduct[];
  onClose: () => void;
}

function formatPrice(value: string | null | undefined) {
  const n = parsePrice(value);
  return n !== null ? formatBRL(n) : "—";
}

export default function LabelPrintDialog({
  open,
  products,
  onClose,
}: LabelPrintDialogProps) {
  const types = useMemo(() => listProductLabelTypes(products), [products]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [copiesById, setCopiesById] = useState<Record<number, number>>({});
  const [listSearch, setListSearch] = useState("");
  const [settings, setSettings] = useState<BartenderPrintSettings>(() =>
    loadBartenderSettings()
  );
  const [showSettings, setShowSettings] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    currentName?: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const loaded = loadBartenderSettings();
    setSettings(loaded);
    setShowSettings(true);
    setIsPrinting(false);
    setProgress(null);
    setListSearch("");

    const initialType = types[0] ?? "";
    setSelectedType(initialType);
    setSelectedIds(new Set());
    setCopiesById({});
  }, [open, types]);

  const productsOfType = useMemo(() => {
    if (!selectedType) return [];
    const term = listSearch.trim().toLowerCase();
    return products
      .filter((p) => getProductLabelType(p) === selectedType)
      .filter((p) => {
        if (!term) return true;
        return [p.name, p.code, p.sku, p.reference, p.barcode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [products, selectedType, listSearch]);

  const selectedProducts = useMemo(() => {
    // Keep selection order stable by catalog order, but only checked ids.
    return products.filter(
      (p) =>
        selectedIds.has(p.id) && getProductLabelType(p) === selectedType
    );
  }, [products, selectedIds, selectedType]);

  const allVisibleSelected =
    productsOfType.length > 0 &&
    productsOfType.every((p) => selectedIds.has(p.id));

  const printRows = useMemo(
    () => describePrintRows(selectedProducts, settings.labelsPerRow || 2),
    [selectedProducts, settings.labelsPerRow]
  );
  const previewCsv = useMemo(
    () =>
      selectedProducts.length > 0
        ? buildRecordSetCsv(selectedProducts, settings.fieldMap)
        : "",
    [selectedProducts, settings.fieldMap]
  );
  const previewProduct = selectedProducts[0] ?? null;
  const previewFields = previewProduct
    ? buildNamedDataSources(previewProduct, settings.fieldMap)
    : null;

  function selectType(type: string) {
    setSelectedType(type);
    setSelectedIds(new Set());
    setListSearch("");
  }

  function toggleProduct(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of productsOfType) next.delete(p.id);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of productsOfType) next.add(p.id);
      return next;
    });
  }

  function setCopies(id: number, value: number) {
    setCopiesById((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.floor(value || 1)),
    }));
  }

  function persistSettings(next: BartenderPrintSettings) {
    setSettings(next);
    saveBartenderSettings(next);
  }

  function onPickBtwFile(file: File | null) {
    if (!file) return;
    if (!/\.btw$/i.test(file.name)) {
      toast.error("Selecione um arquivo .btw do BarTender");
      return;
    }

    const applied = applySelectedBtwFileName(settings, file.name);
    persistSettings({
      ...settings,
      ...applied,
    });
    toast.success(
      `Arquivo ${file.name} selecionado. Confira a pasta abaixo se o caminho estiver incompleto.`
    );
    setShowSettings(true);
  }

  async function handlePrint() {
    if (selectedProducts.length === 0) {
      toast.error("Selecione ao menos um produto para imprimir");
      return;
    }
    const pathError = validateBartenderDocumentPath(settings.documentPath);
    if (pathError) {
      toast.error(pathError);
      setShowSettings(true);
      return;
    }

    setIsPrinting(true);
    setProgress({
      done: 0,
      total: selectedProducts.length,
      currentName: selectedProducts[0]?.name,
    });

    try {
      const result = await printProductLabels(selectedProducts, settings, {
        copiesByProductId: Object.fromEntries(
          selectedProducts.map((p) => [
            p.id,
            copiesById[p.id] ?? settings.copies,
          ])
        ),
        onProgress: (done, total, product) =>
          setProgress({
            done,
            total,
            currentName: product?.name,
          }),
      });

      if (result.printed > 0) {
        toast.success(
          `${result.printed} produto(s) em 1 envio — ${printRows.join(" · ")}`
        );
      }

      if (result.errors.length > 0) {
        const first = result.errors[0];
        toast.error(
          result.errors.length === 1
            ? first.error
            : `${result.errors.length} falhas. Ex.: ${first.error}`
        );
      } else if (result.printed > 0) {
        onClose();
      }
    } catch (e) {
      const message =
        e instanceof BartenderPrintError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Erro ao imprimir etiquetas";
      toast.error(message);
    } finally {
      setIsPrinting(false);
      setProgress(null);
    }
  }

  const selectedFileName =
    fileNameFromDocumentPath(settings.documentPath) || "nenhum .btw";

  return (
    <Modal
      open={open}
      onClose={isPrinting ? () => undefined : onClose}
      title="Imprimir etiquetas (BarTender)"
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Escolha o tipo e marque os produtos. Tudo vai em{" "}
          <strong className="font-medium text-slate-700">um único envio</strong>{" "}
          ao BarTender — com 2 por linha (ex.: BR13 | BR14), depois BR15.
        </p>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tipo de produto
          </p>
          {types.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum produto disponível.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {types.map((type) => {
                const count = products.filter(
                  (p) => getProductLabelType(p) === type
                ).length;
                const active = type === selectedType;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => selectType(type)}
                    disabled={isPrinting}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${
                      active
                        ? "bg-slate-900 text-white ring-slate-900"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {type}
                    <span
                      className={`ml-1.5 text-xs ${
                        active ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                disabled={isPrinting || productsOfType.length === 0}
                className="h-4 w-4 rounded border-slate-300"
              />
              Selecionar todos de {selectedType || "—"}
            </label>
            <div className="flex flex-1 items-center gap-2 sm:max-w-xs sm:justify-end">
              <input
                type="search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                disabled={isPrinting}
                placeholder="Filtrar por código, SKU ou nome…"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <span className="shrink-0 text-xs text-slate-500">
                {selectedProducts.length} sel.
              </span>
            </div>
          </div>

          <div className="max-h-[38vh] divide-y divide-slate-100 overflow-y-auto">
            {productsOfType.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Nenhum produto neste tipo
                {listSearch ? " para esse filtro" : ""}.
              </p>
            ) : (
              productsOfType.map((product) => {
                const checked = selectedIds.has(product.id);
                const imageUrl = resolveImageUrl(product.image ?? null);
                const meta = [product.code, product.sku]
                  .filter(Boolean)
                  .join(" · ");
                const copies = copiesById[product.id] ?? settings.copies;

                return (
                  <label
                    key={product.id}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${
                      checked ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(product.id)}
                      disabled={isPrinting}
                      className="h-4 w-4 shrink-0 rounded border-slate-300"
                      aria-label={`Selecionar ${product.code || product.name}`}
                    />

                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-semibold text-slate-900">
                        {product.code || "sem código"}
                        {product.sku ? (
                          <span className="ml-2 font-normal text-slate-500">
                            · {product.sku}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {product.name} · {formatPrice(product.priceLevel1)}
                      </p>
                      {!meta && (
                        <p className="text-[11px] text-amber-600">
                          Sem código/SKU — confira os campos da etiqueta
                        </p>
                      )}
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500"
                      onClick={(e) => e.preventDefault()}
                    >
                      Cópias
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={copies}
                        disabled={isPrinting || !checked}
                        onChange={(e) =>
                          setCopies(product.id, Number(e.target.value))
                        }
                        className="w-14 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 disabled:bg-slate-50"
                      />
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {selectedProducts.length > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              O que será impresso (1 request)
            </p>
            <ul className="space-y-0.5 font-mono text-xs text-slate-800">
              {printRows.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
            {previewProduct && previewFields && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs sm:grid-cols-3">
                {["Codigo", "Nome", "SKU", "Preco", "Barcode", "Categoria"].map(
                  (key) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-slate-400">{key}</dt>
                      <dd className="truncate font-medium text-slate-800">
                        {previewFields[key] || "—"}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            )}
            <details className="border-t border-slate-100 pt-2">
              <summary className="cursor-pointer text-[11px] text-slate-500">
                Ver CSV enviado ao BarTender
              </summary>
              <pre className="mt-1 max-h-28 overflow-auto rounded-md bg-slate-50 p-2 font-mono text-[10px] text-slate-700">
                {previewCsv}
              </pre>
            </details>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-slate-700"
          >
            <span>
              Arquivo BarTender:{" "}
              <span className="font-mono text-slate-900">{selectedFileName}</span>
            </span>
            <span className="text-slate-400">{showSettings ? "▴" : "▾"}</span>
          </button>

          {showSettings && (
            <div className="space-y-3 border-t border-slate-200 px-3 py-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-600">
                  Arquivo .btw
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".btw,application/octet-stream"
                    className="hidden"
                    onChange={(e) => {
                      onPickBtwFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPrinting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Selecionar arquivo .btw
                  </Button>
                  <span className="font-mono text-xs text-slate-500">
                    {selectedFileName}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  O navegador não entrega o caminho completo por segurança.
                  Selecione o arquivo e confirme a pasta abaixo.
                </p>
              </div>

              <label className="block text-xs font-medium text-slate-600">
                Pasta onde está o .btw neste PC
                <input
                  type="text"
                  value={settings.documentFolder}
                  disabled={isPrinting}
                  onChange={(e) => {
                    const documentFolder = e.target.value;
                    const name =
                      fileNameFromDocumentPath(settings.documentPath) ||
                      "Documento2.btw";
                    persistSettings({
                      ...settings,
                      documentFolder,
                      documentPath: joinWindowsPath(documentFolder, name),
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900"
                  placeholder="C:\Users\AlmaW\Desktop\bartender"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Caminho completo (montado automaticamente)
                <input
                  type="text"
                  value={settings.documentPath}
                  disabled={isPrinting}
                  onChange={(e) => {
                    const documentPath = e.target.value;
                    persistSettings({
                      ...settings,
                      documentPath,
                      documentFolder:
                        documentPath.replace(/[\\/][^\\/]+\.btw$/i, "") ||
                        settings.documentFolder,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900"
                  placeholder="C:\Users\AlmaW\Desktop\bartender\Documento2.btw"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                URL da API local
                <input
                  type="url"
                  value={settings.apiUrl}
                  disabled={isPrinting}
                  onChange={(e) =>
                    persistSettings({ ...settings, apiUrl: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="http://localhost:5159"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Impressora (opcional — vazio usa a padrão do documento)
                <input
                  type="text"
                  value={settings.printer}
                  disabled={isPrinting}
                  onChange={(e) =>
                    persistSettings({ ...settings, printer: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Argox OS-214 plus series PPLA"
                />
              </label>

              <div className="flex flex-wrap gap-4">
                <label className="block text-xs font-medium text-slate-600">
                  Cópias padrão
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={settings.copies}
                    disabled={isPrinting}
                    onChange={(e) =>
                      persistSettings({
                        ...settings,
                        copies: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="mt-1 w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Produtos por linha
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={settings.labelsPerRow}
                    disabled={isPrinting}
                    onChange={(e) =>
                      persistSettings({
                        ...settings,
                        labelsPerRow: Math.max(
                          1,
                          Math.min(4, Number(e.target.value) || 2)
                        ),
                      })
                    }
                    className="mt-1 w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400">
                Se todas as etiquetas saem como{" "}
                <span className="font-mono">BR01</span>, o texto no .btw ainda
                está fixo. No BarTender, ligue o objeto do código ao campo{" "}
                <span className="font-mono">Codigo</span> (banco de texto / Named
                Data Source). Mesmo para{" "}
                <span className="font-mono">Nome</span>,{" "}
                <span className="font-mono">SKU</span>,{" "}
                <span className="font-mono">Preco</span>.
              </p>
            </div>
          )}
        </div>

        {progress && (
          <p className="text-sm text-slate-500">
            Enviando {Math.min(progress.done + 1, progress.total)} de{" "}
            {progress.total}
            {progress.currentName ? `: ${progress.currentName}` : "…"}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isPrinting}>
            Cancelar
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting || selectedProducts.length === 0}
          >
            {isPrinting
              ? "Imprimindo…"
              : selectedProducts.length === 0
                ? "Imprimir etiquetas"
                : `Imprimir ${selectedProducts.length} etiqueta${selectedProducts.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
