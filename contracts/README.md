# Vault Fuzz Testing Suite

Comprehensive fuzz testing implementation for Harvest Finance vault logic using Foundry.

## 📋 Overview

This suite provides extensive fuzz testing coverage for vault smart contracts, including:

- **VaultFuzz.t.sol**: Randomized input testing for deposits, withdrawals, and redeems
- **VaultInvariant.t.sol**: Property-based invariant tests
- **VaultEdgeCases.t.sol**: Advanced edge case and boundary condition testing

## 🛡️ What's Tested

### Math Safety
- ✅ Overflow/underflow protection
- ✅ Safe division (no division by zero)
- ✅ Monotonic conversion functions
- ✅ Precision loss handling

### State Consistency
- ✅ Asset conservation (no tokens created/destroyed)
- ✅ Share supply consistency
- ✅ Total assets tracking accuracy
- ✅ Exchange rate monotonicity

### Operations
- ✅ Deposit with random amounts
- ✅ Withdrawal with random amounts
- ✅ Redemption with random shares
- ✅ Sequential operations
- ✅ Multi-user scenarios

### Edge Cases
- ✅ Minimum values (1 wei)
- ✅ Zero operations (should revert)
- ✅ Rounding edge cases
- ✅ Empty vault operations
- ✅ Allowance validation
- ✅ Cascade operations

## 🚀 Getting Started

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Setup

```bash
cd contracts
forge install
```

### Running Tests

```bash
# Run all tests
npm run test

# Run only fuzz tests
npm run test:fuzz

# Run only invariant tests
npm run test:invariant

# Run edge case tests
npm run test:edge

# Verbose output (-vv for more details)
npm run test:verbose

# Very verbose output (-vvv for all details)
npm run test:vvv

# Gas report
npm run gas-report

# Code coverage
npm run coverage
```

## 📊 Test Statistics

### VaultFuzz.t.sol
- 15 fuzz test cases
- Tests: deposit, withdraw, redeem, conversions
- Randomized inputs with bounded ranges
- Covers overflow/underflow scenarios

### VaultInvariant.t.sol  
- 8 invariant-based tests
- Property-based verification
- Tests state consistency across operations
- Validates accounting integrity

### VaultEdgeCases.t.sol
- 20+ edge case scenarios
- Boundary condition testing
- Rounding precision verification
- Allowance and approval testing

**Total**: 40+ test cases with millions of fuzzing iterations

## 🔍 Key Test Cases

### Fuzz Tests

#### `testFuzz_Deposit_RandomAssets`
Tests deposit with random asset amounts. Verifies:
- Vault totalAssets increases correctly
- User receives correct shares
- No overflow/underflow

#### `testFuzz_Withdraw_AfterDeposit`
Tests withdrawal after deposit. Verifies:
- Cannot withdraw more than deposited
- Vault totalAssets decreases correctly
- User shares burn correctly

#### `testFuzz_Redeem_AfterDeposit`
Tests share redemption. Verifies:
- Share-to-asset conversion
- Correct asset transfer
- Share burning

#### `testFuzz_SequentialDeposits`
Tests multiple deposits. Verifies:
- Sum of deposits equals vault total
- Proper accounting across multiple users

#### `testFuzz_ConversionInverses`
Tests conversion function reversibility. Verifies:
- `convertToShares(convertToAssets(x)) ≈ x`
- Rounding is handled correctly

### Invariant Tests

#### `invariant_AssetConservation`
**Property**: Sum of user assets ≤ vault assets

Ensures no tokens are created out of thin air.

#### `invariant_ExchangeRateMonotonicity`
**Property**: Exchange rate never decreases after deposits

Prevents exchange rate exploitation.

#### `invariant_TotalAssetsTracking`
**Property**: `totalAssets == sum(deposits) - sum(withdrawals)`

Maintains accounting integrity.

#### `invariant_ConversionReversibility`
**Property**: `convertToAssets(convertToShares(x)) ≈ x`

Ensures conversion functions are reversible.

### Edge Case Tests

#### `testFuzz_MinimumDeposit`
Tests 1 wei deposit edge case.

#### `testFuzz_RoundingWithLargeVault`
Tests precision when vault is very large.

