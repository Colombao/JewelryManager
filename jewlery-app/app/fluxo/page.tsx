"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import MainLayout from "../components/MainLayout";
import Modal from "../components/Modal";
import RequireAuth from "../components/RequireAuth";

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const [boards, setBoards] = useState<Array<{ id: number; name: string }>>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const [draggingCardId, setDraggingCardId] = useState<number | null>(null);

  const [dragOverStepId, setDragOverStepId] = useState<number | null>(null);

  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const [createStepOpen, setCreateStepOpen] = useState(false);
  const [newStepName, setNewStepName] = useState("");

  const columns = useMemo(() => {
    if (!board) return [] as Step[];
    return [...board.steps].sort((a, b) => a.order - b.order);
  }, [board]);

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

  const handleDragEnd = () => {
    setDraggingCardId(null);
    setDragOverStepId(null);
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

  return (
    <RequireAuth>
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Fluxo</h1>
                <p className="text-slate-600">
                  Arraste cards entre etapas (Trelo-like).
                </p>
              </div>

              <div className="flex items-center gap-3">
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

          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((s) => {
              const list = cardsByStep.get(s.id) ?? [];
              const isOver = dragOverStepId === s.id;

              return (
                <div
                  key={s.id}
                  className={`w-80 shrink-0 rounded-xl bg-white shadow-sm border border-slate-200 p-3 ${
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
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="text-xs text-slate-500">{list.length}</div>
                  </div>

                  <div className="space-y-2">
                    {list.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => handleDragStart(c.id)}
                        onDragEnd={handleDragEnd}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-slate-100"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {c.title}
                        </div>
                        {c.description ? (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {c.description}
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
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Ex: Vendas 2026"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setCreateBoardOpen(false);
                    setNewBoardName("");
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-800 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const name = newBoardName.trim();
                    if (!name) {
                      toast.error("Informe um nome para o board");
                      return;
                    }

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

                      toast.success("Board criado");
                      setCreateBoardOpen(false);
                      setNewBoardName("");

                      const boardRes = await fetch(`${apiUrl}/flow/board`, {
                        headers: {
                          Authorization: `Bearer ${
                            localStorage.getItem("authToken") ?? ""
                          }`,
                        },
                      });
                      if (!boardRes.ok)
                        throw new Error("Erro ao recarregar board");
                      const data = await boardRes.json();
                      setBoard(data);
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Erro ao criar board"
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium"
                >
                  Criar
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
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Ex: Em andamento"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setCreateStepOpen(false);
                    setNewStepName("");
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-800 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!board) return;
                    const name = newStepName.trim();
                    if (!name) {
                      toast.error("Informe um nome para a etapa");
                      return;
                    }

                    try {
                      const order = board.steps.length;

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

                      toast.success("Etapa criada");
                      setCreateStepOpen(false);
                      setNewStepName("");

                      const boardRes = await fetch(`${apiUrl}/flow/board`, {
                        headers: {
                          Authorization: `Bearer ${
                            localStorage.getItem("authToken") ?? ""
                          }`,
                        },
                      });
                      if (!boardRes.ok)
                        throw new Error("Erro ao recarregar board");
                      const data = await boardRes.json();
                      setBoard(data);
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Erro ao criar etapa"
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium"
                >
                  Criar
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
