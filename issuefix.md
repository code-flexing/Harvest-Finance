# Issue Fix Plan

## Issue 1: Split StellarService into focused sub-services
**Area**: Architecture  
**Plan**: 
- Analyze the current StellarService (backend/src/stellar/services/stellar.service.ts) to identify distinct concerns: escrow, payments, and account management.
- Create three new services: EscrowService, PaymentService, AccountService in the same directory.
- Move relevant methods and properties to each new service.
- Update the StellarService to either be a facade that delegates to these services or remove it entirely if not needed.
- Update all usages of StellarService to use the new services.
- Write unit tests for each new service.

## Issue 2: Add Mapper service for entity/DTO conversion
**Area**: Architecture  
**Plan**:
- Identify all places where entity-to-DTO conversion is happening (likely in services and controllers).
- Create mapper classes (e.g., VaultMapper, DepositMapper) in a new directory (e.g., src/mappers).
- Each mapper will have static methods or instance methods to convert entities to DTOs and vice versa.
- Use a library like class-transformer for automatic mapping or manual mapping for control.
- Replace inline conversion logic with calls to the mappers.
- Ensure mappers are tested.

## Issue 3: Implement Specification pattern for vault queries
**Area**: Architecture  
**Plan**:
- Identify inline TypeORM where conditions in vault-related repositories or services.
- Create Specification interfaces and classes that encapsulate query conditions.
- Examples: ActiveVaultSpec, OwnedByUserSpec, BelowCapacitySpec.
- Each specification will have a method to apply its condition to a TypeORM query builder or find options.
- Refactor existing queries to use specifications by composing them (e.g., using andWhere, orWhere).
- Ensure specifications are reusable and testable.

## Issue 4: Add pre-commit hooks with husky and lint-staged
**Area**: Developer Experience (DX)  
**Plan**:
- Install husky and lint-staged as dev dependencies.
- Configure husky to run on pre-commit.
- Configure lint-staged to run eslint and tsc --noEmit on staged TypeScript files.
- Add a "prepare" script in package.json to set up husky.
- Optionally, add a lint-staged configuration in package.json.
- Test by making a change and committing to ensure hooks run.