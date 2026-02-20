import { getHistoricalPriceKey } from "@/lib/price/provider";

type SnapshotData = {
  dailyPrices?: Array<{
    assetKey?: string;
    dayKey?: string;
    priceUsd?: number | null;
  }>;
  transactions?: Array<{
    assetKey?: string;
    ts?: number | null;
    unitPriceUsd?: number | null;
  }>;
};

function toProviderDayKey(dayKeyIso: string): string {
  const [yyyy, mm, dd] = dayKeyIso.split("-");
  if (!yyyy || !mm || !dd) {
    return dayKeyIso;
  }
  return `${dd}-${mm}-${yyyy}`;
}

export function extractHistoricalFallbackByDayFromSnapshot(data: SnapshotData | null | undefined): Record<string, number | null> {
  const out: Record<string, number | null> = {};

  for (const row of data?.dailyPrices ?? []) {
    const assetKey = row.assetKey;
    const dayKey = row.dayKey;
    const priceUsd = row.priceUsd;
    if (!assetKey || !dayKey || typeof priceUsd !== "number" || !Number.isFinite(priceUsd) || priceUsd < 0) {
      continue;
    }
    out[`${assetKey}:${toProviderDayKey(dayKey)}`] = priceUsd;
  }

  for (const tx of data?.transactions ?? []) {
    const assetKey = tx.assetKey;
    const ts = tx.ts;
    const unitPriceUsd = tx.unitPriceUsd;
    if (
      !assetKey ||
      typeof ts !== "number" ||
      !Number.isFinite(ts) ||
      ts <= 0 ||
      typeof unitPriceUsd !== "number" ||
      !Number.isFinite(unitPriceUsd)
    ) {
      continue;
    }
    out[getHistoricalPriceKey(assetKey, ts)] = unitPriceUsd;
  }

  return out;
}
