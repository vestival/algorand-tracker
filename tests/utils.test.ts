import { describe, expect, it } from "vitest";

import { formatAlgo, formatUsdPrecise, getAlgorandExplorerTxUrl } from "@/lib/utils";

describe("getAlgorandExplorerTxUrl", () => {
  it("returns explorer link for canonical tx ids", () => {
    const txId = "YBJ536UGOEKXLOM6JJDQLVJ3V4JHCB6XUTI75T7S2B4NID5KNDQA";
    expect(getAlgorandExplorerTxUrl(txId)).toBe(`https://explorer.perawallet.app/tx/${txId}`);
  });

  it("returns null for synthetic inner tx identifiers", () => {
    expect(getAlgorandExplorerTxUrl("ABC123:inner:0")).toBeNull();
  });
});

describe("format helpers", () => {
  it("formats precise USD with 3+ decimals", () => {
    expect(formatUsdPrecise(0.001)).toBe("$0.001");
    expect(formatUsdPrecise(0.1234567)).toBe("$0.123457");
  });

  it("formats ALGO fee with at least 3 decimals", () => {
    expect(formatAlgo(0.001)).toBe("0.001 ALGO");
  });
});
