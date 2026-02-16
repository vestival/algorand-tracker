import { getAccountState, getAssetInfo, getTransactionsForAddress } from "@/lib/algorand/indexer";
import type { AccountState, IndexerTxn } from "@/lib/algorand/types";
import { getAllDefiPositions } from "@/lib/defi";
import type { DefiPosition } from "@/lib/defi/types";
import { runFifo } from "@/lib/portfolio/lots";
import { parseTransactionsToLotEvents } from "@/lib/portfolio/parser";
import { getSpotPricesUsd } from "@/lib/price/provider";

export type SnapshotAssetRow = {
  assetKey: string;
  assetName: string;
  balance: number;
  priceUsd: number | null;
  valueUsd: number | null;
  costBasisUsd: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number | null;
  hasPrice: boolean;
};

export type WalletBreakdown = {
  wallet: string;
  totalValueUsd: number;
  totalCostBasisUsd: number;
  totalRealizedPnlUsd: number;
  totalUnrealizedPnlUsd: number;
};

export type SnapshotTransactionRow = {
  txId: string;
  ts: number;
  wallet: string;
  counterparty: string | null;
  txType: "payment" | "asset-transfer";
  direction: "in" | "out" | "self";
  assetKey: string;
  assetName: string;
  amount: number;
  unitPriceUsd: number | null;
  valueUsd: number | null;
  feeAlgo: number;
  feeUsd: number;
};

export type PortfolioSnapshotPayload = {
  computedAt: string;
  method: "FIFO";
  totals: {
    valueUsd: number;
    costBasisUsd: number;
    realizedPnlUsd: number;
    unrealizedPnlUsd: number;
  };
  assets: SnapshotAssetRow[];
  transactions: SnapshotTransactionRow[];
  wallets: WalletBreakdown[];
  defiPositions: DefiPosition[];
  yieldEstimate: {
    estimatedAprPct: number | null;
    estimated: boolean;
    note: string;
  };
};

export type SnapshotDeps = {
  getAccountStateFn?: (address: string) => Promise<AccountState>;
  getTransactionsFn?: (address: string) => Promise<IndexerTxn[]>;
  getSpotPricesFn?: (assetIds: Array<number | null>) => Promise<Record<string, number | null>>;
  getDefiPositionsFn?: (wallets: string[]) => Promise<DefiPosition[]>;
};

