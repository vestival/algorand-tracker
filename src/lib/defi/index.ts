import { folksAdapter } from "@/lib/defi/adapters/folks";
import { inferDefiPositionsFromHoldings } from "@/lib/defi/inferred";
import { retiAdapter } from "@/lib/defi/adapters/reti";
import { tinymanAdapter } from "@/lib/defi/adapters/tinyman";
import type { DefiPosition } from "@/lib/defi/types";

export async function getAllDefiPositions(wallets: string[]): Promise<DefiPosition[]> {
  const [tinyman, folks, reti, inferred] = await Promise.all([
    tinymanAdapter.getPositions(wallets),
    folksAdapter.getPositions(wallets),
    retiAdapter.getPositions(wallets),
    inferDefiPositionsFromHoldings(wallets)
  ]);

  const adapterRows = [...tinyman, ...folks, ...reti];
  const inferredProtocolWallet = new Set(inferred.map((row) => `${row.protocol}:${row.wallet}`));

  // If we inferred concrete positions, suppress generic placeholder rows for same protocol+wallet.
  const filteredAdapters = adapterRows.filter((row) => {
    if (row.assetId || row.amount || row.valueUsd) {
      return true;
    }
    return !inferredProtocolWallet.has(`${row.protocol}:${row.wallet}`);
  });

  const deduped = new Map<string, DefiPosition>();
  for (const row of [...filteredAdapters, ...inferred]) {
    const key = `${row.protocol}:${row.wallet}:${row.positionType}:${row.assetId ?? "na"}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
      continue;
    }
    const existingValue = existing.valueUsd ?? null;
    const incomingValue = row.valueUsd ?? null;
    if (existingValue === null && incomingValue !== null) {
      deduped.set(key, row);
    }
  }

  return Array.from(deduped.values());
}
