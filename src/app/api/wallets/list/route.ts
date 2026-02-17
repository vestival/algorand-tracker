import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
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
    key: `wallets-list:${session.user.id}:${ip}`,
    userId: session.user.id,
    ip,
    windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS,
    max: env.PUBLIC_RATE_LIMIT_MAX
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const wallets = await prisma.linkedWallet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      address: true,
      label: true,
      verifiedAt: true
    }
  });

  return NextResponse.json({ wallets });
}
