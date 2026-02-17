import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import algosdk from "algosdk";

import { getSuggestedParams } from "@/lib/algorand/algod";
import { authOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";
import { buildVerificationNote, generateVerificationNonce, isValidAlgorandAddress } from "@/lib/verification/challenge";

const inputSchema = z.object({
  address: z.string().min(30),
  label: z.string().max(64).optional()
});

const env = getEnv();

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: originCheck.status });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit({
    key: `wallets-link:${session.user.id}:${ip}`,
    userId: session.user.id,
    ip,
    windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS,
    max: env.PUBLIC_RATE_LIMIT_MAX
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { address, label } = parsed.data;
  if (!isValidAlgorandAddress(address)) {
    return NextResponse.json({ error: "Invalid Algorand address" }, { status: 400 });
  }

  const wallet = await prisma.linkedWallet.upsert({
    where: {
      userId_address: {
        userId: session.user.id,
        address
      }
    },
    update: {
      label
    },
    create: {
      userId: session.user.id,
      address,
      label
    }
  });

  const nonce = generateVerificationNonce();
  const noteText = buildVerificationNote(nonce, session.user.id);
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const noteBytes = new TextEncoder().encode(noteText);
  const suggestedParams = await getSuggestedParams();

  const unsignedTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: address,
    receiver: env.ALGORAND_VERIFICATION_RECEIVER,
    amount: 0,
    note: noteBytes,
    suggestedParams
  });

  const challenge = await prisma.walletVerificationChallenge.create({
    data: {
      userId: session.user.id,
      walletId: wallet.id,
      nonce,
      noteText,
      expiresAt
    }
  });

  await writeAuditLog(session.user.id, "wallet.link.challenge_created", {
    walletId: wallet.id,
    address
  });

  return NextResponse.json({
    challengeId: challenge.id,
    noteText,
    receiver: env.ALGORAND_VERIFICATION_RECEIVER,
    expiresAt: expiresAt.toISOString(),
    unsignedTxnB64: Buffer.from(unsignedTxn.toByte()).toString("base64"),
    expectedTxId: unsignedTxn.txID().toString()
  });
}
