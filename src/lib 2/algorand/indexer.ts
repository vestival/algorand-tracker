import { getEnv } from "@/lib/env";
import type { AccountState, AssetHolding, IndexerTxn } from "@/lib/algorand/types";

const env = getEnv();

type IndexerAccountResponse = {
  account: {
    address: string;
    amount: number;
    assets?: Array<{ "asset-id": number; amount: number }>;
    "apps-local-state"?: Array<{ id: number }>;
  };
};

type IndexerAssetResponse = {
  asset: {
    index: number;
    params?: {
      decimals?: number;
    };
  };
};

type IndexerTxnResponse = {
  transactions: Array<{
    id: string;
    sender: string;
    fee: number;
    "confirmed-round-time"?: number;
    group?: string;
    note?: string;
    "payment-transaction"?: {
      receiver: string;
      amount: number;
    };
    "asset-transfer-transaction"?: {
      receiver: string;
      amount: number;
      "asset-id": number;
    };
  }>;
};

async function indexerFetch<T>(path: string): Promise<T> {
  const url = `${env.ALGORAND_INDEXER_URL}${path}`;
  const response = await fetch(url, {
    headers: env.ALGORAND_INDEXER_TOKEN
      ? {
          "X-API-Key": env.ALGORAND_INDEXER_TOKEN
        }
      : undefined,
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Indexer request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

const assetDecimalCache = new Map<number, number>();

export async function getAssetDecimals(assetId: number): Promise<number> {
  const cached = assetDecimalCache.get(assetId);
  if (cached !== undefined) {
    return cached;
  }

  const data = await indexerFetch<IndexerAssetResponse>(`/v2/assets/${assetId}`);
  const decimals = data.asset.params?.decimals ?? 0;
  assetDecimalCache.set(assetId, decimals);
  return decimals;
}

export async function getAccountState(address: string): Promise<AccountState> {
  const data = await indexerFetch<IndexerAccountResponse>(`/v2/accounts/${address}`);

  const assetRows = data.account.assets ?? [];
  const assets: AssetHolding[] = [];

  for (const row of assetRows) {
    const decimals = await getAssetDecimals(row["asset-id"]);
    assets.push({
      assetId: row["asset-id"],
      amount: row.amount / 10 ** decimals,
      decimals
    });
  }

  return {
    address: data.account.address,
    algoAmount: data.account.amount / 1_000_000,
    assets,
    appsLocalState: (data.account["apps-local-state"] ?? []).map((x) => x.id)
  };
}

export async function getTransactionsForAddress(address: string, limit = env.INDEXER_TX_LIMIT): Promise<IndexerTxn[]> {
  const data = await indexerFetch<IndexerTxnResponse>(`/v2/transactions?address=${address}&limit=${limit}`);

  return data.transactions.map((txn) => ({
    id: txn.id,
    sender: txn.sender,
    fee: txn.fee,
    confirmedRoundTime: txn["confirmed-round-time"] ?? 0,
    group: txn.group,
    note: txn.note,
    paymentTransaction: txn["payment-transaction"],
    assetTransferTransaction: txn["asset-transfer-transaction"]
      ? {
          receiver: txn["asset-transfer-transaction"].receiver,
          amount: txn["asset-transfer-transaction"].amount,
          assetId: txn["asset-transfer-transaction"]["asset-id"]
        }
      : undefined
  }));
}

export async function findVerificationTransaction(
  address: string,
  notePlainText: string,
  minUnixTime: number,
  maxUnixTime: number
): Promise<IndexerTxn | null> {
  const txns = await getTransactionsForAddress(address, 1000);

  const noteBase64 = Buffer.from(notePlainText, "utf8").toString("base64");

  return (
    txns.find((txn) => {
      if (!txn.note || !txn.paymentTransaction) {
        return false;
      }
      const ts = txn.confirmedRoundTime;
      return ts >= minUnixTime && ts <= maxUnixTime && txn.note === noteBase64;
    }) ?? null
  );
}
