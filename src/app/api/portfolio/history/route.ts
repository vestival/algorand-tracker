import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { buildPortfolioHistory } from "@/lib/portfolio/history";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/request";

const env = getEnv();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit({
    key: `portfolio-history:${session.user.id}:${ip}`,
    userId: session.user.id,
    ip,
    windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS,
    max: env.PUBLIC_RATE_LIMIT_MAX
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { userId: session.user.id },
    select: { computedAt: true, data: true },
    orderBy: { computedAt: "asc" },
    take: 365
  });

  const history = buildPortfolioHistory(
    snapshots.map((snapshot) => ({
      computedAt: snapshot.computedAt,
      data: snapshot.data
    }))
  );

  return NextResponse.json({ history });
}
