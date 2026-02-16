import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function writeAuditLog(userId: string, action: string, metadata?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      metadata: metadata as Prisma.InputJsonValue | undefined
    }
  });
}
