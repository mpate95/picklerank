import { TextareaHTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-line bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan",
        className,
      )}
      {...props}
    />
  );
}
