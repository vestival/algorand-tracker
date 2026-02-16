import { describe, expect, it } from "vitest";

import { runFifo, type LotEvent } from "@/lib/portfolio/lots";

describe("runFifo", () => {
  it("computes remaining lots and realized pnl for basic buy/sell", () => {
    const events: LotEvent[] = [
      {
        txId: "t1",
        ts: 1,
        assetId: null,
        side: "buy",
        amount: 10,
        unitPriceUsd: 1,
        feeUsd: 0
      },
      {
        txId: "t2",
        ts: 2,
        assetId: null,
        side: "buy",
        amount: 5,
        unitPriceUsd: 2,
        feeUsd: 0
      },
      {
        txId: "t3",
        ts: 3,
        assetId: null,
        side: "sell",
        amount: 12,
        unitPriceUsd: 3,
        feeUsd: 0
      }
    ];

    const summary = runFifo(events);
    expect(summary.ALGO.remainingQty).toBeCloseTo(3);
    expect(summary.ALGO.remainingCostUsd).toBeCloseTo(6);
    expect(summary.ALGO.realizedPnlUsd).toBeCloseTo(22);
  });

  it("marks price gaps when a transaction has no price", () => {
    const events: LotEvent[] = [
      {
        txId: "t1",
        ts: 1,
        assetId: 31566704,
        side: "buy",
        amount: 100,
        unitPriceUsd: null,
        feeUsd: 0
      }
    ];

    const summary = runFifo(events);
    expect(summary["31566704"].hasPriceGaps).toBe(true);
  });

  it("applies fee policy correctly", () => {
    const events: LotEvent[] = [
      {
        txId: "t1",
        ts: 1,
        assetId: null,
        side: "buy",
        amount: 1,
        unitPriceUsd: 10,
        feeUsd: 1
      },
      {
        txId: "t2",
        ts: 2,
        assetId: null,
        side: "sell",
        amount: 1,
        unitPriceUsd: 15,
        feeUsd: 2
      }
    ];

    const summary = runFifo(events);
    expect(summary.ALGO.remainingQty).toBe(0);
    expect(summary.ALGO.realizedPnlUsd).toBeCloseTo(2); // (15 - 2) - (10 + 1)
  });
});
