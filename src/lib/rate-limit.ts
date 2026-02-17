import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const ACTION_PREFIX = "rate_limit.hit";

type CheckRateLimitParams = {
  key: string;
  userId: string;
  windowMs: number;
  max: number;
  ip?: string;
};

type RateLimitStore = {
  countHits: (params: { userId: string; action: string; since: Date }) => Promise<number>;
  recordHit: (params: { userId: string; action: string; metadata?: Prisma.InputJsonValue }) => Promise<void>;
};

const defaultStore: RateLimitStore = {
  async countHits(params) {
    return prisma.auditLog.count({
      where: {
        userId: params.userId,
        action: params.action,
        createdAt: { gte: params.since }
      }
    });
  },
  async recordHit(params) {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        metadata: params.metadata
      }
    });
  }
};

export async function checkRateLimit(params: CheckRateLimitParams, store: RateLimitStore = defaultStore): Promise<boolean> {
  const action = `${ACTION_PREFIX}:${params.key}`;
  const now = Date.now();
  const since = new Date(now - params.windowMs);

  try {
    const count = await store.countHits({
      userId: params.userId,
      action,
      since
    });

    if (count >= params.max) {
      return false;
    }

    await store.recordHit({
      userId: params.userId,
      action,
      metadata: {
        key: params.key,
        ip: params.ip ?? null,
        windowMs: params.windowMs,
        max: params.max
      } as Prisma.InputJsonValue
    });
    return true;
  } catch {
    // Fallback for transient DB failures: local in-memory limiter.
    const fallbackKey = `${params.userId}:${params.key}`;
    const bucket = buckets.get(fallbackKey);
    if (!bucket || now >= bucket.resetAt) {
      buckets.set(fallbackKey, { count: 1, resetAt: now + params.windowMs });
      return true;
    }
    if (bucket.count >= params.max) {
      return false;
    }
    bucket.count += 1;
    return true;
  }
}
