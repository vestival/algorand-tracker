import algosdk from "algosdk";
import { describe, expect, it } from "vitest";

import { hasTxnAuthorizationProof } from "@/lib/verification/signed-proof";

describe("hasTxnAuthorizationProof", () => {
  it("returns true for a valid signed transaction", () => {
    const account = algosdk.generateAccount();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: account.addr,
      amount: 0,
      suggestedParams: {
        fee: 1000,
        firstValid: 1,
        lastValid: 1000,
        minFee: 1000,
        genesisHash: new Uint8Array(Buffer.from("wGHE2Pwdvd7S12BL5FaOP20EGYesN73s6H01R6kMRYg=", "base64")),
        genesisID: "mainnet-v1.0"
      }
    });
    const signed = txn.signTxn(account.sk);
    const decoded = algosdk.decodeSignedTransaction(signed);

    expect(hasTxnAuthorizationProof(decoded)).toBe(true);
  });

  it("returns false when signature fields are missing", () => {
    expect(hasTxnAuthorizationProof({} as never)).toBe(false);
  });
});
