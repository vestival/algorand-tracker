import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";

const env = getEnv();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const allowed = checkRateLimit(`portfolio-snapshot:${session.user.id}:${ip}`, env.PUBLIC_RATE_LIMIT_WINDOW_MS, env.PUBLIC_RATE_LIMIT_MAX);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: { userId: session.user.id },
    orderBy: { computedAt: "desc" },
    select: {
      data: true
    }
  });

  return NextResponse.json({ snapshot: snapshot?.data ?? null });
}
