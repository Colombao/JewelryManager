"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";
import { FiEdit2, FiMoreVertical, FiTrash2 } from "react-icons/fi";
import { IoIosArrowRoundBack, IoIosArrowRoundForward } from "react-icons/io";
import { LuLayoutDashboard } from "react-icons/lu";
import Select from "react-select";
import Swal from "sweetalert2";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import BusinessKitPanel from "../components/BusinessKitPanel";
import RequireAuth from "../components/RequireAuth";
import { formatBRL } from "../kit/kitUtils";
import { BusinessDetail } from "@/lib/business";
type CreateBoardState = { name: string };

type Step = {
  id: number;
  name: string;
  businessId: number;
  order: number;
};

type Card = {
  id: number;
  title: string;
  description?: string | null;
  order: number;
  stepId: number;
  kitId?: number | null;
  resellerId?: number | null;
  kit?: {
    id: number;
    kitNumber: number;
    totalQty: number;
    grandTotal: string | number;
  } | null;
  reseller?: {
    id: number;
    name: string;
  } | null;
};

type AvailableKit = {
  id: number;
  kitNumber: number;
  totalQty: number;
  grandTotal: string | number;
  finalTotal: string | number;
  _count: { items: number };
};

type ResellerOption = {
  id: number;
  name: string;
  cpf: string;
};

type Board = {
  id: number;
  name: string;
  steps: Step[];
  cards: Card[];
};

