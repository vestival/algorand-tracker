import { describe, expect, it } from "vitest";

import { computePortfolioSnapshot } from "@/lib/portfolio/snapshot";

describe("computePortfolioSnapshot", () => {
  it("builds a snapshot with balances and pnl using mocked dependencies", async () => {
    const snapshot = await computePortfolioSnapshot(["W1"], {
      getAccountStateFn: async () => ({
        address: "W1",
        algoAmount: 10,
        assets: [
          {
            assetId: 31566704,
            amount: 100,
            decimals: 6
          }
        ],
        appsLocalState: [552635992]
      }),
      getTransactionsFn: async () => [
        {
          id: "tx1",
          sender: "X",
          fee: 1000,
          confirmedRoundTime: 1,
          paymentTransaction: {
            receiver: "W1",
            amount: 10_000_000
          }
        },
        {
          id: "tx2",
          sender: "W1",
          fee: 1000,
          confirmedRoundTime: 2,
          assetTransferTransaction: {
            receiver: "Y",
            amount: 10_000_000,
            assetId: 31566704
          }
        }
      ],
      getSpotPricesFn: async () => ({
        ALGO: 2,
        "31566704": 1
      }),
      getDefiPositionsFn: async () => [
        {
          protocol: "Tinyman",
          wallet: "W1",
          positionType: "lp",
          estimated: true,
          valueUsd: null
        }
      ]
    });

    expect(snapshot.assets.length).toBeGreaterThan(0);
    expect(snapshot.totals.valueUsd).toBeGreaterThan(0);
    expect(snapshot.defiPositions.length).toBe(1);
    expect(snapshot.method).toBe("FIFO");
  });

  it("attributes wallet cost basis from inbound buys, not only sender txns", async () => {
    const snapshot = await computePortfolioSnapshot(["W1"], {
      getAccountStateFn: async () => ({
        address: "W1",
        algoAmount: 5,
        assets: [],
        appsLocalState: []
      }),
      getTransactionsFn: async () => [
        {
          id: "inbound-buy",
          sender: "X",
          fee: 1000,
          confirmedRoundTime: 1,
          paymentTransaction: {
            receiver: "W1",
            amount: 5_000_000
          }
        }
      ],
      getSpotPricesFn: async () => ({
        ALGO: 2
      }),
      getDefiPositionsFn: async () => []
    });

    expect(snapshot.wallets).toHaveLength(1);
    expect(snapshot.wallets[0]?.totalCostBasisUsd).toBeCloseTo(10);
  });
});
