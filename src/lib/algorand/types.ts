export type AssetHolding = {
  assetId: number | null;
  amount: number;
  decimals: number;
};

export type AccountState = {
  address: string;
  algoAmount: number;
  assets: AssetHolding[];
  appsLocalState: number[];
};

export type IndexerTxn = {
  id: string;
  sender: string;
  fee: number;
  confirmedRoundTime: number;
  group?: string;
  note?: string;
  paymentTransaction?: {
    receiver: string;
    amount: number;
  };
  assetTransferTransaction?: {
    receiver: string;
    amount: number;
    assetId: number;
  };
};

export type ParsedTransferEvent = {
  txId: string;
  wallet: string;
  ts: number;
  assetId: number | null;
  amount: number;
  direction: "in" | "out";
  feeAlgo: number;
};
