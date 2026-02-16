import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }

  return <DashboardClient />;
}
