import { HTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line bg-panel/90 p-5 shadow-panel backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
