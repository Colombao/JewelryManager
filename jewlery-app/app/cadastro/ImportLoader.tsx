import { RiJewelryFill } from "react-icons/ri";

interface ImportLoaderProps {
  title: string;
  subtitle?: string;
}

export default function ImportLoader({ title, subtitle }: ImportLoaderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-14 px-4 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-amber-100" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
        <RiJewelryFill className="relative h-9 w-9 text-amber-500 animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {subtitle && <p className="mt-1 max-w-xs text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
