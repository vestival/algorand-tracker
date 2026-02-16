import algosdk from "algosdk";

export function isValidAlgorandAddress(address: string): boolean {
  return algosdk.isValidAddress(address);
}

export function generateVerificationNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function buildVerificationNote(nonce: string, userId: string): string {
  return `ALGOPORTFOLIO|VERIFY|${userId}|${nonce}`;
}
