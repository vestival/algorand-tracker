import algosdk from "algosdk";

export function hasTxnAuthorizationProof(decoded: ReturnType<typeof algosdk.decodeSignedTransaction>): boolean {
  return Boolean(decoded.sig || decoded.msig || decoded.lsig);
}
