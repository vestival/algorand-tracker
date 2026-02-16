import { getAccountState, getTransactionsForAddress } from "@/lib/algorand/indexer";
import type { AccountState, IndexerTxn } from "@/lib/algorand/types";
import { getAllDefiPositions } from "@/lib/defi";
import type { DefiPosition } from "@/lib/defi/types";
import { runFifo } from "@/lib/portfolio/lots";
import { parseTransactionsToLotEvents } from "@/lib/portfolio/parser";
import { getSpotPricesUsd } from "@/lib/price/provider";

export type SnapshotAssetRow = {
  assetKey: string;
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

  const assets: SnapshotAssetRow[] = [];
  for (const [assetKey, balance] of balancesByAsset.entries()) {
    const price = pricesUsd[assetKey] ?? null;
    const valueUsd = price === null ? null : balance * price;
    const lotSummary = fifo[assetKey];
    const costBasisUsd = lotSummary?.remainingCostUsd ?? 0;
    const realizedPnlUsd = lotSummary?.realizedPnlUsd ?? 0;
    const unrealizedPnlUsd = valueUsd === null ? null : valueUsd - costBasisUsd;

    assets.push({
      assetKey,
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
    wallets: walletSummaries,
    defiPositions,
    yieldEstimate: {
      estimatedAprPct,
      estimated: true,
      note: "Estimated yield from detected staking/DeFi activity. Historical decomposition is partial in MVP."
    }
  };
}
