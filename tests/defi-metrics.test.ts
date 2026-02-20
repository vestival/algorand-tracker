import { describe, expect, it } from "vitest";

import { computeComponentBasisUsd, computePositionAtDepositUsd } from "@/lib/defi/metrics";

describe("defi metrics", () => {
  it("computes proportional basis for a component", () => {
    const basisByAssetId = new Map([
      [
        2537013734,
        {
          assetId: 2537013734,
          balance: 23491.032837,
          costBasisUsd: 2865.86
        }
      ]
    ]);

    const basis = computeComponentBasisUsd(
      {
        assetId: 2537013734,
        amount: 23491.032837
      },
      basisByAssetId
    );

    expect(basis).toBeCloseTo(2865.86, 6);
  });

  it("caps ratio at 1 when component amount is greater than tracked balance", () => {
    const basisByAssetId = new Map([
      [
        1,
        {
          assetId: 1,
          balance: 100,
          costBasisUsd: 50
        }
      ]
    ]);

    const basis = computeComponentBasisUsd(
      {
        assetId: 1,
        amount: 150
      },
      basisByAssetId
    );

    expect(basis).toBe(50);
  });

  it("sums multi-component basis and skips unknown assets", () => {
    const basisByAssetId = new Map([
      [
        10,
        {
          assetId: 10,
          balance: 200,
          costBasisUsd: 1000
        }
      ],
      [
        20,
        {
          assetId: 20,
          balance: 50,
          costBasisUsd: 200
        }
      ]
    ]);

    const total = computePositionAtDepositUsd(
      [
        { assetId: 10, amount: 100 },
        { assetId: 20, amount: 25 },
        { assetId: 999, amount: 10 }
      ],
      basisByAssetId
    );

    expect(total).toBeCloseTo(600, 6);
  });

  it("returns null when no component has basis information", () => {
    const total = computePositionAtDepositUsd(
      [{ assetId: 999, amount: 1 }],
      new Map()
    );
    expect(total).toBeNull();
  });
});
