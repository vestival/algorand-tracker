"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { UserMenu } from "@/components/auth-buttons";
import { apiFetch } from "@/lib/api-client";
import { formatUsd, shortAddress } from "@/lib/utils";

type SnapshotResponse = {
  snapshot: {
    computedAt: string;
    totals: {
      valueUsd: number;
      costBasisUsd: number;
      realizedPnlUsd: number;
      unrealizedPnlUsd: number;
    };
    assets: Array<{
      assetKey: string;
      balance: number;
      priceUsd: number | null;
      valueUsd: number | null;
      costBasisUsd: number;
      realizedPnlUsd: number;
      unrealizedPnlUsd: number | null;
      hasPrice: boolean;
    }>;
    wallets: Array<{
      wallet: string;
      totalValueUsd: number;
      totalCostBasisUsd: number;
      totalRealizedPnlUsd: number;
      totalUnrealizedPnlUsd: number;
    }>;
    defiPositions: Array<{
      protocol: string;
      wallet: string;
      positionType: string;
      valueUsd?: number | null;
      estimated: boolean;
    }>;
    yieldEstimate: {
      estimatedAprPct: number | null;
      estimated: boolean;
      note: string;
    };
  } | null;
};

const tabs = ["Overview", "Transactions", "DeFi Positions", "Wallets", "Settings"] as const;

export function DashboardClient() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const queryClient = useQueryClient();

  const snapshotQuery = useQuery({
    queryKey: ["portfolio-snapshot"],
    queryFn: () => apiFetch<SnapshotResponse>("/api/portfolio/snapshot")
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>("/api/portfolio/refresh", { method: "POST", body: "{}" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portfolio-snapshot"] });
    }
  });

  const snapshot = snapshotQuery.data?.snapshot;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Algorand Portfolio Dashboard</h1>
            <p className="text-sm text-slate-400">Consolidated balances, FIFO cost basis, PnL, and DeFi estimates.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link className="rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800" href="/wallets">
              Manage wallets
            </Link>
            <button
              className="rounded-md bg-brand-500 px-3 py-2 text-sm hover:bg-brand-700 disabled:opacity-70"
              disabled={refreshMutation.isPending}
              onClick={() => refreshMutation.mutate()}
              type="button"
            >
              {refreshMutation.isPending ? "Refreshing..." : "Refresh"}
            </button>
            <UserMenu />
          </div>
        </header>

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <Card label="Total Value" value={formatUsd(snapshot?.totals.valueUsd)} />
          <Card label="Cost Basis" value={formatUsd(snapshot?.totals.costBasisUsd)} />
          <Card label="Realized PnL" value={formatUsd(snapshot?.totals.realizedPnlUsd)} />
          <Card label="Unrealized PnL" value={formatUsd(snapshot?.totals.unrealizedPnlUsd)} />
        </div>

        <nav className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${
                activeTab === tab ? "bg-brand-700 text-white" : "bg-slate-800 text-slate-300"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Overview" && (
          <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Cost Basis</th>
                  <th className="px-4 py-3">Unrealized</th>
                </tr>
              </thead>
              <tbody>
                {snapshot?.assets.map((asset) => (
                  <tr className="border-t border-slate-800" key={asset.assetKey}>
                    <td className="px-4 py-3">{asset.assetKey}</td>
                    <td className="px-4 py-3">{asset.balance.toLocaleString()}</td>
                    <td className="px-4 py-3">{asset.priceUsd === null ? "no price" : formatUsd(asset.priceUsd)}</td>
                    <td className="px-4 py-3">{formatUsd(asset.valueUsd)}</td>
                    <td className="px-4 py-3">{formatUsd(asset.costBasisUsd)}</td>
                    <td className="px-4 py-3">{formatUsd(asset.unrealizedPnlUsd)}</td>
                  </tr>
                ))}
                {!snapshot?.assets.length && (
                  <tr>
                    <td className="px-4 py-4 text-slate-400" colSpan={6}>
                      No snapshot yet. Link wallets and click Refresh.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === "Transactions" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            Transaction-level parsing is active in the backend and used for FIFO lots. A detailed transaction table is
            planned for the next iteration.
          </section>
        )}

        {activeTab === "DeFi Positions" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="mb-3 text-sm text-slate-300">
              Yield estimate: {snapshot?.yieldEstimate.estimatedAprPct ?? "-"}% (estimated)
            </p>
            <p className="mb-4 text-xs text-slate-400">{snapshot?.yieldEstimate.note}</p>
            <div className="space-y-2">
              {snapshot?.defiPositions.map((p, i) => (
                <div className="rounded-md border border-slate-800 p-3 text-sm" key={`${p.protocol}-${i}`}>
                  <div className="font-medium">
                    {p.protocol} / {p.positionType}
                  </div>
                  <div className="text-slate-400">Wallet: {shortAddress(p.wallet)}</div>
                  <div className="text-slate-400">Value: {formatUsd(p.valueUsd ?? null)}</div>
                </div>
              ))}
              {!snapshot?.defiPositions.length && <p className="text-sm text-slate-400">No DeFi positions detected.</p>}
            </div>
          </section>
        )}

        {activeTab === "Wallets" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="space-y-2">
              {snapshot?.wallets.map((w) => (
                <div className="rounded-md border border-slate-800 p-3 text-sm" key={w.wallet}>
                  <div className="font-medium">{shortAddress(w.wallet)}</div>
                  <div className="text-slate-400">Value: {formatUsd(w.totalValueUsd)}</div>
                  <div className="text-slate-400">Cost basis: {formatUsd(w.totalCostBasisUsd)}</div>
                </div>
              ))}
              {!snapshot?.wallets.length && <p className="text-sm text-slate-400">No wallets linked.</p>}
            </div>
          </section>
        )}

        {activeTab === "Settings" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            Cost basis method: FIFO. Average-cost mode is designed for a future extension.
          </section>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Last snapshot: {snapshot?.computedAt ? new Date(snapshot.computedAt).toLocaleString() : "none"}
        </p>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
