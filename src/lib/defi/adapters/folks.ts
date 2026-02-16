import { getAccountState } from "@/lib/algorand/indexer";
import { getEnv, parseAppIds } from "@/lib/env";
import type { DefiAdapter, DefiPosition } from "@/lib/defi/types";

const appIds = parseAppIds(getEnv().FOLKS_APP_IDS);

export const folksAdapter: DefiAdapter = {
  async getPositions(wallets) {
    const out: DefiPosition[] = [];

    for (const wallet of wallets) {
      const account = await getAccountState(wallet);
      const hasFolks = account.appsLocalState.some((id) => appIds.includes(id));

      if (hasFolks) {
        out.push({
          protocol: "Folks Finance",
          wallet,
          positionType: "supplied",
          estimated: true,
          valueUsd: null,
          meta: {
            note: "Detected Folks app local state. Supplied/borrowed decoding is TODO."
          }
        });
      }
    }

    return out;
  }
};
