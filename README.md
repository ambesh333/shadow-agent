<p align="center">
  <img src="frontend/public/docs/banner3.jpg" alt="Shadow Agent Banner" width="100%"/>
</p>

<h1 align="center">🛡️ Shadow Agent</h1>

<p align="center">
  <strong>Privacy-Preserving AI Marketplace on Solana</strong><br/>
  The first x402 payment protocol with zero-knowledge proofs and AI-powered dispute resolution
</p>

---

## 🌟 Features

- **🔐 Private Payments** - Zero-knowledge Bulletproof cryptography hides transaction amounts on-chain
- **🤖 AI Dispute Resolution** - Automated analysis with confidence scoring using Gemini/GPT-4/Claude
- **📡 x402 Protocol** - HTTP 402 Payment Required standard for seamless AI agent integration
- **🛡️ Escrow Protection** - Funds held securely until resource delivery is confirmed
- **⭐ Trust Scores** - Reputation system for merchants based on transaction history
- **⚡ Solana Native** - Fast finality, low fees, PDA-based escrow accounts

---

## 🏗️ Tech Stack

### Backend (`/backend`)
| Technology | Purpose |
|------------|---------|
| Node.js + Express 5 | API Server |
| Prisma 7 | PostgreSQL ORM |
| @radr/shadowwire | ZK Proof Generation |
| LangChain | AI Orchestration |
| @solana/web3.js | Blockchain Integration |

### Frontend (`/frontend`)
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React Framework |
| React 19 | UI Library |
| TailwindCSS 4 | Styling |
| Framer Motion | Animations |
| Solana Wallet Adapter | Wallet Connection |

---

## 📁 Project Structure

```
shadow/
├── backend/                 # Express API Server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic
│   │   ├── clients/         # External API clients
│   │   ├── routes/          # API routes
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── frontend/                # Next.js Application
│   ├── app/                 # App router pages
│   │   ├── dashboard/       # Merchant dashboard
│   │   └── documentation/   # Docs page
│   ├── components/          # React components
│   ├── lib/                 # Utilities
│   └── package.json
│
└── README.md
```

---

## 🚀 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (or use [Neon](https://neon.tech))
- Solana wallet

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start development server
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# ShadowWire / ShadowPay
SHADOWPAY_API_URL="https://shadow.radr.fun"
MERCHANT_KEY="your_merchant_api_key"
FACILITATOR_WALLET_ADDRESS="your_facilitator_wallet"

# AI Provider (google, openai, or anthropic)
AI_PROVIDER="google"
GOOGLE_API_KEY="your_gemini_api_key"
# OR
OPENAI_API_KEY="your_openai_api_key"
# OR
ANTHROPIC_API_KEY="your_anthropic_api_key"

# JWT Secret
JWT_SECRET="your_jwt_secret"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

---

## 🔑 Getting API Keys

