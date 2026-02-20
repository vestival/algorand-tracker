type AssetBasis = {
  assetId: number | null;
  balance: number;
  costBasisUsd: number | null;
};

type ComponentLike = {
  assetId: number | null;
  amount: number;
};

export function computeComponentBasisUsd(
  component: ComponentLike,
  basisByAssetId: Map<number, AssetBasis>
): number | null {
  if (component.assetId === null || component.amount <= 0) {
    return null;
  }

  const asset = basisByAssetId.get(component.assetId);
  if (!asset || asset.balance <= 0 || asset.costBasisUsd === null || asset.costBasisUsd === undefined) {
    return null;
  }

  const ratio = Math.min(component.amount / asset.balance, 1);
  return asset.costBasisUsd * ratio;
}

export function computePositionAtDepositUsd(
  components: ComponentLike[],
  basisByAssetId: Map<number, AssetBasis>
): number | null {
  if (components.length === 0) {
    return null;
  }

  let total = 0;
  let hasAny = false;

  for (const component of components) {
    const basis = computeComponentBasisUsd(component, basisByAssetId);
    if (basis === null) {
      continue;
    }
    hasAny = true;
    total += basis;
  }

  return hasAny ? total : null;
}
