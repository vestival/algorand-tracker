/*
Architecture Overview (MVP)
- UI Layer: Next.js App Router pages + client components (Tailwind, React Query).
- Auth Layer: NextAuth (Google OAuth), session-backed access control.
- API Layer: Route handlers for wallet link/verify, snapshot refresh/read.
- Data Layer: Prisma/PostgreSQL stores users, wallets, verification challenges, snapshots, audit logs.
- Indexing Layer: Algorand Indexer client fetches balances and transaction history.
- Accounting Layer: Parser + FIFO lot engine computes cost basis and realized/unrealized PnL.
- DeFi Layer: Adapter interface with protocol modules (Tinyman, Folks, Reti), currently partial.
- Caching Strategy: Snapshot persisted on refresh; dashboard reads latest snapshot.
- Security: No keys stored, verification by on-chain note transaction challenge, API rate limits, audit logs.
*/

export const ARCHITECTURE_OVERVIEW = "See block comment in this file.";
