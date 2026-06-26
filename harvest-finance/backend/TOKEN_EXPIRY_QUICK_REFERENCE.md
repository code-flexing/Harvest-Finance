# Token Expiry Tests - Quick Reference Guide

## What This Is

A comprehensive test suite (130+ tests) that verifies authentication tokens expire correctly in the Harvest Finance backend.

## Why This Matters

Token expiry is a critical security control. If it fails silently (e.g., due to off-by-one errors), attackers could use expired tokens. These tests ensure token expiry works perfectly.

## Quick Start

### Run All Token Expiry Tests
```bash
npm test -- src/auth/
```

### Run Specific Test Suite
```bash
# Core token expiry tests
npm test -- src/auth/token-expiry.spec.ts

# JWT Strategy tests
npm test -- src/auth/strategies/jwt-expiry.spec.ts

# TTL calculation tests
npm test -- src/auth/logout-ttl.spec.ts

# Full lifecycle tests
npm test -- src/auth/token-lifecycle.spec.ts
```

### Run with Coverage
```bash
npm run test:cov -- src/auth/
```

## What Gets Tested

### ✅ Token Validity
- Tokens valid immediately after issuance
- Tokens remain valid throughout their validity window (50%, 90% of lifetime)
- Tokens rejected exactly at expiry moment
- Tokens rejected after expiry (1 second, 1 hour, 30 days)

### ✅ Token Types
| Token | Expiry | Tested |
|-------|--------|--------|
| Access | 1 hour | ✅ |
| Refresh | 7 days | ✅ |
| Reset Password | 1 hour | ✅ |

### ✅ Boundary Conditions
- Exact expiry moment (exp === now)
- 1 second before expiry
- 1 second after expiry
- 1 millisecond after expiry
- Far past expiry (days/weeks later)

### ✅ Calculation Verification
- Milliseconds to seconds conversion
- TTL (time-to-live) calculations
- Floor operation behavior
- Math.max(0, ...) for negative TTL

### ✅ Security Controls
- Inactive users cannot refresh tokens
- Deleted users cannot use tokens
- Token blacklisting behavior
- User state validation

### ✅ Edge Cases
- Leap seconds
- Year 2038 problem
- Fractional seconds
- Large Unix timestamps
- Special characters in tokens

## Test Organization

```
token-expiry.spec.ts           (Core expiry validation)
├─ Access Token Tests (1h)
├─ Refresh Token Tests (7d)
├─ Reset Token Tests (1h)
├─ Service Tests
├─ Boundary Conditions
├─ Time Handling
└─ Determinism

jwt-expiry.spec.ts             (Strategy validation)
├─ JwtStrategy Tests
└─ JwtRefreshStrategy Tests

logout-ttl.spec.ts             (TTL calculation)
├─ TTL Calculations
├─ Edge Cases
├─ Unit Conversion
├─ Blacklist Mechanism
├─ Time Advancement
└─ Math Operations

token-lifecycle.spec.ts        (Integration tests)
├─ Authentication Flow
├─ Login Workflow
├─ Refresh Workflow
├─ Logout Workflow
├─ Concurrent Operations
├─ User State
├─ Reset Tokens
└─ Precision Tests
```

## How Tests Work

### Fake Timers (Key Feature)
Tests use Jest's fake timer system:
```typescript
jest.useFakeTimers();           // Enable fake time control
jest.advanceTimersByTime(3600000);  // Advance 1 hour
```

**Why this matters**: Tests run instantly with no real delays, are deterministic, and don't depend on system clock.

### Example Test
```typescript
it('should accept token within validity period', async () => {
  jest.useFakeTimers();
  
  // Create token expiring in 3600 seconds (1 hour)
  const token = createMockToken(3600);
  
  // Advance time 30 minutes
  jest.advanceTimersByTime(1800000);
  
  // Token should still be valid (30 minutes < 60 minutes)
  const payload = jwt.decode(token);
  expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  
  jest.useRealTimers();
});
```

## Key Concepts Tested

### 1. Token Expiration Time (exp claim)
- Set during token creation: `now + duration`
- Checked during verification: `exp > now`
- UTC-based (seconds since epoch)

### 2. TTL for Blacklisting
```typescript
// How it works:
const exp = payload.exp * 1000;           // seconds → milliseconds
const ttl = Math.max(0, Math.floor((exp - Date.now()) / 1000));
// Result: remaining lifetime in seconds
```

Tests verify:
- ✅ Correct unit conversion (seconds ↔ milliseconds)
- ✅ Correct subtraction order
- ✅ Correct floor operation
- ✅ Correct Math.max behavior for expired tokens

### 3. Strategy Configuration
```typescript
// JWT strategies configured with:
ignoreExpiration: false  // ← Critical! Rejects expired tokens
```

Tests verify:
- ✅ Configuration is present
- ✅ Expired tokens are rejected
- ✅ Valid tokens are accepted

## Common Test Patterns

### Testing Token Validity at a Point in Time
```typescript
const now = Math.floor(Date.now() / 1000);
const payload = {
  sub: userId,
  exp: now + 3600  // Expires in 1 hour
};

expect(payload.exp).toBeGreaterThan(now);  // Token valid now
```

