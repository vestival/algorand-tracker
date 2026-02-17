import { describe, expect, it } from "vitest";

import { buildPortfolioHistory } from "@/lib/portfolio/history";

describe("buildPortfolioHistory", () => {
  it("extracts sorted points and keeps latest snapshot per day", () => {
    const history = buildPortfolioHistory([
      {
        computedAt: "2026-02-15T08:00:00.000Z",
        data: { totals: { valueUsd: 100 } }
      },
      {
        computedAt: "2026-02-15T18:00:00.000Z",
        data: { totals: { valueUsd: 120 } }
      },
      {
        computedAt: "2026-02-16T08:00:00.000Z",
        data: { totals: { valueUsd: 130 } }
      }
    ]);

    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ ts: "2026-02-15T18:00:00.000Z", valueUsd: 120 });
    expect(history[1]).toEqual({ ts: "2026-02-16T08:00:00.000Z", valueUsd: 130 });
  });

  it("ignores invalid rows", () => {
    const history = buildPortfolioHistory([
      {
        computedAt: "invalid",
        data: { totals: { valueUsd: 100 } }
      },
      {
        computedAt: "2026-02-16T08:00:00.000Z",
        data: {}
      },
      {
        computedAt: "2026-02-17T08:00:00.000Z",
        data: { totals: { valueUsd: 140 } }
      }
    ]);

    expect(history).toEqual([{ ts: "2026-02-17T08:00:00.000Z", valueUsd: 140 }]);
  });
});
