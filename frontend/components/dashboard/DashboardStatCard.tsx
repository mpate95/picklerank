import { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

export function DashboardStatCard({
  eyebrow,
  title,
  value,
  accent,
  detail,
}: {
  eyebrow: string;
  title: string;
  value: ReactNode;
  accent: string;
  detail?: ReactNode;
}) {
  return (
    <Card className="relative flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <p className="pr-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 sm:text-xs">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-base font-medium leading-snug text-white sm:text-lg">{title}</h3>
      {detail ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{detail}</p> : null}
      <div className="mt-auto pt-5 text-2xl font-semibold text-white sm:text-3xl">{value}</div>
    </Card>
  );
}
