type SnapshotLike = {
  computedAt: string | Date;
  data: unknown;
};

export type PortfolioHistoryPoint = {
  ts: string;
  valueUsd: number;
};

function extractValueUsd(data: unknown): number | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const totals = (data as { totals?: unknown }).totals;
  if (!totals || typeof totals !== "object") {
    return null;
  }

  const value = (totals as { valueUsd?: unknown }).valueUsd;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function buildPortfolioHistory(snapshots: SnapshotLike[]): PortfolioHistoryPoint[] {
  const rows = snapshots
    .map((snapshot) => {
      const parsed = Date.parse(String(snapshot.computedAt));
      const valueUsd = extractValueUsd(snapshot.data);
      if (!Number.isFinite(parsed) || valueUsd === null) {
        return null;
      }
      const ts = new Date(parsed).toISOString();
      return { ts, valueUsd };
    })
    .filter((row): row is PortfolioHistoryPoint => row !== null)
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

  const deduped: PortfolioHistoryPoint[] = [];
  const lastByDay = new Map<string, PortfolioHistoryPoint>();

  for (const row of rows) {
    const day = row.ts.slice(0, 10);
    lastByDay.set(day, row);
  }

  for (const row of Array.from(lastByDay.values()).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))) {
    deduped.push(row);
  }

  return deduped;
}
