import { LabelHTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-sm font-medium text-slate-300", className)} {...props} />;
}
