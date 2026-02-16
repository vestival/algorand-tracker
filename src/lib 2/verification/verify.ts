import { findVerificationTransaction } from "@/lib/algorand/indexer";
import { getEnv } from "@/lib/env";

const env = getEnv();

export async function verifyByNoteTransaction(params: {
  walletAddress: string;
  noteText: string;
  expiresAt: Date;
  createdAt: Date;
}): Promise<{ ok: boolean; txId?: string }> {
  const tx = await findVerificationTransaction(
    params.walletAddress,
    params.noteText,
    Math.floor(params.createdAt.getTime() / 1000),
    Math.floor(params.expiresAt.getTime() / 1000)
  );

  if (!tx || !tx.paymentTransaction) {
    return { ok: false };
  }

  if (tx.paymentTransaction.receiver !== env.ALGORAND_VERIFICATION_RECEIVER) {
    return { ok: false };
  }

  return { ok: true, txId: tx.id };
}
