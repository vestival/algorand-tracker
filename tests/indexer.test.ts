import { afterEach, describe, expect, it, vi } from "vitest";

import { getTransactionsForAddress } from "@/lib/algorand/indexer";

describe("indexer transaction fetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes inner transfers from app-call transactions", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        transactions: [
          {
            id: "APP_TX_1",
            sender: "SENDER",
            fee: 1000,
            "round-time": 123,
            "inner-txns": [
              {
                sender: "POOL",
                fee: 0,
                "round-time": 123,
                "asset-transfer-transaction": {
                  receiver: "WALLET",
                  amount: 2500000,
                  "asset-id": 2537013734
                }
              }
            ]
          }
        ]
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    const txns = await getTransactionsForAddress("WALLET", 20);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v2/transactions?address=WALLET&limit=20");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("tx-type=");
    expect(txns.some((tx) => tx.id === "APP_TX_1:inner:0" && tx.assetTransferTransaction?.assetId === 2537013734)).toBe(
      true
    );
  });
});
