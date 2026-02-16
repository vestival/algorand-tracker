export type DefiPosition = {
  protocol: "Tinyman" | "Folks Finance" | "Reti";
  wallet: string;
  positionType: "supplied" | "borrowed" | "staked" | "lp" | "unknown";
  assetId?: number | null;
  amount?: number;
  valueUsd?: number | null;
  estimated: boolean;
  meta?: Record<string, unknown>;
};

export type DefiAdapter = {
  getPositions(wallets: string[]): Promise<DefiPosition[]>;
};
