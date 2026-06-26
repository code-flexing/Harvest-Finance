# 🚀 Create Pull Request Link

## Direct PR Creation

**Click this link to create your Pull Request:**

### https://github.com/code-flexing/Harvest-Finance/compare/main...fix/backend-issues

---

## 📋 Quick Steps

1. **Click the link above** - Takes you to GitHub comparison page on the maintainer's repository.
2. **Review the changes**
3. **Click "Create pull request"**
4. **Add PR description** - Use template below

## 📝 PR Description Template

```markdown
## Summary
This PR implements multiple backend features related to Vault Service tests, Domain Events, Deposit/Withdrawal E2E Tests, and Fiat On-Ramp Integration, addressing issues 485, 486, 487, and 583.

## Features Implemented
- ✅ Implement service-layer unit tests for VaultsService
- ✅ Add integration tests for the deposit and withdrawal flow
- ✅ Implement domain events system using NestJS EventEmitter
- ✅ Add fiat on-ramp integration for Nigerian Naira (NGN) deposits via Paystack

## Changes Made
- **Tests**: `backend/src/vaults/vaults.service.spec.ts`, `backend/test/deposit-withdrawal.e2e-spec.ts`
- **Events**: Defined and dispatched domain events (VaultCreated, DepositConfirmed, etc.) using EventEmitter.
- **Fiat Integration**: Added `PaystackFiatOnRampProvider` to support NGN deposits and integrated it into the `PaymentsModule`.

## Environment Variables Required
```env
# Backend
PAYMENTS_ONRAMP_PROVIDER=paystack
```

## How to Test
1. Run backend tests: `npm run test`
2. Run backend e2e tests: `npm run test:e2e`
3. Verify domain events dispatch correctly.
4. Verify NGN deposit functionality via the Mock/Paystack integration.

Closes #485
Closes #486
Closes #487
Closes #583
```

---

## 🎯 Quick Actions

1. **Click the link above** to go directly to the PR creation page
2. **Review the changes** in the comparison view
3. **Fill in the PR description** using the template above
4. **Create the pull request** for review

**Ready for Review!** 🚀
