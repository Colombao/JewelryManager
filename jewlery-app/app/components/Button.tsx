"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      fullWidth = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70";

    const variants: Record<string, string> = {
      primary:
        "px-4 py-2 bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md hover:from-blue-700 hover:to-blue-600 active:scale-95",
      secondary:
        "px-3 py-1 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm",
      ghost: "px-2 py-1 bg-transparent text-slate-700 hover:bg-slate-50",
      danger: "bg-red-600 text-white hover:bg-red-700 px-3 py-1 shadow-sm",
      success: "bg-green-600 text-white hover:bg-green-700 px-3 py-1 shadow-sm",
    };

    const widthClass = fullWidth ? "w-full" : "inline-flex";

    return (
      <button
        ref={ref}
        className={`${base} ${
          variants[variant] ?? variants.primary
        } ${widthClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
