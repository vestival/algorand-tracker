import { getAccountState } from "@/lib/algorand/indexer";
import { getEnv, parseAppIds } from "@/lib/env";
import type { DefiAdapter, DefiPosition } from "@/lib/defi/types";

const appIds = parseAppIds(getEnv().RETI_APP_IDS);

export const retiAdapter: DefiAdapter = {
  async getPositions(wallets) {
    const out: DefiPosition[] = [];

    for (const wallet of wallets) {
      const account = await getAccountState(wallet);
      const hasReti = account.appsLocalState.some((id) => appIds.includes(id));

      if (hasReti) {
        out.push({
          protocol: "Reti",
          wallet,
          positionType: "staked",
          estimated: true,
          valueUsd: null,
          meta: {
            note: "Detected Reti app local state. Yield/state decoding is TODO."
          }
        });
      }
    }

    return out;
  }
};
