import { getAccountState } from "@/lib/algorand/indexer";
import { getEnv, parseAppIds } from "@/lib/env";
import type { DefiAdapter, DefiPosition } from "@/lib/defi/types";

const appIds = parseAppIds(getEnv().TINYMAN_APP_IDS);

export const tinymanAdapter: DefiAdapter = {
  async getPositions(wallets) {
    const out: DefiPosition[] = [];

    for (const wallet of wallets) {
      const account = await getAccountState(wallet);
      const hasTinyman = account.appsLocalState.some((id) => appIds.includes(id));

      if (hasTinyman) {
        out.push({
          protocol: "Tinyman",
          wallet,
          positionType: "lp",
          estimated: true,
          valueUsd: null,
          meta: {
            note: "Detected Tinyman app local state. Detailed LP decoding is TODO."
          }
        });
      }
    }

    return out;
  }
};
