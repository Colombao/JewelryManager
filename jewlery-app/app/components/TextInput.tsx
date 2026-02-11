"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ icon, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          {...props}
          className={`w-full h-12 pl-12 pr-3 rounded-md border border-slate-200 placeholder-slate-400 text-black focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
        />
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