export async function computePortfolioSnapshot(wallets: string[], deps: SnapshotDeps = {}): Promise<PortfolioSnapshotPayload> {
  const getAccountStateFn = deps.getAccountStateFn ?? getAccountState;
  const getTransactionsFn = deps.getTransactionsFn ?? getTransactionsForAddress;
  const getSpotPricesFn = deps.getSpotPricesFn ?? getSpotPricesUsd;
  const getDefiPositionsFn = deps.getDefiPositionsFn ?? getAllDefiPositions;

  const accountStates = await Promise.all(wallets.map((w) => getAccountStateFn(w)));
  const allTxArrays = await Promise.all(wallets.map((w) => getTransactionsFn(w)));

  const txMap = new Map<string, IndexerTxn>();
  for (const txns of allTxArrays) {
    for (const txn of txns) {
      txMap.set(txn.id, txn);
    }
  }
  const txns = Array.from(txMap.values());

  const balancesByAsset = new Map<string, number>();
  const decimalsByAsset: Record<string, number> = {};

  for (const account of accountStates) {
    balancesByAsset.set("ALGO", (balancesByAsset.get("ALGO") ?? 0) + account.algoAmount);
    for (const asset of account.assets) {
      const key = String(asset.assetId);
      balancesByAsset.set(key, (balancesByAsset.get(key) ?? 0) + asset.amount);
      decimalsByAsset[key] = asset.decimals;
    }
  }

  const assetIds: Array<number | null> = [null, ...Object.keys(decimalsByAsset).map((k) => Number(k))];
  const pricesUsd = await getSpotPricesFn(assetIds);

  const ownWallets = new Set(wallets);
  const events = parseTransactionsToLotEvents({ txns, ownWallets, pricesUsd, decimalsByAsset });
  const fifo = runFifo(events);
  const assetNameByKey: Record<string, string> = { ALGO: "ALGO" };

  const assets: SnapshotAssetRow[] = [];
  for (const [assetKey, balance] of balancesByAsset.entries()) {
    let assetName = "ALGO";
    if (assetKey !== "ALGO") {
      try {
        const info = await getAssetInfo(Number(assetKey));
        assetName = info.unitName ?? info.name ?? assetKey;
      } catch {
        assetName = assetKey;
      }
    }
    assetNameByKey[assetKey] = assetName;

    const price = pricesUsd[assetKey] ?? null;
    const valueUsd = price === null ? null : balance * price;
    const lotSummary = fifo[assetKey];
    const costBasisUsd = lotSummary?.remainingCostUsd ?? 0;
    const realizedPnlUsd = lotSummary?.realizedPnlUsd ?? 0;
    const unrealizedPnlUsd = valueUsd === null ? null : valueUsd - costBasisUsd;

    assets.push({
      assetKey,
      assetName,
      balance,
      priceUsd: price,
      valueUsd,
      costBasisUsd,
      realizedPnlUsd,
      unrealizedPnlUsd,
      hasPrice: price !== null
    });
  }

  assets.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));

  const transactions: SnapshotTransactionRow[] = [];
  for (const txn of txns) {
    const senderOwned = ownWallets.has(txn.sender);
    const feeAlgo = senderOwned ? txn.fee / 1_000_000 : 0;
    const feeUsd = feeAlgo * (pricesUsd.ALGO ?? 0);

    if (txn.paymentTransaction) {
      const receiver = txn.paymentTransaction.receiver;
      const receiverOwned = ownWallets.has(receiver);
      const amount = txn.paymentTransaction.amount / 1_000_000;
      const direction: SnapshotTransactionRow["direction"] = senderOwned && receiverOwned ? "self" : senderOwned ? "out" : "in";
      const wallet = senderOwned ? txn.sender : receiver;
      const counterparty = direction === "self" ? receiver : senderOwned ? receiver : txn.sender;
      const unitPriceUsd = pricesUsd.ALGO ?? null;

      transactions.push({
        txId: txn.id,
        ts: txn.confirmedRoundTime,
        wallet,
        counterparty,
        txType: "payment",
        direction,
        assetKey: "ALGO",
        assetName: assetNameByKey.ALGO,
        amount,
        unitPriceUsd,
        valueUsd: unitPriceUsd === null ? null : amount * unitPriceUsd,
        feeAlgo,
        feeUsd
      });
      continue;
    }

    if (txn.assetTransferTransaction) {
      const { assetId, amount, receiver } = txn.assetTransferTransaction;
      const key = String(assetId);
      const receiverOwned = ownWallets.has(receiver);
      const decimals = decimalsByAsset[key] ?? 0;
      const qty = amount / 10 ** decimals;
      const direction: SnapshotTransactionRow["direction"] = senderOwned && receiverOwned ? "self" : senderOwned ? "out" : "in";
      const wallet = senderOwned ? txn.sender : receiver;
      const counterparty = direction === "self" ? receiver : senderOwned ? receiver : txn.sender;
      const unitPriceUsd = pricesUsd[key] ?? null;

      if (!assetNameByKey[key]) {
        try {
          const info = await getAssetInfo(Number(key));
          assetNameByKey[key] = info.unitName ?? info.name ?? key;
        } catch {
          assetNameByKey[key] = key;
        }
      }

      transactions.push({
        txId: txn.id,
        ts: txn.confirmedRoundTime,
        wallet,
        counterparty,
        txType: "asset-transfer",
        direction,
        assetKey: key,
        assetName: assetNameByKey[key],
        amount: qty,
        unitPriceUsd,
        valueUsd: unitPriceUsd === null ? null : qty * unitPriceUsd,
        feeAlgo,
        feeUsd
      });
    }
  }
  transactions.sort((a, b) => b.ts - a.ts);

  const totals = assets.reduce(
    (acc, row) => {
      if (row.valueUsd !== null) {
        acc.valueUsd += row.valueUsd;
      }
      acc.costBasisUsd += row.costBasisUsd;
      acc.realizedPnlUsd += row.realizedPnlUsd;
      if (row.unrealizedPnlUsd !== null) {
        acc.unrealizedPnlUsd += row.unrealizedPnlUsd;
      }
      return acc;
    },
    { valueUsd: 0, costBasisUsd: 0, realizedPnlUsd: 0, unrealizedPnlUsd: 0 }
  );

  const walletSummaries: WalletBreakdown[] = [];
  for (const wallet of wallets) {
    const walletEvents = events.filter((e) => txns.find((t) => t.id === e.txId)?.sender === wallet);
    const walletFifo = runFifo(walletEvents);
    const totalCostBasisUsd = Object.values(walletFifo).reduce((sum, x) => sum + x.remainingCostUsd, 0);
    const totalRealizedPnlUsd = Object.values(walletFifo).reduce((sum, x) => sum + x.realizedPnlUsd, 0);

    const account = accountStates.find((a) => a.address === wallet);
    let totalValueUsd = 0;

    if (account) {
      totalValueUsd += account.algoAmount * (pricesUsd.ALGO ?? 0);
      for (const asset of account.assets) {
        const key = String(asset.assetId);
        const p = pricesUsd[key] ?? null;
        if (p !== null) {
          totalValueUsd += asset.amount * p;
        }
      }
    }

    walletSummaries.push({
      wallet,
      totalValueUsd,
      totalCostBasisUsd,
      totalRealizedPnlUsd,
      totalUnrealizedPnlUsd: totalValueUsd - totalCostBasisUsd
    });
  }

  const defiPositions = await getDefiPositionsFn(wallets);

  const estimatedAprPct = defiPositions.length > 0 ? 4.2 : null;

  return {
    computedAt: new Date().toISOString(),
    method: "FIFO",
    totals,
    assets,
    transactions,
    wallets: walletSummaries,
    defiPositions,
    yieldEstimate: {
      estimatedAprPct,
      estimated: true,
      note: "Estimated yield from detected staking/DeFi activity. Historical decomposition is partial in MVP."
    }
  };
}