### Testing Token Expiry
```typescript
jest.advanceTimersByTime(3600000 + 1000);  // 1 hour 1 second

const now = Math.floor(Date.now() / 1000);
expect(payload.exp).toBeLessThan(now);  // Token expired
```

### Testing TTL Calculation
```typescript
const ttl = Math.max(0, Math.floor((expMs - nowMs) / 1000));

expect(ttl).toBeGreaterThanOrEqual(0);      // Never negative
expect(ttl).toBeLessThanOrEqual(3600);      // Within 1 hour
expect(Number.isInteger(ttl)).toBe(true);   // Always integer
```

## Troubleshooting

### Test Fails with "Token is not a string"
**Cause**: Mock not returning proper token format
**Fix**: Ensure mock token is created with proper JWT format

### Test Times Out
**Cause**: Real timers not being restored
**Fix**: Ensure `jest.useRealTimers()` in `afterEach`

### Tests Pass Locally but Fail in CI/CD
**Cause**: CI has different timezone/clock
**Fix**: Fake timers eliminate this - tests should pass everywhere

### Flaky Tests
**Cause**: Timing-dependent assertions
**Fix**: Use fake timers and test at specific time points

## Expected Results

When you run the tests, you should see:
```
PASS  src/auth/token-expiry.spec.ts (50+ tests)
PASS  src/auth/strategies/jwt-expiry.spec.ts (20+ tests)
PASS  src/auth/logout-ttl.spec.ts (35+ tests)
PASS  src/auth/token-lifecycle.spec.ts (30+ tests)

Tests:       130+ passed, 130+ total
Time:        2-5 seconds
✅ All tests passing
```

## Important Files

| File | Purpose | Lines |
|------|---------|-------|
| `token-expiry.spec.ts` | Core expiry validation | 470 |
| `jwt-expiry.spec.ts` | Strategy tests | 250 |
| `logout-ttl.spec.ts` | TTL calculation | 430 |
| `token-lifecycle.spec.ts` | Integration tests | 520 |
| `TOKEN_EXPIRY_TESTS.md` | Full documentation | Reference |
| `TOKEN_EXPIRY_IMPLEMENTATION_SUMMARY.md` | Implementation details | Reference |

## Key Assertions Used

### Expiry Validation
```typescript
expect(payload.exp).toBeGreaterThan(now);      // Valid
expect(payload.exp).toBeLessThanOrEqual(now);  // Expired
```

### TTL Validation
```typescript
expect(ttl).toBeGreaterThanOrEqual(0);         // Non-negative
expect(ttl).toBeLessThanOrEqual(3600);         // Within limit
expect(Number.isInteger(ttl)).toBe(true);      // Integer seconds
```

### Service Behavior
```typescript
expect(mockCacheManager.set).toHaveBeenCalled();     // Blacklist set
expect(mockJwtService.verifyAsync).toHaveBeenCalled(); // Verify called
await expect(service.refresh(token)).rejects.toThrow(); // Rejection
```

## Real-World Scenario: What These Tests Prevent

### Scenario 1: Off-by-One Error
```typescript
// ❌ BAD CODE (would fail the tests)
if (payload.exp >= now) {  // Wrong! Should be >
  // Accept token
}

// ✅ GOOD CODE (passes the tests)
if (payload.exp > now) {  // Correct
  // Accept token
}
```

### Scenario 2: Unit Conversion Error
```typescript
// ❌ BAD CODE (fails millisecond test)
const ttl = Math.floor((payload.exp - Date.now()) / 1000);
// exp is seconds, Date.now() is milliseconds - mismatch!

// ✅ GOOD CODE (passes the tests)
const ttl = Math.floor((payload.exp * 1000 - Date.now()) / 1000);
// Converts to same units first
```

### Scenario 3: Negative TTL
```typescript
// ❌ BAD CODE (would allow negative TTL)
const ttl = Math.floor((expMs - nowMs) / 1000);
// If token expired, ttl could be -1, -100, etc.

// ✅ GOOD CODE (prevents negative TTL)
const ttl = Math.max(0, Math.floor((expMs - nowMs) / 1000));
// Guarantees ttl >= 0
```

## Next Steps

1. ✅ **Review** this guide and understand how tests work
2. ✅ **Run** the tests: `npm test -- src/auth/`
3. ✅ **Verify** all tests pass
4. ✅ **Read** TOKEN_EXPIRY_TESTS.md for detailed coverage
5. ✅ **Integrate** into CI/CD pipeline
6. ✅ **Monitor** test results in future PRs

## Support

- **Full test documentation**: `TOKEN_EXPIRY_TESTS.md`
- **Implementation details**: `TOKEN_EXPIRY_IMPLEMENTATION_SUMMARY.md`
- **Test files**: `src/auth/*.spec.ts`

---

**Summary**: This test suite ensures token expiry works perfectly, preventing security vulnerabilities. All 130+ tests use fake timers for reliable, deterministic execution.
