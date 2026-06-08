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
    <Card className="relative overflow-hidden p-6">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-medium text-white">{title}</h3>
      {detail ? <p className="mt-2 text-base text-slate-400">{detail}</p> : null}
      <div className="mt-5 text-4xl font-semibold text-white">{value}</div>
    </Card>
  );
}
