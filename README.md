# <p align="center"><img src="harvest-finance/frontend/public/logo.png" width="80" height="80" alt="Harvest Finance Logo"> <br> 🌾 Harvest Finance</p>

<p align="center">
  <b>Empowering smallholder farmers through blockchain-based supply chain financing on Stellar</b>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://stellar.org"><img src="https://img.shields.io/badge/Stellar-XLM-blue" alt="Stellar"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="https://discord.gg/harvestfinance"><img src="https://img.shields.io/badge/Discord-Join%20Us-7289DA" alt="Discord"></a>
</p>

---
> **Adding a new endpoint?** Read the [API Versioning Guide](versioning.md) first.  
> All routes must follow the URI versioning strategy (`/api/v{N}/resource`).


## 🎯 The Vision

Harvest Finance addresses the **$1.5 trillion trade finance gap** for smallholder farmers. By leveraging the **Stellar blockchain**, we provide:

- ✅ **Pre-Funding**: Upfront capital at 60-80% for confirmed orders.
- ✅ **Smart Escrow**: Automated, trustless payments via [Stellar Claimable Balances](https://developers.stellar.org/docs/glossary/claimable-balance/).
- ✅ **Zero Hidden Fees**: Transaction costs under $0.00001 with 5s settlement.
- ✅ **Reputation Scoring**: On-chain credit history built from real transaction data.

---

## 🏗️ Architecture Stack

### Core Technology
- **Blockchain**: Stellar Network (Smart contracts, Escrow, Payments)
- **Backend API**: NestJS (Node.js, TypeScript, PostgreSQL, TypeORM, Redis)
- **Frontend**: Next.js 15 (React, TailwindCSS, Framer Motion)
- **Wallet Integration**: Freighter API & Stellar SDK

### Repository Structure
```text
harvest-finance/
├── backend/              # NestJS API & Database logic
├── frontend/             # Next.js Dashboard & Mobile interfaces
└── contracts/            # Smart contract logic & Soroban (Optional)
```

---

## 🚀 Quick Local Setup

Ready to contribute? Get the project running in under 5 minutes:

### 1. Prerequisites
- Node.js 18+ & npm
- PostgreSQL 14+
- Redis 6+

### 2. Fast-Track Setup
```bash
# Clone the repository
git clone https://github.com/code-flexing/Harvest-Finance.git
cd Harvest-Finance

# Setup Backend
cd harvest-finance/backend
npm install && cp .env.example .env
npm run migration:run && npm run start:dev

# Setup Frontend (New Terminal)
cd harvest-finance/frontend
npm install && cp .env.example .env
npm run dev
```

Visit `http://localhost:3000` 🎉

---

## 📚 Resources & Support

- 🤝 **[Contributing Guide](CONTRIBUTING.md)** - Detailed setup, branch naming, and more.
- 📡 **[API Documentation](docs/api/README.md)** - All endpoints with request/response examples.
- 📜 **[Contract Documentation](docs/contracts/README.md)** - Architecture, interfaces, and testing.
- 🐛 **[Report a Bug](https://github.com/code-flexing/Harvest-Finance/issues)** - Help us improve the platform.

---

## 🤝 Contributing

We welcome contributions of all sizes! Whether it's fixing a typo, optimizing a database query, or adding a new feature.

1. **Find an issue** labeled `good-first-issue`.
2. **Comment** to claim the task.
3. **Follow** the [Contribution Workflow](CONTRIBUTING.md).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center"><b>Built with ❤️ for farmers worldwide 🌾</b></p>
