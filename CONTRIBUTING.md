# 🤝 Contributing to Harvest Finance

Thank you for helping empower smallholder farmers! This guide covers everything you need to contribute effectively.

---

## 📋 Table of Contents
- [Getting Started](#getting-started)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Workflow](#pull-request-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)

---

## Getting Started

### 1. Fork & Clone
```bash
git clone https://github.com/<your-username>/Harvest-Finance.git
cd Harvest-Finance
```

### 2. Setup Backend
```bash
cd harvest-finance/backend
npm install
cp .env.example .env   # fill in DB_HOST, DB_PASSWORD, JWT_SECRET, etc.
npm run migration:run
npm run start:dev       # runs on http://localhost:5000
```

### 3. Setup Frontend
```bash
cd harvest-finance/frontend
npm install
cp .env.example .env
npm run dev             # runs on http://localhost:3000
```

### 4. Setup Contracts (optional)
```bash
# Install Foundry: https://book.getfoundry.sh/getting-started/installation
cd contracts
forge install
forge test
```

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/login-page-ui` |
| Bug fix | `fix/<short-description>` | `fix/vault-deposit-overflow` |
| Docs | `docs/<short-description>` | `docs/api-readme` |
| Refactor | `refactor/<short-description>` | `refactor/vault-modular` |
| Test | `test/<short-description>` | `test/vault-edge-cases` |

Always branch off `main` unless the issue specifies otherwise.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add analytics dashboard endpoint
fix: correct vault totalDeposits drift on withdrawal
docs: update API README with state-sync endpoints
test: add fuzz tests for VaultLib.toShares
refactor: extract share math into VaultLib
```

Reference the issue number in the PR description with `Closes #<issue>`.

---

## Pull Request Workflow

1. **Claim** the issue by commenting on it
2. **Create** your branch from `main`
3. **Implement** your changes with tests
4. **Run** the test suite locally before pushing
5. **Open** a PR against `main` with:
   - Clear title matching the issue
   - Description of what changed and why
   - Screenshots for UI changes
   - `Closes #<issue-number>`
6. **Address** review feedback promptly

---

## Coding Standards

### TypeScript (Backend / Frontend)
- Use `async/await`, not raw Promises
- Validate all inputs with `class-validator` DTOs
- Never return passwords or secrets in responses
- Use NestJS guards for all protected routes

### Solidity (Contracts)
- Follow [Checks-Effects-Interactions](https://docs.soliditylang.org/en/latest/security-considerations.html)
- Use `ReentrancyGuard` on all state-mutating functions
- Add NatSpec (`@notice`, `@param`, `@return`) to all public functions
- Prefer libraries for reusable pure math

---

## Testing Requirements

| Layer | Minimum Coverage | Command |
|---|---|---|
| Backend unit | ≥ 90% | `npm run test:cov` |
| Backend e2e | Key flows | `npm run test:e2e` |
| Contracts fuzz | 10,000 runs | `forge test` |

- All PRs must pass CI before merge
- New features must include corresponding tests
- Bug fixes must include a regression test
