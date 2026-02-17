import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to max and blocks after max in the same window", async () => {
    const hits: Array<{ userId: string; action: string }> = [];
    const store = {
      countHits: async (params: { userId: string; action: string; since: Date }) =>
        hits.filter((hit) => hit.userId === params.userId && hit.action === params.action).length,
      recordHit: async (params: { userId: string; action: string }) => {
        hits.push({ userId: params.userId, action: params.action });
      }
    };

    const first = await checkRateLimit(
      {
        key: "wallets-list:U1:127.0.0.1",
        userId: "U1",
        windowMs: 60_000,
        max: 2
      },
      store
    );
    const second = await checkRateLimit(
      {
        key: "wallets-list:U1:127.0.0.1",
        userId: "U1",
        windowMs: 60_000,
        max: 2
      },
      store
    );
    const third = await checkRateLimit(
      {
        key: "wallets-list:U1:127.0.0.1",
        userId: "U1",
        windowMs: 60_000,
        max: 2
      },
      store
    );

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(third).toBe(false);
  });

  it("falls back to local limiter when persistent store fails", async () => {
    const failingStore = {
      countHits: async () => {
        throw new Error("db unavailable");
      },
      recordHit: async () => {
        throw new Error("db unavailable");
      }
    };

    const first = await checkRateLimit(
      {
        key: "snapshot:U2:127.0.0.1",
        userId: "U2",
        windowMs: 60_000,
        max: 1
      },
      failingStore
    );
    const second = await checkRateLimit(
      {
        key: "snapshot:U2:127.0.0.1",
        userId: "U2",
        windowMs: 60_000,
        max: 1
      },
      failingStore
    );

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
