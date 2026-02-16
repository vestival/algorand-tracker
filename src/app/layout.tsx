import type { Metadata } from "next";

import { Providers } from "@/components/providers";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Algorand Portfolio Tracker",
  description: "Track balances, cost basis, PnL, and DeFi positions across Algorand wallets."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
