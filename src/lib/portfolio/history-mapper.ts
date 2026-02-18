export type SnapshotAssetInput = {
  assetKey?: string;
  balance?: number | null;
  priceUsd?: number | null;
};

export type HistoryLatestAssetState = {
  assetKey: string;
  balance: number;
  priceUsd: number | null;
};

export function mapLatestAssetStatesFromSnapshotAssets(assets: SnapshotAssetInput[] = []): HistoryLatestAssetState[] {
  return assets.map((asset) => ({
    assetKey: asset.assetKey && asset.assetKey.length > 0 ? asset.assetKey : "ALGO",
    balance: asset.balance ?? 0,
    priceUsd: asset.priceUsd ?? null
  }));
}
