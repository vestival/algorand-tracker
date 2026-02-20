import { describe, expect, it } from "vitest";

import { inferDefiPositionsFromHoldings } from "@/lib/defi/inferred";

describe("inferDefiPositionsFromHoldings", () => {
  it("infers Folks and Tinyman rows from known liquid-staking holdings", async () => {
    const rows = await inferDefiPositionsFromHoldings(["W1"], {
      getAccountStateFn: async () => ({
        address: "W1",
        algoAmount: 1,
        appsLocalState: [],
        assets: [
          { assetId: 1134696561, amount: 10, decimals: 6 }, // xALGO
          { assetId: 2537013734, amount: 20, decimals: 6 } // tALGO
        ]
      }),
      getSpotPricesFn: async () => ({
        "1134696561": 0.11,
        "2537013734": 0.09
      })
    });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.assetId === 1134696561)?.protocol).toBe("Folks Finance");
    expect(rows.find((row) => row.assetId === 2537013734)?.protocol).toBe("Tinyman");
    expect(rows.find((row) => row.assetId === 1134696561)?.valueUsd).toBeCloseTo(1.1);
    expect(rows.find((row) => row.assetId === 2537013734)?.valueUsd).toBeCloseTo(1.8);
  });

  it("ignores unknown assets and zero balances", async () => {
    const rows = await inferDefiPositionsFromHoldings(["W1"], {
      getAccountStateFn: async () => ({
        address: "W1",
        algoAmount: 1,
        appsLocalState: [],
        assets: [
          { assetId: 1, amount: 123, decimals: 6 },
          { assetId: 1134696561, amount: 0, decimals: 6 }
        ]
      }),
      getSpotPricesFn: async () => ({})
    });

    expect(rows).toHaveLength(0);
  });
});
