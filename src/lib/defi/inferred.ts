import { getAccountState } from "@/lib/algorand/indexer";
import type { AccountState } from "@/lib/algorand/types";
import { getSpotPricesUsd } from "@/lib/price/provider";

import type { DefiPosition } from "@/lib/defi/types";

type InferenceRule = {
  protocol: DefiPosition["protocol"];
  positionType: DefiPosition["positionType"];
  label: string;
};

const INFERENCE_RULES: Record<number, InferenceRule> = {
  // Folks liquid staking / governance derivatives.
  1134696561: { protocol: "Folks Finance", positionType: "staked", label: "xALGO" },
  793124631: { protocol: "Folks Finance", positionType: "staked", label: "gALGO" },
  694432641: { protocol: "Folks Finance", positionType: "staked", label: "gALGO" },
  // Tinyman liquid staking derivative.
  2537013734: { protocol: "Tinyman", positionType: "staked", label: "tALGO" }
};

export type InferDefiDeps = {
  getAccountStateFn?: (wallet: string) => Promise<AccountState>;
  getSpotPricesFn?: (assetIds: Array<number | null>) => Promise<Record<string, number | null>>;
};

export async function inferDefiPositionsFromHoldings(
  wallets: string[],
  deps: InferDefiDeps = {}
): Promise<DefiPosition[]> {
  const getAccountStateFn = deps.getAccountStateFn ?? getAccountState;
  const getSpotPricesFn = deps.getSpotPricesFn ?? getSpotPricesUsd;

  const accounts = await Promise.all(wallets.map((wallet) => getAccountStateFn(wallet)));
  const relevantAssetIds = Array.from(
    new Set(
      accounts.flatMap((account) =>
        account.assets
          .filter((asset) => asset.amount > 0 && asset.assetId !== null && INFERENCE_RULES[asset.assetId] !== undefined)
          .map((asset) => asset.assetId as number)
      )
    )
  );

  const prices = await getSpotPricesFn(relevantAssetIds);
  const out: DefiPosition[] = [];

  for (const account of accounts) {
    for (const asset of account.assets) {
      if (asset.assetId === null || asset.amount <= 0) {
        continue;
      }

      const rule = INFERENCE_RULES[asset.assetId];
      if (!rule) {
        continue;
      }

      const price = prices[String(asset.assetId)] ?? null;
      out.push({
        protocol: rule.protocol,
        wallet: account.address,
        positionType: rule.positionType,
        assetId: asset.assetId,
        amount: asset.amount,
        valueUsd: price === null ? null : asset.amount * price,
        estimated: true,
        meta: {
          source: "asset-holding-inference",
          assetLabel: rule.label
        }
      });
    }
  }

  return out;
}