### ShadowWire / ShadowPay
1. Visit [Radr Labs](https://radr.fun)
2. Create an account and register your merchant wallet
3. Obtain your API key from the dashboard

### Google Gemini (AI Provider)
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create a new API key
3. Add to `GOOGLE_API_KEY`

### OpenAI (Alternative)
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Create an API key
3. Add to `OPENAI_API_KEY`

### Anthropic Claude (Alternative)
1. Visit [Anthropic Console](https://console.anthropic.com)
2. Create an API key
3. Add to `ANTHROPIC_API_KEY`

### Database (Neon Recommended)
1. Create account at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`

---

## 📡 API Reference

### Base URL
```
Local: http://localhost:3001
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/explore` | List all resources with trust scores |
| `GET` | `/api/explore/:id` | Get resource details |
| `GET` | `/api/gateway/resource/:id` | Access resource (returns 402 if payment required) |
| `POST` | `/api/gateway/pay` | Pay for resource with ZK proof |
| `POST` | `/api/gateway/settle` | Settle or dispute transaction |
| `POST` | `/api/disputes/:id/ai-analyze` | Trigger AI dispute analysis |

---

## 🎮 Demo

📺 **Watch the Demo:** [YouTube Video](https://youtu.be/hSvzRYVPhOs?si=_fCbR1rBc39MFsPI)

🌐 **Try it Live:** [Dashboard Demo](https://shadow-agent-henna.vercel.app/dashboard/demo)

---

## 🔄 How It Works - Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Merchant                         Backend                                   │
│      │                                │                                      │
│      │── Connect Wallet ─────────────>│                                      │
│      │                                │                                      │
│      │<── Return Nonce ──────────────│                                      │
│      │                                │                                      │
│      │── Sign Nonce with Wallet ────>│                                      │
│      │                                │── Verify Signature                   │
│      │<── JWT Token ─────────────────│                                      │
│      │                                │                                      │
└──────┴────────────────────────────────┴──────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESOURCE ACCESS (x402)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   AI Agent                        Gateway                     ShadowWire     │
│      │                               │                            │          │
│      │── GET /resource/:id ────────>│                            │          │
│      │                               │                            │          │
│      │<── 402 Payment Required ─────│                            │          │
│      │    (price, facilitator)       │                            │          │
│      │                               │                            │          │
│      │── Generate ZK Proof ─────────────────────────────────────>│          │
│      │                               │                            │          │
│      │<── Proof + Commitment ───────────────────────────────────│          │
│      │                               │                            │          │
│      │── POST with X-Payment ──────>│                            │          │
│      │    header (ZK proof)          │── Verify Proof ──────────>│          │
│      │                               │                            │          │
│      │                               │<── Valid ────────────────│          │
│      │                               │                            │          │
│      │                               │── Lock in Escrow                      │
│      │                               │                            │          │
│      │<── Resource Content ─────────│                            │          │
│      │    + Receipt Code             │                            │          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SETTLEMENT OR DISPUTE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   AI Agent                        Backend                      Merchant      │
│      │                               │                            │          │
│      │                               │                            │          │
│      ├── [HAPPY PATH] ──────────────────────────────────────────────────────│
│      │                               │                            │          │
│      │── POST /settle (OK) ────────>│                            │          │
│      │                               │── Transfer to Merchant ──>│          │
│      │                               │── Update Trust Score                  │
│      │                               │                            │          │
│      ├── [DISPUTE PATH] ────────────────────────────────────────────────────│
│      │                               │                            │          │
│      │── POST /settle (DISPUTE) ───>│                            │          │
│      │    + encrypted reason         │                            │          │
│      │                               │── Notify Merchant ───────>│          │
│      │                               │                            │          │
└──────┴───────────────────────────────┴────────────────────────────┴──────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI DISPUTE RESOLUTION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Merchant                         AI Service                   Backend      │
│      │                                │                            │         │
│      │── Request AI Analysis ────────────────────────────────────>│         │
│      │                                │                            │         │
│      │                                │<── Fetch Context ─────────│         │
│      │                                │    (resource, dispute,     │         │
│      │                                │     merchant explanation)  │         │
│      │                                │                            │         │
│      │                                │── Analyze with LLM                   │
│      │                                │   (Gemini/GPT-4/Claude)    │         │
│      │                                │                            │         │
│      │                                │── Return Verdict ────────>│         │
│      │                                │   {isValid, confidence,    │         │
│      │                                │    reasoning}              │         │
│      │                                │                            │         │
│      │<── Show AI Decision ──────────────────────────────────────│         │
│      │                                │                            │         │
│      ├── [IF DISPUTE VALID] ────────────────────────────────────────────────│
│      │                                │                            │         │
│      │                                │── Refund Agent ──────────>│         │
│      │                                │── Decrease Trust Score               │
│      │                                │                            │         │
│      ├── [IF DISPUTE INVALID] ──────────────────────────────────────────────│
│      │                                │                            │         │
│      │                                │── Pay Merchant ──────────>│         │
│      │                                │── Maintain Trust Score               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ⭐ Trust Score Algorithm

Trust scores range from 0-100 and determine visibility and reputation. Here's how they work:

### Merchant Score

New merchants start at **50** (neutral). Score changes based on:

| Factor | Weight | What It Means |
|--------|--------|---------------|
| Dispute Success Rate | 45% | % of transactions without lost disputes |
| Total Earnings | 20% | More earnings = more trusted |
| Account Age | 20% | Older accounts score higher |
| Resource Count | 15% | More resources = established seller |

**Simple Math:**
```
Success Rate = (Total Transactions - Lost Disputes) / Total Transactions

If you have 10 transactions and lost 1 dispute:
Success Rate = 9/10 = 90% → Dispute Score ≈ 85

Final Score = (Dispute × 0.45) + (Earnings × 0.20) + (Age × 0.20) + (Resources × 0.15)
```

### Resource Score

New resources start at **50** (influenced slightly by merchant score). Score changes based on:

| Factor | Weight | What It Means |
|--------|--------|---------------|
| Dispute Resolution | 40% | % of accesses without disputes |
| Access Count | 25% | More purchases = popular |
| Merchant Score | 25% | Inherits merchant reputation |
| Recency | 10% | Newer resources get small boost |

**Simple Math:**
```
If resource has 20 accesses and 1 dispute:
Success Rate = 19/20 = 95% → Dispute Score ≈ 95
Access Score = log10(21) × 43 ≈ 57

Final Score = (57 × 0.25) + (95 × 0.40) + (MerchantScore × 0.25) + (Recency × 0.10)
```

### Score Labels

| Score | Label | Color |
|-------|-------|-------|
| 85-100 | Excellent | 🟢 Green |
| 70-84 | Good | 🟢 Lime |
| 55-69 | Fair | 🟡 Yellow |
| 40-54 | Caution | 🟠 Orange |
| 0-39 | High Risk | 🔴 Red |

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <strong>Built with ❤️ on Solana</strong><br/>
  Powered by <a href="https://radr.fun">ShadowWire from Radr Labs</a>
</p>
