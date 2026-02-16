import algosdk from "algosdk";

import { getEnv } from "@/lib/env";

const env = getEnv();

export function getAlgodClient() {
  return new algosdk.Algodv2(env.ALGORAND_ALGOD_TOKEN ?? "", env.ALGORAND_ALGOD_URL, "");
}

export async function getSuggestedParams() {
  const algod = getAlgodClient();
  return algod.getTransactionParams().do();
}

export async function submitSignedTransaction(signedTxn: Uint8Array): Promise<string> {
  const algod = getAlgodClient();
  const result = await algod.sendRawTransaction(signedTxn).do();
  return result.txid;
}