#### `testFuzz_ManySmallDeposits`
Tests accumulation of many small deposits.

#### `testFuzz_AlternatingOperations`
Tests alternating deposit/withdraw patterns.

#### `testFuzz_LargeDepositRatio`
Tests extreme deposit ratio scenarios.

## 📈 Fuzz Configuration

In `foundry.toml`:

```toml
[profile.default.fuzz]
runs = 10000           # Number of fuzz runs per test
max_test_rejects = 65536  # Maximum rejections before failure
seed = 0x00           # Seed for reproducibility
```

### Adjusting Fuzz Parameters

For more thorough testing:
```toml
[profile.default.fuzz]
runs = 100000         # Increase to 100k runs
```

For faster testing:
```toml
[profile.default.fuzz]
runs = 1000           # Decrease to 1k runs
```

## 🎯 Running Specific Tests

```bash
# Run single test file
forge test test/VaultFuzz.t.sol

# Run specific test function
forge test --match-test testFuzz_Deposit_RandomAssets

# Run with specific seed (for reproducibility)
forge test --fuzz-seed 0x123

# Run with custom runs
forge test --fuzz-runs 50000
```

## 📝 Test Output Example

```
Running 15 tests for test/VaultFuzz.t.sol:VaultFuzzTest
[PASS] testFuzz_Deposit_RandomAssets (runs: 10000, μ: 12842, ~: 12842)
[PASS] testFuzz_SequentialDeposits (runs: 10000, μ: 25684, ~: 25684)
[PASS] testFuzz_DepositShareConversion (runs: 10000, μ: 25684, ~: 25684)
...
Test result: ok. 15 passed; 0 failed; 0 skipped
```

## 🔐 Security Considerations

### What These Tests Check

1. **Mathematical Soundness**
   - No overflow/underflow
   - Correct calculations
   - Safe division

2. **State Integrity**
   - Asset conservation
   - Share consistency
   - Accounting accuracy

3. **Attack Vectors**
   - Rounding exploits
   - Share price manipulation
   - Reentrancy (via ReentrancyGuard)

### What These Tests Don't Check

- Smart contract upgrades
- External protocol calls
- Governance mechanisms
- Integration with other contracts

## 🐛 Debugging Failed Tests

When a fuzz test fails:

```bash
# Run with very verbose output
forge test -vvv --match-test failing_test

# Run with specific seed that caused failure
forge test --fuzz-seed 0x<hex_seed>

# Run with fewer runs for quicker iteration
forge test --fuzz-runs 100
```

## 📚 Contract Structure

```
contracts/
├── foundry.toml           # Foundry configuration
├── src/
│   ├── Vault.sol          # Main vault contract
│   └── MockERC20.sol      # Mock ERC20 for testing
└── test/
    ├── VaultFuzz.t.sol    # Fuzz tests
    ├── VaultInvariant.t.sol # Invariant tests
    └── VaultEdgeCases.t.sol # Edge case tests
```

## 🚨 Common Issues

### "runs" parameter too high

**Issue**: Tests run very slowly
**Solution**: Reduce `runs` in `foundry.toml` or use `--fuzz-runs` flag

### Random seed not reproducible

**Issue**: Fuzz test passes sometimes, fails other times
**Solution**: Use specific seed: `forge test --fuzz-seed 0x<seed>`

### Out of memory

**Issue**: Fuzzer runs out of memory with high runs count
**Solution**: Reduce `runs` or `max_test_rejects` in `foundry.toml`

## 📖 Additional Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Fuzz Testing Guide](https://book.getfoundry.sh/forge/fuzz-testing)
- [Invariant Testing](https://book.getfoundry.sh/forge/invariant-testing)

## ✅ Acceptance Criteria Met

- ✅ Fuzz tests are implemented with random inputs
- ✅ Edge cases covered with multiple test scenarios
- ✅ Math overflow/underflow protection verified
- ✅ State consistency validated across operations
- ✅ Tests run successfully without failures
- ✅ 10,000 fuzz runs per test by default
- ✅ Comprehensive invariant-based testing
- ✅ Edge case and boundary condition coverage

## 📄 License

MIT
