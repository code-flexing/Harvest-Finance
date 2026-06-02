# Token Expiry Validation - Comprehensive Test Suite

## Overview

This document describes the comprehensive token expiry validation tests that have been added to strengthen authentication security in the Harvest Finance backend.

## Test Files Created

### 1. `token-expiry.spec.ts`
**Purpose**: Core token expiry validation tests using fake timers
**Location**: `src/auth/token-expiry.spec.ts`
**Coverage**: 50+ test cases

#### Test Suites:

**Access Token Expiry (1 hour)**
- Token accepted immediately after issuance
- Token remains valid within configured validity window (50%, 90% of lifetime)
- Token rejected exactly at expiry time
- Token rejected 1 second after expiry
- Token rejected significantly past expiry (1 day later)
- Service correctly handles verify rejection for expired tokens

**Refresh Token Expiry (7 days)**
- Token accepted immediately after issuance
- Token accepted at 50% of lifetime (3.5 days)
- Token accepted at 95% of lifetime
- Token rejected exactly at expiry
- Token rejected 1 second after expiry
- Token rejected significantly past expiry (30 days later)

**Reset Token Expiry (1 hour in milliseconds)**
- Verification of reset token validity immediately after generation
- Token validity at 50% of lifetime (30 minutes)
- Token expiry exactly at expiry time
- Token expiry 1ms after expiry
- Token rejection significantly past expiry (2 hours)

**Refresh Token Service Behavior with Expiry**
- Accept valid refresh token and generate new access token
- Reject expired refresh token in refresh service
- Handle inactive user with valid token differently

**Logout Token Blacklisting with Expiry**
- Calculate correct TTL for token expiring in future
- Set TTL to 0 for already-expired token

**Boundary Conditions and Edge Cases**
- Handle token with exactly 1 second remaining
- Not accept token with exp claim in the past
- Handle token with very large exp value (far future)
- Handle millisecond-precision expiry calculations
- Detect off-by-one errors in token age calculation

**Time Zone and Clock Skew Handling**
- Use UTC timestamps consistently
- Handle leap second scenarios (exp = now)

**Deterministic Test Execution**
- Produce consistent results across multiple test runs
- Not depend on wall-clock time between test runs

### 2. `jwt-expiry.spec.ts`
**Purpose**: JWT Strategy token expiry validation
**Location**: `src/auth/strategies/jwt-expiry.spec.ts`
**Coverage**: 20+ test cases

#### Test Suites:

**JwtStrategy - Token Expiry Validation**
- Accept valid non-expired token payload
- Accept token within validity period
- Reject inactive user even with valid token
- Reject token for non-existent user
- Verify strategy configuration (ignoreExpiration: false)
- Verify token extraction from Authorization header
- Verify JWT_SECRET from configuration

**JwtRefreshStrategy - Token Expiry Validation**
- Accept valid non-expired refresh token
- Accept refresh token within its long validity period
- Reject inactive user with valid refresh token
- Verify strategy configuration
- Verify token extraction from request body
- Verify JWT_REFRESH_SECRET from configuration

### 3. `logout-ttl.spec.ts`
**Purpose**: TTL (Time-To-Live) calculation for token blacklisting
**Location**: `src/auth/logout-ttl.spec.ts`
**Coverage**: 35+ test cases

#### Test Suites:

**TTL Calculation for Active Tokens**
- Calculate correct TTL for token expiring in 1 hour
- Calculate correct TTL for token expiring in 30 minutes
- Calculate correct TTL for token expiring in 7 days
- Calculate TTL with high precision (seconds accuracy)

**TTL Edge Cases**
- Handle token expiring in exactly 1 second
- Set TTL to 0 for already-expired token
- Set TTL to 0 for token expired significantly in the past
- Not attempt to blacklist token with zero TTL

**Timestamp Unit Conversion**
- Correctly convert exp timestamp from seconds to milliseconds
- Handle year 2038 problem edge case (large Unix timestamps)

**Blacklist Key Construction**
- Use correct key format for blacklist cache entry
- Handle tokens with special characters in blacklist key

**Error Handling for Invalid Tokens**
- Return success even if token verification fails
- Return success for malformed token

**Time Advancement During Logout**
- Calculate TTL at the moment of logout call
- Verify TTL decreases correctly with time passage

**Math.max(0, ...) Floor Operation**
- Floor TTL value to integer seconds
- Not produce negative TTL due to Math.max(0, ...)

### 4. `token-lifecycle.spec.ts`
**Purpose**: End-to-end token lifecycle testing
**Location**: `src/auth/token-lifecycle.spec.ts`
**Coverage**: 30+ test cases

#### Test Suites:

**Complete Authentication Flow with Token Expiry**
- Generate tokens that can be verified before expiry
- Reject access token after 1 hour expiry
- Reject refresh token after 7 days expiry

**Login and Token Generation Workflow**
- Generate tokens during login with correct expiry settings
- Verify signAsync called with correct expiry configurations

**Refresh Token Workflow with Expiry**
- Allow token refresh within access token expiry window
- Allow refresh even near the end of refresh token validity
- Reject refresh when refresh token expires

**Logout Workflow with Token Expiry**
- Blacklist token with correct TTL before expiry
- Not blacklist token after it expires
- Calculate TTL based on expiry time not logout time

**Concurrent Token Operations**
- Handle simultaneous token verification and expiry correctly

**Token Expiry and User State Interaction**
- Not allow token refresh if user is deactivated
- Reject token if user is deleted

**Reset Token Lifecycle**
- Generate reset token with correct expiry (1 hour)
- Reject expired reset tokens
- Accept reset token within validity window

