import { folksAdapter } from "@/lib/defi/adapters/folks";
import { retiAdapter } from "@/lib/defi/adapters/reti";
import { tinymanAdapter } from "@/lib/defi/adapters/tinyman";
import type { DefiPosition } from "@/lib/defi/types";

export async function getAllDefiPositions(wallets: string[]): Promise<DefiPosition[]> {
  const [tinyman, folks, reti] = await Promise.all([
    tinymanAdapter.getPositions(wallets),
    folksAdapter.getPositions(wallets),
    retiAdapter.getPositions(wallets)
  ]);

  return [...tinyman, ...folks, ...reti];
}
