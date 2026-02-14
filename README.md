# 🌾 Harvest Finance

**Empowering smallholder farmers through blockchain-based supply chain financing on Stellar**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stellar](https://img.shields.io/badge/Stellar-XLM-blue)](https://stellar.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 🎯 Problem Statement

Smallholder farmers globally face a **$1.5 trillion trade finance gap**. Traditional financing is:
- ❌ Expensive (10-20% interest rates)
- ❌ Slow (weeks to process)
- ❌ Inaccessible (lack of credit history)
- ❌ Risky for both farmers and buyers

## 💡 Solution

Harvest Finance leverages **Stellar blockchain** to create a transparent, low-cost platform where:

✅ **Farmers** receive upfront capital for their crops  
✅ **Buyers** secure their supply chain with guaranteed pricing  
✅ **Payments** release automatically when delivery is verified  
✅ **Everyone** benefits from <$0.00001 transaction fees and 3-5 second settlement

## 🚀 Key Features

### For Farmers
- 🌱 **Pre-Funding**: Get 60-80% upfront payment for confirmed orders
- 💰 **Fair Pricing**: Lock in prices at planting time
- 📈 **Credit Building**: Build on-chain reputation and credit score
- 📱 **Mobile-First**: Simple interface in local languages

### For Buyers
- 🛡️ **Supply Security**: Guarantee crop availability
- 🔍 **Transparency**: Real-time tracking and verification
- ⚡ **Instant Settlement**: Pay only when delivery is confirmed
- 📊 **Risk Management**: Diversify across multiple farms

### For the Platform
- 🔐 **Smart Escrow**: Stellar claimable balances for conditional payments
- 🤖 **Automated Verification**: IoT sensors + inspector validation
- 🌍 **Multi-Currency**: Support for local currencies via Stellar anchors
- 🔗 **Interoperable**: Works with existing agricultural systems

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│          Web Dashboard + Mobile App (React Native)      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Backend API (Node.js)                   │
│   Controllers │ Services │ Auth │ Webhooks │ Analytics  │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬──────────────┐
         │                       │              │
┌────────▼────────┐   ┌──────────▼─────┐   ┌───▼────────┐
│  Stellar Node   │   │   PostgreSQL   │   │    IoT     │
│  (Horizon API)  │   │   (Off-chain)  │   │  Oracles   │
│                 │   │                │   │            │
│ • Escrow        │   │ • User data    │   │ • Sensors  │
│ • Payments      │   │ • Orders       │   │ • Photos   │
│ • Tokens        │   │ • Metrics      │   │ • GPS      │
└─────────────────┘   └────────────────┘   └────────────┘
```

## 🛠️ Tech Stack

### Blockchain
- **Stellar SDK** - Smart contracts and payments
- **Horizon API** - Blockchain queries
- **Freighter/Albedo** - Wallet integration

### Backend
- **Node.js + Express** - API server
- **PostgreSQL** - Relational database
- **Redis** - Caching and sessions
- **JWT** - Authentication

### Frontend
- **React** - Web application
- **React Native** - Mobile apps
- **TailwindCSS** - Styling
- **Redux Toolkit** - State management

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **AWS/DigitalOcean** - Hosting

## 📦 Project Structure

```
harvest-finance/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, validation
│   │   └── config/       # Configuration
│   └── tests/            # Backend tests
├── frontend/             # React web app
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── services/     # API clients
│   └── public/           # Static assets
├── mobile/               # React Native app
├── contracts/            # Stellar smart contracts
│   ├── src/              # Contract logic
│   └── tests/            # Contract tests
├── docs/                 # Documentation
│   ├── architecture/     # System design
│   ├── api/              # API documentation
│   └── user-guides/      # User manuals
└── scripts/              # Deployment scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Stellar testnet account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/harvest-finance.git
cd harvest-finance
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Environment setup**
```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit with your credentials
nano backend/.env
```

4. **Database setup**
```bash
cd backend
npm run db:migrate
npm run db:seed
```

5. **Run development servers**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` 🎉

## 📚 Documentation

- [Architecture Overview](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Smart Contract Guide](contracts/README.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🗺️ Roadmap

### Phase 1: MVP (Q1 2026)
- [x] Basic escrow smart contracts
- [x] Farmer/Buyer registration
- [x] Simple order creation
- [ ] Manual verification system
- [ ] Pilot with 50-100 farmers

### Phase 2: Automation (Q2 2026)
- [ ] IoT sensor integration
- [ ] Mobile inspector app
- [ ] Automated payment triggers
- [ ] Credit scoring algorithm
- [ ] Expand to 500-1000 farmers

### Phase 3: Scale (Q3-Q4 2026)
- [ ] Multi-country expansion
- [ ] Advanced IoT (drones, satellites)
- [ ] Investor marketplace
- [ ] Insurance integration
- [ ] 10,000+ farmers

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Team

- **Your Name** - Project Lead
- Open for contributors!

## 🙏 Acknowledgments

- [Stellar Development Foundation](https://stellar.org) - Blockchain infrastructure
- Agricultural cooperatives - Domain expertise
- Open source community - Tools and libraries

## 📞 Contact

- **Website**: [Coming Soon]
- **Email**: contact@harvestfinance.io
- **Twitter**: [@HarvestFinance](https://twitter.com/harvestfinance)
- **Discord**: [Join our community](https://discord.gg/harvestfinance)

## 🔗 Links

- [Stellar Documentation](https://developers.stellar.org/)
- [Project Wiki](https://github.com/yourusername/harvest-finance/wiki)
- [Bug Reports](https://github.com/yourusername/harvest-finance/issues)

---

**Built with ❤️ for farmers worldwide**