function moveInArray<T>(arr: T[], fromIndex: number, toIndex: number) {
  const copy = [...arr];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export default function FluxoPage() {
  const [boards, setBoards] = useState<Array<{ id: number; name: string }>>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const [draggingCardId, setDraggingCardId] = useState<number | null>(null);

  const [dragOverStepId, setDragOverStepId] = useState<number | null>(null);

  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);

  const [createStepOpen, setCreateStepOpen] = useState(false);
  const [newStepName, setNewStepName] = useState("");
  const [creatingStep, setCreatingStep] = useState(false);

  const [openModalEditStep, setOpenModalEditStep] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);

  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [availableKits, setAvailableKits] = useState<AvailableKit[]>([]);
  const [resellers, setResellers] = useState<ResellerOption[]>([]);
  const [selectedKitId, setSelectedKitId] = useState("");
  const [selectedResellerId, setSelectedResellerId] = useState("");
  const [loadingBusinessData, setLoadingBusinessData] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);

  const [businessOpen, setBusinessOpen] = useState(false);
  const [businessDetail, setBusinessDetail] = useState<BusinessDetail | null>(
    null
  );
  const [loadingBusinessDetail, setLoadingBusinessDetail] = useState(false);
  const [updatingUnitId, setUpdatingUnitId] = useState<number | null>(null);
  const [finalizingBusiness, setFinalizingBusiness] = useState(false);
  const [cardMenuOpenId, setCardMenuOpenId] = useState<number | null>(null);
  const [transferCardTarget, setTransferCardTarget] = useState<Card | null>(null);
  const [transferBoardId, setTransferBoardId] = useState("");
  const [transferringCard, setTransferringCard] = useState(false);
  const dragMovedRef = useRef(false);

  const authHeader = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("authToken") ?? "" : ""}`,
    }),
    []
  );

  const columns = useMemo(() => {
    if (!board) return [] as Step[];
    return [...board.steps].sort((a, b) => a.order - b.order);
  }, [board]);

  const firstStep = columns[0] ?? null;

  function formatKitMoney(value: string | number) {
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function reloadBoard() {
    if (!board) return;
    const res = await fetch(`${apiUrl}/flow/board/${board.id}`, {
      headers: authHeader,
    });
    if (!res.ok) throw new Error("Erro ao recarregar board");
    const data = await res.json();
    setBoard(data);
  }

  async function openCreateBusinessModal() {
    if (!board) {
      toast.error("Selecione um board primeiro");
      return;
    }
    if (!firstStep) {
      toast.error("Crie uma etapa no board antes de abrir um negócio");
      return;
    }

    setCreateBusinessOpen(true);
    setSelectedKitId("");
    setSelectedResellerId("");
    setLoadingBusinessData(true);

    try {
      const [kitsRes, resellersRes] = await Promise.all([
        fetch(`${apiUrl}/kits/available`),
        fetch(`${apiUrl}/resellers`),
      ]);

      if (kitsRes.ok) setAvailableKits(await kitsRes.json());
      else setAvailableKits([]);

      if (resellersRes.ok) setResellers(await resellersRes.json());
      else setResellers([]);
    } catch {
      toast.error("Erro ao carregar kits e revendedoras");
    } finally {
      setLoadingBusinessData(false);
    }
  }

  async function handleCreateBusiness() {
    if (!board || !firstStep) return;

    if (!selectedKitId) {
      toast.error("Selecione um kit montado");
      return;
    }

    if (!selectedResellerId) {
      toast.error("Selecione uma revendedora");
      return;
    }

    setCreatingBusiness(true);
    try {
      const res = await fetch(`${apiUrl}/flow/business`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          kitId: Number(selectedKitId),
          resellerId: Number(selectedResellerId),
          boardId: board.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao criar negócio");
      }

      await reloadBoard();
      toast.success("Negócio criado na primeira etapa");
      setCreateBusinessOpen(false);
      setSelectedKitId("");
      setSelectedResellerId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar negócio");
    } finally {
      setCreatingBusiness(false);
    }
  }

  async function openBusinessDetail(card: Card) {
    if (!card.kitId) {
      toast.error("Este card não possui kit vinculado");
      return;
    }

    setBusinessOpen(true);
    setLoadingBusinessDetail(true);
    setBusinessDetail(null);

    try {
      const res = await fetch(`${apiUrl}/flow/business/${card.id}`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar negócio");
      }
      setBusinessDetail(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar negócio");
      setBusinessOpen(false);
    } finally {
      setLoadingBusinessDetail(false);
    }
  }

  async function toggleUnitStatus(
    unitId: number,
    field: "owner" | "reseller" | "missing",
    value: boolean
  ) {
    if (!businessDetail) return;

    setUpdatingUnitId(unitId);
    try {
      const res = await fetch(
        `${apiUrl}/flow/business/${businessDetail.id}/units/${unitId}`,
        {
          method: "PATCH",
          headers: authHeader,
          body: JSON.stringify({ field, value }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao atualizar peça");
      }

      setBusinessDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          units: prev.units.map((unit) =>
            unit.id === unitId ? data.unit : unit
          ),
          summary: data.summary,
        };
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar peça");
    } finally {
      setUpdatingUnitId(null);
    }
  }

  async function handleCancelCard(card: Card) {
    setCardMenuOpenId(null);

    const result = await Swal.fire({
      title: "Remover do fluxo?",
      text: `O kit voltará para Kits Montados e ficará disponível novamente. Card: ${card.title}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${apiUrl}/flow/cards/${card.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao remover card");
      }

      setBoard((prev) =>
        prev
          ? { ...prev, cards: prev.cards.filter((entry) => entry.id !== card.id) }
          : prev
      );
      if (businessDetail?.id === card.id) {
        setBusinessOpen(false);
        setBusinessDetail(null);
      }
      toast.success(data?.message || "Card removido do fluxo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover card");
    }
  }

  function openTransferModal(card: Card) {
    setCardMenuOpenId(null);
    setTransferCardTarget(card);
    setTransferBoardId("");
  }

  async function handleTransferCard() {
    if (!transferCardTarget || !transferBoardId) {
      toast.error("Selecione o board de destino");
      return;
    }

    if (Number(transferBoardId) === board?.id) {
      toast.error("Selecione um board diferente do atual");
      return;
    }

    setTransferringCard(true);
    try {
      const res = await fetch(
        `${apiUrl}/flow/cards/${transferCardTarget.id}/transfer`,
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({ boardId: Number(transferBoardId) }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao mover card");
      }

      setBoard((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.filter(
                (entry) => entry.id !== transferCardTarget.id
              ),
            }
          : prev
      );
      setTransferCardTarget(null);
      setTransferBoardId("");
      toast.success("Card movido para outro board");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao mover card");
    } finally {
      setTransferringCard(false);
    }
  }

  async function handleFinalizeBusiness() {
    if (!businessDetail) return;

    const pending = businessDetail.summary.pending;
    const result = await Swal.fire({
      title: "Finalizar entrega?",
      html:
        pending > 0
          ? `<p>Peças vendidas ou perdidas serão baixadas no estoque.</p><p><strong>${pending}</strong> peça(s) não marcada(s) voltarão ao estoque.</p>`
          : "<p>Todas as peças foram marcadas. O kit será encerrado e o card removido do fluxo.</p>",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, finalizar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    setFinalizingBusiness(true);
    try {
      const res = await fetch(
        `${apiUrl}/flow/business/${businessDetail.id}/finalize`,
        {
          method: "POST",
          headers: authHeader,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao finalizar negócio");
      }

      setBoard((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.filter(
                (entry) => entry.id !== businessDetail.id
              ),
            }
          : prev
      );
      setBusinessOpen(false);
      setBusinessDetail(null);
      toast.success(data?.message || "Kit finalizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao finalizar negócio");
    } finally {
      setFinalizingBusiness(false);
    }
  }

  const cardsByStep = useMemo(() => {
    if (!board) return new Map<number, Card[]>();
    const map = new Map<number, Card[]>();
    for (const c of board.cards) {
      const list = map.get(c.stepId) ?? [];
      list.push(c);
      map.set(c.stepId, list);
    }
    for (const [stepId, list] of map.entries()) {
      list.sort((a, b) => a.order - b.order);
      map.set(stepId, list);
    }
    return map;
  }, [board]);

  useEffect(() => {
    if (cardMenuOpenId == null) return;

    function closeCardMenu() {
      setCardMenuOpenId(null);
    }

    const timer = window.setTimeout(() => {
      document.addEventListener("click", closeCardMenu);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", closeCardMenu);
    };
  }, [cardMenuOpenId]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const authHeader = {
          Authorization: `Bearer ${localStorage.getItem("authToken") ?? ""}`,
        };

        // lista boards
        const boardsRes = await fetch(`${apiUrl}/flow/boards`, {
          headers: authHeader,
        });
        if (!boardsRes.ok) throw new Error("Erro ao carregar boards");
        const boardsData: Array<{ id: number; name: string }> =
          await boardsRes.json();
        setBoards(boardsData);

        // carregamento inicial: board ativo (/flow/board)
        const activeRes = await fetch(`${apiUrl}/flow/board`, {
          headers: authHeader,
        });
        if (!activeRes.ok) throw new Error("Erro ao carregar fluxo");
        const activeData = await activeRes.json();
        setBoard(activeData);
        setActiveBoardId(activeData?.id ?? null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar fluxo");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragStart = (cardId: number) => {
    setDraggingCardId(cardId);
  };

  const handleEditStep = (step: Step) => {
    setOpenModalEditStep(true);
    setEditingStep(step);
  };

  const handleDeleteStep = (step: Step) => {
    Swal.fire({
      title: "Tem certeza?",
      text: "Essa ação não pode ser desfeita e irá remover todos os cards dessa etapa.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${apiUrl}/flow/steps/${step.id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${
                localStorage.getItem("authToken") ?? ""
              }`,
            },
          });
          if (!res.ok) throw new Error("Erro ao excluir etapa");
          toast.success("Etapa excluída");
          // atualização local: remove etapa + cards
          setBoard((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              steps: prev.steps.filter((s) => s.id !== step.id),
              cards: prev.cards.filter((c) => c.stepId !== step.id),
            };
          });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erro ao excluir etapa");
        }
      }
    });
  };

  const handleDragEnd = () => {
    setDraggingCardId(null);
    setDragOverStepId(null);
    // O browser dispara click logo após dragend; o timeout deixa bloquear esse clique
    // e depois libera cliques normais nos cards.
    window.setTimeout(() => {
      dragMovedRef.current = false;
    }, 0);
  };

  const handleDropOnStep = async (stepId: number) => {
    if (!board || draggingCardId == null) return;

    const card = board.cards.find((c) => c.id === draggingCardId);
    if (!card) return;

    const newStepId = stepId;

    // otimista: mover para o fim da lista da coluna destino
    const destCards = (cardsByStep.get(newStepId) ?? []).sort(
      (a, b) => a.order - b.order
    );
    const newOrder = destCards.length;

    const prev = board;
    const next: Board = {
      ...board,
      cards: board.cards.map((c) => {
        if (c.id !== draggingCardId) return c;
        return {
          ...c,
          stepId: newStepId,
          order: newOrder,
        };
      }),
    };

    setBoard(next);

    try {
      const res = await fetch(`${apiUrl}/flow/cards/${draggingCardId}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") ?? ""}`,
        },
        body: JSON.stringify({
          stepId: newStepId,
          order: newOrder,
        }),
      });
      if (!res.ok) throw new Error("Erro ao mover card");
    } catch (e) {
      setBoard(prev);
      toast.error(e instanceof Error ? e.message : "Erro ao mover card");
    } finally {
      handleDragEnd();
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <MainLayout>
          <div className="p-8">Carregando...</div>
        </MainLayout>
      </RequireAuth>
    );
  }

  const boardOptions = boards.map((b) => ({
    value: b.id,
    label: b.name,
  }));

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">Fluxo</h1>
                <p className="text-sm sm:text-base text-slate-600">
                  Arraste cards entre etapas (Trelo-like).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-full sm:w-auto">
                  <Select
                    defaultValue={
                      boardOptions.find(
                        (option) => option.value === activeBoardId
                      ) ?? null
                    }
                    options={boardOptions}
                    onChange={(option) => {
                      setActiveBoardId(option?.value ?? null);
                      const selected = boards.find(
                        (b) => b.id === option?.value
                      );
                      if (!selected) return;
                      // carregar dados do board selecionado
                      fetch(`${apiUrl}/flow/board/${selected.id}`, {
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${
                            localStorage.getItem("authToken") ?? ""
                          }`,
                        },
                      })
                        .then((res) => {
                          if (!res.ok)
                            throw new Error("Erro ao carregar board");
                          return res.json();
                        })
                        .then((data) => {
                          setBoard(data);
                        })
                        .catch((e) => {
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : "Erro ao carregar board"
                          );
                        });
                    }}
                    className="w-full sm:w-[240px]"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        minHeight: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        borderColor: state.isFocused ? "#2563eb" : "#e2e8f0",
                        boxShadow: "none",
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "#2563eb",
                        },
                      }),

                      valueContainer: (base) => ({
                        ...base,
                        height: "44px",
                        padding: "0 12px",
                      }),

                      input: (base) => ({
                        ...base,
                        margin: 0,
                        padding: 0,
                      }),

                      indicatorSeparator: () => ({
                        display: "none",
                      }),

                      dropdownIndicator: (base) => ({
                        ...base,
                        color: "#64748b",
                      }),

                      menu: (base) => ({
                        ...base,
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                      }),

                      option: (base, state) => ({
                        ...base,
                        cursor: "pointer",
                        backgroundColor: state.isSelected
                          ? "#2563eb"
                          : state.isFocused
                          ? "#eff6ff"
                          : "#fff",
                        color: state.isSelected ? "#fff" : "#0f172a",
                        padding: "10px 14px",
                      }),
                    }}
                    placeholder="Selecione um board"
                  />
                </div>
                <button
                  onClick={openCreateBusinessModal}
                  disabled={!board || !firstStep}
                  className={`px-4 py-2 rounded-lg bg-[#b8860b] hover:bg-[#9a7209] transition text-white text-sm font-medium ${
                    !board || !firstStep ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Criar negócio
                </button>
                <button
                  onClick={() => setCreateBoardOpen(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium"
                >
                  Novo board
                </button>
                <button
                  onClick={() => setCreateStepOpen(true)}
                  disabled={!board}
                  className={`px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-950 transition text-white text-sm font-medium ${
                    !board ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Nova etapa
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-0 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center bg-blue-50 text-blue-500">
                <LuLayoutDashboard size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Board ativo
                </p>

                <h2
                  className="truncate text-base font-semibold text-slate-900"
                  title={board?.name}
                >
                  {board?.name ?? "Selecione um board"}
                </h2>
              </div>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red hover:text-red-600 cursor-pointer"
              title="Excluir board"
              onClick={() => {
                Swal.fire({
                  title: "Tem certeza?",
                  text: "Essa ação não pode ser desfeita.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#d33",
                  cancelButtonColor: "#3085d6",
                  confirmButtonText: "Sim, excluir",
                  cancelButtonText: "Cancelar",
                }).then(async (result) => {
                  if (result.isConfirmed) {
                    try {
                      if (boards.length > 1) {
                        const res = await fetch(
                          `${apiUrl}/flow/board/${activeBoardId}`,
                          {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${
                                localStorage.getItem("authToken") ?? ""
                              }`,
                            },
                          }
                        );

                        if (!res.ok) throw new Error("Erro ao excluir board");
                        toast.success("Board excluído");
                        setBoards((prev) =>
                          prev.filter((b) => b.id !== activeBoardId)
                        );
                        const activeRes = await fetch(`${apiUrl}/flow/board`, {
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${
                              localStorage.getItem("authToken") ?? ""
                            }`,
                          },
                        });
                        if (!activeRes.ok)
                          throw new Error("Erro ao carregar fluxo");
                        const activeData = await activeRes.json();
                        setBoard(activeData);
                        setActiveBoardId(activeData?.id ?? null);
                      } else {
                        toast.error(
                          "Não é possível excluir o último board restante"
                        );
                      }
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Erro ao excluir board"
                      );
                    }
                  }
                });
              }}
            >
              <FiTrash2 size={18} />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((s, idx) => {
              const list = cardsByStep.get(s.id) ?? [];
              const isOver = dragOverStepId === s.id;

              return (
                <div
                  key={s.id}
                  className={`w-[280px] sm:w-80 shrink-0 rounded-xl bg-white shadow-sm border border-slate-200 p-3 ${
                    isOver ? "ring-2 ring-blue-500" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStepId(s.id);
                  }}
                  onDragLeave={() =>
                    setDragOverStepId((prev) => (prev === s.id ? null : prev))
                  }
                  onDrop={() => handleDropOnStep(s.id)}
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        className={`px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition ${
                          idx === 0 ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        disabled={idx === 0}
                        onClick={async () => {
                          if (!board) return;
                          // move step up in local order
                          const ordered = [...board.steps].sort(
                            (a, b) => a.order - b.order
                          );
                          const from = idx;
                          const to = idx - 1;
                          if (to < 0) return;
                          const updatedSteps = ordered.map((st) => {
                            if (st.id === ordered[from].id)
                              return { ...st, order: st.order - 1 };
                            if (st.id === ordered[to].id)
                              return { ...st, order: st.order + 1 };
                            return st;
                          });
                          setBoard({ ...board, steps: updatedSteps });
                          try {
                            const payload = {
                              boardId: board.id,
                              steps: updatedSteps
                                .map((st) => ({ id: st.id, order: st.order }))
                                .sort((a, b) => a.order - b.order),
                            };
                            const res = await fetch(
                              `${apiUrl}/flow/steps/reorder`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${
                                    localStorage.getItem("authToken") ?? ""
                                  }`,
                                },
                                body: JSON.stringify(payload),
                              }
                            );
                            if (!res.ok)
                              throw new Error("Erro ao reordenar etapas");
                            const fresh = await res.json();
                            setBoard(fresh);
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : "Erro ao reordenar etapas"
                            );
                          } finally {
                          }
                        }}
                        aria-label="Mover etapa para esquerda"
                      >
                        <IoIosArrowRoundBack />
                      </button>
                      <h3
                        className="font-semibold text-slate-800 flex-1 truncate"
                        title={s.name}
                      >
                        {s.name}
                      </h3>

                      <button
                        type="button"
                        className={`px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition ${
                          idx === columns.length - 1
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={idx === columns.length - 1}
                        onClick={async () => {
                          if (!board) return;
                          const ordered = [...board.steps].sort(
                            (a, b) => a.order - b.order
                          );
                          const from = idx;
                          const to = idx + 1;
                          if (to >= ordered.length) return;
                          const updatedSteps = ordered.map((st) => {
                            if (st.id === ordered[from].id)
                              return { ...st, order: st.order + 1 };
                            if (st.id === ordered[to].id)
                              return { ...st, order: st.order - 1 };
                            return st;
                          });
                          setBoard({ ...board, steps: updatedSteps });
                          try {
                            const payload = {
                              boardId: board.id,
                              steps: updatedSteps
                                .map((st) => ({ id: st.id, order: st.order }))
                                .sort((a, b) => a.order - b.order),
                            };
                            const res = await fetch(
                              `${apiUrl}/flow/steps/reorder`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${
                                    localStorage.getItem("authToken") ?? ""
                                  }`,
                                },
                                body: JSON.stringify(payload),
                              }
                            );
                            if (!res.ok)
                              throw new Error("Erro ao reordenar etapas");
                            const fresh = await res.json();
                            setBoard(fresh);
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : "Erro ao reordenar etapas"
                            );
                          } finally {
                          }
                        }}
                        aria-label="Mover etapa para direita"
                      >
                        <IoIosArrowRoundForward />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditStep(s)}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                        title="Editar etapa"
                      >
                        <FiEdit2 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStep(s)}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        title="Excluir etapa"
                      >
                        <FiTrash2 size={16} />
                      </button>

                      <span className="text-xs text-slate-500 min-w-[20px] text-center">
                        {list.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {list.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => {
                          dragMovedRef.current = false;
                          handleDragStart(c.id);
                        }}
                        onDrag={() => {
                          dragMovedRef.current = true;
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (dragMovedRef.current) return;
                          if (c.kitId) openBusinessDetail(c);
                        }}
                        className={`relative bg-slate-50 border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-slate-100 transition ${
                          c.kitId ? "hover:border-[#b8860b]/40" : ""
                        }`}
                      >
                        {c.kitId ? (
                          <div className="absolute top-2 right-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCardMenuOpenId((prev) =>
                                  prev === c.id ? null : c.id
                                );
                              }}
                              className="p-1 rounded-md text-slate-400 hover:bg-white hover:text-slate-700 transition"
                              title="Opções do card"
                              aria-label="Opções do card"
                            >
                              <FiMoreVertical size={16} />
                            </button>
                            {cardMenuOpenId === c.id ? (
                              <div
                                className="absolute right-0 mt-1 z-20 min-w-[190px] rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  onClick={() => openTransferModal(c)}
                                >
                                  Mover para outro board
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  onClick={() => handleCancelCard(c)}
                                >
                                  Remover do fluxo
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="text-sm font-semibold text-slate-900 pr-7">
                          {c.title}
                        </div>
                        {c.reseller?.name && (
                          <div className="text-[11px] text-[#b8860b] mt-1 font-medium">
                            {c.reseller.name}
                          </div>
                        )}
                        {c.description ? (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {c.description}
                          </div>
                        ) : null}
                        {c.kitId ? (
                          <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">
                            Clique para abrir o negócio
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {list.length === 0 ? (
                      <div className="text-xs text-slate-400 italic pt-2">
                        Solte aqui
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {!board ? (
            <div className="mt-6 text-sm text-slate-500">
              Sem board configurado.
            </div>
          ) : null}

          <Modal
            open={createBoardOpen}
            title="Criar novo board"
            onClose={() => {
              setCreateBoardOpen(false);
              setNewBoardName("");
            }}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Nome do board
              </label>
              <input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-black"
                placeholder="Ex: Vendas 2026"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setCreateBoardOpen(false);
                    setNewBoardName("");
                  }}
                  disabled={creatingBoard}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-800 text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (creatingBoard) return;
                    const name = newBoardName.trim();
                    if (!name) {
                      toast.error("Informe um nome para o board");
                      return;
                    }

                    setCreatingBoard(true);
                    try {
                      const res = await fetch(`${apiUrl}/flow/board`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${
                            localStorage.getItem("authToken") ?? ""
                          }`,
                        },
                        body: JSON.stringify({ name }),
                      });

                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error ?? "Erro ao criar board");
                      }
                      const boardsRes = await fetch(`${apiUrl}/flow/boards`, {
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${
                            localStorage.getItem("authToken") ?? ""
                          }`,
                        },
                      });
                      if (!boardsRes.ok)
                        throw new Error("Erro ao carregar boards");
                      const boardsData: Array<{ id: number; name: string }> =
                        await boardsRes.json();
                      setBoards(boardsData);
                      toast.success("Board criado");
                      setCreateBoardOpen(false);
                      setNewBoardName("");
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Erro ao criar board"
                      );
                    } finally {
                      setCreatingBoard(false);
                    }
                  }}
                  disabled={creatingBoard}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingBoard ? "Criando..." : "Criar"}
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={createStepOpen}
            title="Nova etapa"
            onClose={() => {
              setCreateStepOpen(false);
              setNewStepName("");
            }}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Nome da etapa
              </label>
              <input
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-black"
                placeholder="Ex: Em andamento"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setCreateStepOpen(false);
                    setNewStepName("");
                  }}
                  disabled={creatingStep}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-800 text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!board || creatingStep) return;
                    const name = newStepName.trim();
                    if (!name) {
                      toast.error("Informe um nome para a etapa");
                      return;
                    }

                    const order = board.steps.length;
                    const tempId = Date.now();

                    setCreatingStep(true);
                    setBoard((prev) =>
                      prev
                        ? {
                            ...prev,
                            steps: [
                              ...prev.steps,
                              {
                                id: tempId,
                                name,
                                businessId: board.id,
                                order,
                              },
                            ],
                          }
                        : prev
                    );

                    try {
                      const res = await fetch(`${apiUrl}/flow/steps`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${
                            localStorage.getItem("authToken") ?? ""
                          }`,
                        },
                        body: JSON.stringify({
                          boardId: board.id,
                          name,
                          order,
                        }),
                      });

                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error ?? "Erro ao criar etapa");
                      }

                      const created = await res.json();
                      const newStep: Step = {
                        id: created.id,
                        name: created.name,
                        businessId: created.boardId,
                        order: created.order,
                      };

                      setBoard((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          steps: prev.steps.map((s) =>
                            s.id === tempId ? newStep : s
                          ),
                        };
                      });

                      toast.success("Etapa criada");
                      setCreateStepOpen(false);
                      setNewStepName("");
                    } catch (e) {
                      setBoard((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          steps: prev.steps.filter((s) => s.id !== tempId),
                        };
                      });
                      toast.error(
                        e instanceof Error ? e.message : "Erro ao criar etapa"
                      );
                    } finally {
                      setCreatingStep(false);
                    }
                  }}
                  disabled={creatingStep}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingStep ? "Criando..." : "Criar"}
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={openModalEditStep}
            title="Editar etapa"
            onClose={() => {
              setOpenModalEditStep(false);
              setEditingStep(null);
            }}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Nome da etapa
              </label>
              <input
                value={editingStep?.name ?? ""}
                onChange={(e) =>
                  setEditingStep((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-black"
                placeholder="Ex: Em andamento"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setOpenModalEditStep(false);
                    setEditingStep(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-800 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!board || !editingStep) return;
                    const name = editingStep.name.trim();
                    if (!name) {
                      toast.error("Informe um nome para a etapa");
                      return;
                    }

                    try {
                      const res = await fetch(
                        `${apiUrl}/flow/steps/${editingStep.id}`,

                        {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${
                              localStorage.getItem("authToken") ?? ""
                            }`,
                          },
                          body: JSON.stringify({
                            name,
                          }),
                        }
                      );
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error ?? "Erro ao editar etapa");
                      }
                      const updatedStep = await res.json();
                      setBoard((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          steps: prev.steps.map((s) =>
                            s.id === updatedStep.id ? updatedStep : s
                          ),
                        };
                      });
                      toast.success("Etapa editada");
                      setOpenModalEditStep(false);
                      setEditingStep(null);
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Erro ao editar etapa"
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium"
                >
                  Salvar
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={createBusinessOpen}
            title="Criar negócio"
            onClose={() => {
              setCreateBusinessOpen(false);
              setSelectedKitId("");
              setSelectedResellerId("");
            }}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Vincule um kit montado a uma revendedora. O card será criado na
                primeira etapa{firstStep ? `: ${firstStep.name}` : ""}.
              </p>

              {loadingBusinessData ? (
                <p className="text-sm text-slate-500">Carregando opções...</p>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Kit montado
                    </label>
                    <select
                      value={selectedKitId}
                      onChange={(e) => setSelectedKitId(e.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-black"
                    >
                      <option value="">Selecione um kit...</option>
                      {availableKits.map((kit) => (
                        <option key={kit.id} value={kit.id}>
                          Kit {kit.kitNumber} — {kit.totalQty} peças —{" "}
                          {formatKitMoney(kit.grandTotal)}
                        </option>
                      ))}
                    </select>
                    {availableKits.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Nenhum kit disponível. Monte um kit em Montar Kit primeiro.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Revendedora
                    </label>
                    <select
                      value={selectedResellerId}
                      onChange={(e) => setSelectedResellerId(e.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-black"
                    >
                      <option value="">Selecione uma revendedora...</option>
                      {resellers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {r.cpf}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setCreateBusinessOpen(false);
                    setSelectedKitId("");
                    setSelectedResellerId("");
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-800 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateBusiness}
                  disabled={
                    creatingBusiness ||
                    loadingBusinessData ||
                    !selectedKitId ||
                    !selectedResellerId
                  }
                  className="px-4 py-2 rounded-lg bg-[#b8860b] hover:bg-[#9a7209] transition text-white text-sm font-medium disabled:opacity-50"
                >
                  {creatingBusiness ? "Criando..." : "Criar negócio"}
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={businessOpen}
            title={businessDetail?.title ?? "Negócio"}
            size="2xl"
            onClose={() => {
              setBusinessOpen(false);
              setBusinessDetail(null);
            }}
          >
            {loadingBusinessDetail ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Carregando kit...
              </p>
            ) : businessDetail ? (
              <BusinessKitPanel
                detail={businessDetail}
                mode="admin"
                updatingUnitId={updatingUnitId}
                onToggleUnit={toggleUnitStatus}
                onFinalize={handleFinalizeBusiness}
                finalizing={finalizingBusiness}
              />
            ) : null}
          </Modal>

          <Modal
            open={transferCardTarget != null}
            title="Mover card para outro board"
            onClose={() => {
              setTransferCardTarget(null);
              setTransferBoardId("");
            }}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                O card{" "}
                <strong>{transferCardTarget?.title}</strong> será movido para a
                primeira etapa do board selecionado.
              </p>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Board de destino
                </label>
                <select
                  value={transferBoardId}
                  onChange={(e) => setTransferBoardId(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-black"
                >
                  <option value="">Selecione um board...</option>
                  {boards
                    .filter((entry) => entry.id !== board?.id)
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransferCardTarget(null);
                    setTransferBoardId("");
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-800 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTransferCard}
                  disabled={transferringCard || !transferBoardId}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium disabled:opacity-50"
                >
                  {transferringCard ? "Movendo..." : "Mover card"}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
