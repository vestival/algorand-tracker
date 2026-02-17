# Algorand Portfolio Tracker

A self-hosted portfolio tracker for the Algorand blockchain. Link multiple wallets, verify ownership on-chain, and view consolidated balances, FIFO cost basis, realized/unrealized PnL, transaction history, and DeFi positions across Tinyman, Folks Finance, and Reti.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Auth | NextAuth v4 (Google OAuth) |
| Database | PostgreSQL + Prisma ORM |
| Client state | TanStack Query v5 |
| Validation | Zod (env vars, API inputs) |
| Blockchain | algosdk v3, Algorand Indexer + Algod |
| Wallet | Pera WalletConnect (`@perawallet/connect`) |
| Testing | Vitest |

## Architecture

```
Browser
  ├── Landing page (/) ─ Google sign-in
  ├── /wallets ─ Connect Pera, link & verify wallets
  └── /dashboard ─ Portfolio overview, transactions, DeFi, wallet breakdown

Next.js API Routes (session-protected, rate-limited, origin-checked)
  ├── POST /api/wallets/link ─ Create wallet + verification challenge
  ├── POST /api/wallets/verify ─ Submit signed txn or poll for note txn
  ├── GET  /api/wallets/list ─ List linked wallets
  ├── POST /api/portfolio/refresh ─ Recompute & persist snapshot
  └── GET  /api/portfolio/snapshot ─ Read latest snapshot (auto-computes if stale)

Backend Services
  ├── Algorand Indexer ─ Account state, balances, transaction history
  ├── Algorand Algod ─ Suggested params, transaction submission
  ├── CoinGecko API ─ Spot USD prices (ALGO + mapped ASAs)
  ├── FIFO Lot Engine ─ Cost basis, realized/unrealized PnL
  ├── Transaction Parser ─ Payment & ASA transfers → buy/sell lot events
  └── DeFi Adapters ─ Tinyman, Folks Finance, Reti position detection

Data (PostgreSQL via Prisma)
  ├── User, Account, Session (NextAuth)
  ├── LinkedWallet ─ Address, verification status, txId proof
  ├── WalletVerificationChallenge ─ Nonce, note text, expiry
  ├── PortfolioSnapshot ─ JSON blob (assets, txns, wallets, DeFi, yield)
  └── AuditLog ─ Action trail per user
```

## Features

### Wallet management
- Connect via Pera WalletConnect with multi-account support
- On-chain ownership verification using a 0-ALGO note transaction with a cryptographic nonce
- Two verification paths: Pera sign-and-submit (preferred) or manual txId fallback
- Link multiple wallets per account; each independently verified
- Verification challenges expire after 15 minutes

### Portfolio dashboard
- Consolidated balances across all verified wallets (ALGO + ASAs)
- FIFO cost basis tracking with realized and unrealized PnL
- Per-wallet value breakdown
- Transaction history with filtering by direction (in/out/self), type (payment/asset-transfer), and free-text search
- Privacy mode toggle to mask all dollar amounts
- Hide zero-balance tokens filter
- On-demand snapshot refresh

### Accounting engine
- **Cost basis method:** FIFO (first-in, first-out)
- **Fee treatment:** Fees capitalized into acquisition cost on buys, subtracted from proceeds on sells
- **Missing prices:** Assets without CoinGecko mappings show balance but are flagged `no price` and excluded from PnL totals
- **Price source:** CoinGecko spot prices; built-in mappings for USDC, USDt, goBTC, goETH, gALGO, tALGO, xALGO; extensible via `ASA_PRICE_MAP_JSON`

### DeFi integration
- Adapter interface (`DefiAdapter`) with protocol modules for:
  - **Tinyman** -- LP position detection
  - **Folks Finance** -- Lending/borrowing position detection
  - **Reti** -- Staking position detection
- Estimated yield/APR display based on detected DeFi activity
- Positions shown with at-deposit value, current value, yield, PnL, and daily yield estimates

