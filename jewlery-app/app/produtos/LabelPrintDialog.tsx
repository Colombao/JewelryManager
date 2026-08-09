"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import Modal from "../components/Modal";
import {
  BartenderPrintError,
  BartenderPrintSettings,
  LabelProduct,
  getProductLabelType,
  listProductLabelTypes,
  loadBartenderSettings,
  printProductLabels,
  saveBartenderSettings,
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
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [copiesById, setCopiesById] = useState<Record<number, number>>({});
  const [settings, setSettings] = useState<BartenderPrintSettings>(() =>
    loadBartenderSettings()
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  useEffect(() => {
    if (!open) return;
    const loaded = loadBartenderSettings();
    setSettings(loaded);
    setShowSettings(false);
    setIsPrinting(false);
    setProgress(null);

    const initialType = types[0] ?? "";
    setSelectedType(initialType);
    setSelectedIds(new Set());
    setCopiesById({});
  }, [open, types]);

  const productsOfType = useMemo(() => {
    if (!selectedType) return [];
    return products.filter((p) => getProductLabelType(p) === selectedType);
  }, [products, selectedType]);

  const selectedProducts = useMemo(
    () => productsOfType.filter((p) => selectedIds.has(p.id)),
    [productsOfType, selectedIds]
  );

  const allVisibleSelected =
    productsOfType.length > 0 &&
    productsOfType.every((p) => selectedIds.has(p.id));

  function selectType(type: string) {
    setSelectedType(type);
    setSelectedIds(new Set());
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
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(productsOfType.map((p) => p.id)));
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

  async function handlePrint() {
    if (selectedProducts.length === 0) {
      toast.error("Selecione ao menos um produto para imprimir");
      return;
    }
    if (!settings.documentPath.trim()) {
      toast.error("Informe o caminho do Documento2.btw neste PC");
      setShowSettings(true);
      return;
    }

    setIsPrinting(true);
    setProgress({ done: 0, total: selectedProducts.length });

    try {
      const result = await printProductLabels(selectedProducts, settings, {
        copiesByProductId: Object.fromEntries(
          selectedProducts.map((p) => [
            p.id,
            copiesById[p.id] ?? settings.copies,
          ])
        ),
        onProgress: (done, total) => setProgress({ done, total }),
      });

      if (result.printed > 0) {
        toast.success(
          `${result.printed} etiqueta${result.printed === 1 ? "" : "s"} enviada${result.printed === 1 ? "" : "s"} ao BarTender`
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

  return (
    <Modal
      open={open}
      onClose={isPrinting ? () => undefined : onClose}
      title="Imprimir etiquetas (BarTender)"
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Selecione o tipo (brinco, pulseira, etc.) e os produtos. A impressão
          usa o BarTender instalado neste PC com a Argox conectada.
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
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
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
            <span className="text-xs text-slate-500">
              {selectedProducts.length} selecionado
              {selectedProducts.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="max-h-[42vh] divide-y divide-slate-100 overflow-y-auto">
            {productsOfType.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Nenhum produto neste tipo.
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
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${
                      checked ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(product.id)}
                      disabled={isPrinting}
                      className="h-4 w-4 shrink-0 rounded border-slate-300"
                      aria-label={`Selecionar ${product.name}`}
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
                      <p className="truncate text-sm font-medium text-slate-900">
                        {product.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-slate-400">
                        {meta || "sem código"} · {formatPrice(product.priceLevel1)}
                      </p>
                    </div>

                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
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
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-slate-700"
          >
            Configuração do BarTender neste PC
            <span className="text-slate-400">{showSettings ? "▴" : "▾"}</span>
          </button>

          {showSettings && (
            <div className="space-y-3 border-t border-slate-200 px-3 py-3">
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
                Caminho do Documento2.btw
                <input
                  type="text"
                  value={settings.documentPath}
                  disabled={isPrinting}
                  onChange={(e) =>
                    persistSettings({
                      ...settings,
                      documentPath: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900"
                  placeholder="C:\Etiquetas\Documento2.btw"
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

              <p className="text-[11px] leading-relaxed text-slate-400">
                Os campos enviados ao .btw usam Named Data Sources como{" "}
                <span className="font-mono">Nome</span>,{" "}
                <span className="font-mono">Codigo</span>,{" "}
                <span className="font-mono">SKU</span>,{" "}
                <span className="font-mono">Preco</span>,{" "}
                <span className="font-mono">Barcode</span> e{" "}
                <span className="font-mono">Categoria</span>. Renomeie as fontes
                nomeadas no BarTender para coincidir, ou ajuste o mapeamento
                depois.
              </p>
            </div>
          )}
        </div>

        {progress && (
          <p className="text-sm text-slate-500">
            Enviando {Math.min(progress.done + 1, progress.total)} de{" "}
            {progress.total}…
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
