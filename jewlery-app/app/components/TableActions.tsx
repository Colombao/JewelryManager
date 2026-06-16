"use client";

import { ReactNode } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { MdOutlineToggleOff, MdOutlineToggleOn } from "react-icons/md";

interface TableActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  isActive?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  toggleLabel?: string;
  children?: ReactNode;
  compact?: boolean;
}

export default function TableActions({
  onEdit,
  onDelete,
  onToggle,
  isActive,
  editLabel = "Editar",
  deleteLabel = "Excluir",
  toggleLabel,
  children,
  compact = true,
}: TableActionsProps) {
  const iconSize = compact ? 16 : 18;
  const toggleIconSize = compact ? 18 : 22;
  const buttonClass = compact
    ? "p-1.5 rounded-md transition"
    : "p-2 rounded-lg transition";

  return (
    <div
      className={`flex items-center ${
        compact ? "justify-center gap-0.5" : "gap-1"
      }`}
    >
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={editLabel}
          aria-label={editLabel}
          className={`${buttonClass} text-blue-600 hover:bg-blue-100`}
        >
          <FiEdit2 size={iconSize} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={deleteLabel}
          aria-label={deleteLabel}
          className={`${buttonClass} text-red-600 hover:bg-red-100`}
        >
          <FiTrash2 size={iconSize} />
        </button>
      )}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          title={toggleLabel ?? (isActive ? "Desativar" : "Ativar")}
          aria-label={toggleLabel ?? (isActive ? "Desativar" : "Ativar")}
          className={`${buttonClass} ${
            isActive
              ? "text-emerald-600 hover:bg-emerald-100"
              : "text-slate-400 hover:bg-slate-100"
          }`}
        >
          {isActive ? (
            <MdOutlineToggleOn size={toggleIconSize} />
          ) : (
            <MdOutlineToggleOff size={toggleIconSize} />
          )}
        </button>
      )}
      {children}
    </div>
  );
}

export function StatusBadge({
  active,
  activeLabel = "Ativo",
  inactiveLabel = "Inativo",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