### Security
- No private keys stored; verification by on-chain transaction only
- Same-origin request validation on all mutating endpoints
- Per-user + per-IP rate limiting (configurable window and max)
- Audit logging for wallet link, verification, and portfolio refresh events
- NextAuth session-based access control on all protected routes
- Zod validation on all API inputs and environment variables

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # Google OAuth
│   │   ├── portfolio/refresh/route.ts     # Recompute snapshot
│   │   ├── portfolio/snapshot/route.ts    # Read snapshot
│   │   ├── wallets/link/route.ts          # Link wallet + challenge
│   │   ├── wallets/list/route.ts          # List wallets
│   │   └── wallets/verify/route.ts        # Verify ownership
│   ├── dashboard/page.tsx                 # Dashboard (server, auth gate)
│   ├── wallets/page.tsx                   # Wallet linking UI (client)
│   ├── layout.tsx                         # Root layout + providers
│   └── page.tsx                           # Landing page
├── components/
│   ├── auth-buttons.tsx                   # Sign-in/out + user menu
│   ├── dashboard/dashboard-client.tsx     # Full dashboard UI (client)
│   └── providers.tsx                      # SessionProvider + QueryClient
├── lib/
│   ├── algorand/
│   │   ├── algod.ts                       # Algod client (params, submit)
│   │   ├── indexer.ts                     # Indexer client (balances, txns, asset info)
│   │   └── types.ts                       # AccountState, IndexerTxn types
│   ├── defi/
│   │   ├── adapters/                      # Tinyman, Folks, Reti adapters
│   │   ├── index.ts                       # Aggregator (getAllDefiPositions)
│   │   └── types.ts                       # DefiPosition, DefiAdapter
│   ├── portfolio/
│   │   ├── lots.ts                        # FIFO lot engine (runFifo)
│   │   ├── parser.ts                      # Txns → LotEvents
│   │   └── snapshot.ts                    # Full snapshot computation
│   ├── price/provider.ts                  # CoinGecko spot price fetcher
│   ├── security/request.ts                # Origin check, IP extraction
│   ├── verification/
│   │   ├── challenge.ts                   # Nonce generation, note building
│   │   └── verify.ts                      # Note transaction verification
│   ├── api-client.ts                      # Client-side fetch wrapper
│   ├── audit.ts                           # Audit log writer
│   ├── auth.ts                            # NextAuth config
│   ├── db.ts                              # Prisma client singleton
│   ├── env.ts                             # Zod env schema + getEnv()
│   ├── rate-limit.ts                      # In-memory rate limiter
│   └── utils.ts                           # formatUsd, shortAddress helpers
├── middleware.ts                           # NextAuth route protection
└── types/next-auth.d.ts                   # Session type augmentation
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google OAuth credentials (Google Cloud Console)
- An Algorand address to receive verification transactions

### Install and run

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env

# Run database migrations
npx prisma migrate dev --name init

# Start development server
npm run dev
```

## Environment variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret, 32+ chars (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ALGORAND_INDEXER_URL` | Indexer endpoint (e.g. `https://mainnet-idx.algonode.cloud`) |
| `ALGORAND_ALGOD_URL` | Algod endpoint (default: `https://mainnet-api.algonode.cloud`) |
| `ALGORAND_VERIFICATION_RECEIVER` | Algorand address that receives verification txns |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `ALGORAND_INDEXER_TOKEN` | -- | Token for non-public indexer |
| `ALGORAND_ALGOD_TOKEN` | -- | Token for non-public algod |
| `PRICE_API_URL` | CoinGecko | Price API endpoint |
| `ASA_PRICE_MAP_JSON` | `{}` | JSON mapping ASA IDs to CoinGecko IDs (extends built-in defaults) |
| `TINYMAN_APP_IDS` | -- | Comma-separated Tinyman app IDs |
| `FOLKS_APP_IDS` | -- | Comma-separated Folks Finance app IDs |
| `RETI_APP_IDS` | -- | Comma-separated Reti app IDs |
| `PUBLIC_RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds |
| `PUBLIC_RATE_LIMIT_MAX` | `60` | Max requests per window |
| `INDEXER_TX_LIMIT` | `500` | Max transactions fetched per wallet |
| `NEXTAUTH_DEBUG` | `false` | Enable NextAuth debug logging |

## Wallet verification flow

1. User connects Pera Wallet and selects an address
2. `POST /api/wallets/link` creates a `LinkedWallet` record and a `WalletVerificationChallenge` with a nonce-based note and 15-minute expiry
3. Backend returns an unsigned 0-ALGO payment transaction (sender = user, receiver = verification address, note = challenge text)
4. **Preferred path:** User signs in Pera; app submits the signed transaction to Algod and verifies sender, receiver, and note match
5. **Fallback path:** User sends the transaction manually and submits the txId; backend polls the Indexer for a matching note transaction
6. On success, wallet is marked verified with the proof txId stored

## Tests

```bash
# Run all tests
npm run test

# FIFO cost basis engine tests
npm run test -- tests/lots.test.ts

# Snapshot computation tests
npm run test -- tests/snapshot.test.ts

# Watch mode
npm run test:watch
```

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full Vercel + Neon/Supabase deployment guide.

Quick steps:

1. Provision a PostgreSQL database (Neon or Supabase)
2. Set environment variables in Vercel project settings
3. Configure Google OAuth redirect URIs for your production URL
4. Deploy: `vercel --prod`
5. Run migration: `npx prisma migrate deploy`

## Known limitations

- Swap parsing uses individual transaction analysis; group-level decoding for AMM swaps is not yet implemented
- Historical ASA price sources are limited; current prices are used as best-effort fallback (marked as estimated in the UI)
- DeFi position valuation detects protocol presence and basic state; deeper contract decoding is partial
- Yield estimates use a static placeholder APR when DeFi positions are detected
- Cost basis method is FIFO only; average-cost is planned for a future release
