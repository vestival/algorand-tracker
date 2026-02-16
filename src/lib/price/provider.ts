import { getEnv } from "@/lib/env";

const env = getEnv();

const ALGO_CG_ID = "algorand";

type PriceMap = Record<string, { usd: number }>;

function parseAsaMap(): Record<number, string> {
  try {
    const parsed = JSON.parse(env.ASA_PRICE_MAP_JSON) as Record<string, string>;
    const map: Record<number, string> = {};
    for (const [assetId, id] of Object.entries(parsed)) {
      const n = Number(assetId);
      if (Number.isInteger(n) && id) {
        map[n] = id;
      }
    }
    return map;
  } catch {
    return {};
  }
}

const asaMap = parseAsaMap();

export async function getSpotPricesUsd(assetIds: Array<number | null>): Promise<Record<string, number | null>> {
  const unique = Array.from(new Set(assetIds.map((id) => (id === null ? "ALGO" : String(id)))));

  const idsToQuery = new Set<string>();
  if (unique.includes("ALGO")) {
    idsToQuery.add(ALGO_CG_ID);
  }

  for (const key of unique) {
    if (key === "ALGO") continue;
    const asaId = Number(key);
    if (asaMap[asaId]) {
      idsToQuery.add(asaMap[asaId]);
    }
  }

  let prices: PriceMap = {};
  if (idsToQuery.size > 0) {
    const url = new URL(env.PRICE_API_URL);
    url.searchParams.set("ids", Array.from(idsToQuery).join(","));
    url.searchParams.set("vs_currencies", "usd");

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (response.ok) {
      prices = (await response.json()) as PriceMap;
    }
  }

  const out: Record<string, number | null> = {};

  for (const key of unique) {
    if (key === "ALGO") {
      out[key] = prices[ALGO_CG_ID]?.usd ?? null;
      continue;
    }

    const asaId = Number(key);
    const cgId = asaMap[asaId];
    out[key] = cgId ? prices[cgId]?.usd ?? null : null;
  }

  return out;
}
