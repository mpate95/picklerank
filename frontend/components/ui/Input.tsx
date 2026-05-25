import { InputHTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-line bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan",
        className,
      )}
      {...props}
    />
  );
}
