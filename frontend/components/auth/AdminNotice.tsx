import Link from "next/link";

import { Card } from "@/components/ui/Card";

export function AdminNotice({ title = "Admin only" }: { title?: string }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">
        You can view this data without logging in, but only the admin can make changes.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/login" className="text-cyan hover:text-white">
          Log in as admin
        </Link>
      </p>
    </Card>
  );
}
