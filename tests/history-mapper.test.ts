import { describe, expect, it } from "vitest";

import { mapLatestAssetStatesFromSnapshotAssets } from "@/lib/portfolio/history-mapper";

describe("mapLatestAssetStatesFromSnapshotAssets", () => {
  it("keeps snapshot assetKey values and does not collapse all assets into ALGO", () => {
    const out = mapLatestAssetStatesFromSnapshotAssets([
      { assetKey: "ALGO", balance: 4.68, priceUsd: 0.09 },
      { assetKey: "2537013734", balance: 23491.03, priceUsd: 0.093 },
      { assetKey: "31566704", balance: 1, priceUsd: 1 }
    ]);

    expect(out).toEqual([
      { assetKey: "ALGO", balance: 4.68, priceUsd: 0.09 },
      { assetKey: "2537013734", balance: 23491.03, priceUsd: 0.093 },
      { assetKey: "31566704", balance: 1, priceUsd: 1 }
    ]);
  });
});
