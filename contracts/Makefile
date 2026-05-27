.PHONY: test test-fork test-unit test-fuzz coverage clean

# Run all unit tests (no fork)
test:
	forge test -vvv --match-path "test/Vault*.t.sol" \
	  --skip "test/VaultMainnetFork.t.sol"

# Run mainnet fork tests — requires ETH_RPC_URL env var
test-fork:
	@[ -n "$(ETH_RPC_URL)" ] || (echo "Error: ETH_RPC_URL is not set. Export your Alchemy/Infura URL first." && exit 1)
	forge test --profile fork --fork-url $(ETH_RPC_URL) -vvv

# Fuzz-only tests
test-fuzz:
	forge test --match-path "test/VaultFuzz.t.sol" -vvv

# Coverage report (unit tests only)
coverage:
	forge coverage --report lcov \
	  --match-path "test/Vault*.t.sol" \
	  --skip "test/VaultMainnetFork.t.sol"
	genhtml lcov.info -o coverage-report

# Clean build artifacts
clean:
	forge clean
	rm -rf cache out lcov.info coverage-report
