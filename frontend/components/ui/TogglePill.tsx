import { ButtonHTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

export function TogglePill({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-lime/30 bg-lime/10 text-lime"
          : "border-line bg-slate-950/60 text-slate-300 hover:border-cyan/40",
        className,
      )}
      {...props}
    />
  );
}