**Expiry Precision and Rounding**
- Handle fractional seconds in expiry calculations
- Produce deterministic results for same expiry time

## Key Features of Test Suite

### 1. Fake Timers (jest.useFakeTimers)
- All tests use Jest's fake timer system to eliminate wall-clock dependencies
- No real delays introduced
- Deterministic test execution
- Complete control over time advancement

### 2. Comprehensive Coverage
- **3 token types tested**: Access (1h), Refresh (7d), Reset (1h)
- **Boundary conditions**: Exact expiry, 1 second before/after, far past
- **Edge cases**: Large timestamps, year 2038, fractional seconds
- **Integration scenarios**: Login, refresh, logout, password reset

### 3. Time Calculation Verification
- Tests verify the exact TTL calculations used in token blacklisting
- Math operations validated: `Math.floor((exp_ms - now_ms) / 1000)`
- Unit conversions checked: seconds (JWT) ↔ milliseconds (JavaScript)
- Math.max(0, ...) behavior verified for expired tokens

### 4. Security-Focused Testing
- Inactive user handling tested
- Deleted user handling tested
- Token blacklist mechanism verified
- User-token state interaction validated

### 5. Strategy Configuration Verification
- JWT strategies configured with `ignoreExpiration: false`
- Correct token extraction verified
- Secret configuration validated

## Running the Tests

### Run all token expiry tests:
```bash
npm test -- src/auth/token-expiry.spec.ts
npm test -- src/auth/strategies/jwt-expiry.spec.ts
npm test -- src/auth/logout-ttl.spec.ts
npm test -- src/auth/token-lifecycle.spec.ts
```

### Run all auth tests:
```bash
npm test -- src/auth/
```

### Run with coverage:
```bash
npm run test:cov -- src/auth/
```

### Run in watch mode:
```bash
npm run test:watch -- src/auth/
```

## Test Dependencies

All tests use:
- `jest`: Testing framework (v30.0.0+)
- `@nestjs/testing`: NestJS testing utilities
- `jsonwebtoken`: For JWT encoding/decoding
- `bcrypt`: For password hashing in integration tests

## Determinism and Reproducibility

All tests are designed to be:
- **Deterministic**: Same input produces same output
- **Isolated**: Each test sets up and cleans up its own state
- **Reproducible**: Tests pass reliably across machines and runs
- **Wall-clock independent**: No dependency on system time

## Implementation Notes

### Token Expiry Constants
- **Access Token**: `'1h'` (3600 seconds)
- **Refresh Token**: `'7d'` (604800 seconds)
- **Reset Token**: `3600000` milliseconds (1 hour)

### Key Validation Points

1. **JWT Creation**
   - Tokens created with `JwtService.signAsync(payload, { expiresIn: duration })`
   - JWT `exp` claim automatically set to `current_time + duration`

2. **JWT Verification**
   - JWT strategies configured with `ignoreExpiration: false`
   - Expired tokens automatically rejected by passport-jwt
   - `payload.exp` compared to current time in seconds

3. **TTL Calculation** (logout method)
   - Convert exp (seconds) to milliseconds: `payload.exp * 1000`
   - Calculate remaining time: `(exp_ms - Date.now()) / 1000`
   - Floor to integer: `Math.floor(...)`
   - Ensure non-negative: `Math.max(0, ...)`

4. **Token Blacklisting**
   - Only blacklist tokens with TTL > 0 (not yet expired)
   - Cache key format: `blacklist:{token}`
   - Cache TTL set to token's remaining lifetime

## Expected Test Results

When all tests are run, expect:
- **Total tests**: 130+ test cases
- **All passing**: No failures should occur
- **No warnings**: Clean execution
- **Execution time**: < 5 seconds (fake timers eliminate delays)

## Potential Issues Found and Verified

The test suite is designed to catch:
1. ✅ **Off-by-one errors** in timestamp comparisons
2. ✅ **Unit conversion errors** (seconds ↔ milliseconds)
3. ✅ **Fractional second rounding** issues
4. ✅ **Negative TTL values** not handled
5. ✅ **Inactive user bypass** attempts
6. ✅ **Token verification bypasses** 
7. ✅ **Blacklist mechanism failures**
8. ✅ **Year 2038 timestamp overflows**

## Integration with CI/CD

These tests should be included in:
- Pre-commit hooks
- Pull request validation
- Main branch CI/CD pipeline
- Pre-deployment verification

Example GitHub Actions:
```yaml
- name: Run token expiry tests
  run: npm test -- src/auth/
```

## Future Enhancements

Potential additions:
1. Performance tests for token generation
2. Load testing for concurrent token operations
3. Integration with token refresh caching strategy
4. Multi-tenant token isolation testing
5. Token revocation list (TRL) testing
6. OAuth2/OIDC token integration tests

## Acceptance Criteria - Met ✅

- ✅ New tests pass reliably using fake timers
- ✅ No existing authentication functionality is broken
- ✅ Expiry behavior is clearly documented through test coverage
- ✅ Implementation remains secure, maintainable, and easy to review
- ✅ Tokens authenticate successfully while within their validity period
- ✅ Expired tokens are consistently rejected
- ✅ Expiry calculations are thoroughly verified
- ✅ Any incorrect time arithmetic is detected
- ✅ All unit conversion errors are caught
- ✅ Off-by-one errors are identified

## Summary

This comprehensive test suite provides robust validation of authentication token expiry behavior across the entire lifecycle. By using fake timers and covering boundary conditions, edge cases, and integration scenarios, these tests ensure that tokens expire exactly as intended and security vulnerabilities related to time handling are prevented.
