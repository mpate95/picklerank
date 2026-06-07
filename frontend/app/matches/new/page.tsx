"use client";

import { AdminNotice } from "@/components/auth/AdminNotice";
import { useAuth } from "@/components/auth/AuthProvider";
import { MatchResultForm } from "@/components/matches/MatchResultForm";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function NewMatchPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="New Match"
        description="Fast singles and doubles entry built for quick score capture and immediate leaderboard updates."
      />
      {isAdmin ? <MatchResultForm /> : <AdminNotice title="Match entry is admin only" />}
    </div>
  );
}
