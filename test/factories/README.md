Factories for tests

- Use `UserFactory.create()` to get a realistic user DTO. Pass partial overrides to customize fields.
- Use `VaultFactory.create()` to create vault DTOs.
- Use `DepositFactory.create()` to create deposit DTOs.

Example:

```
import { UserFactory, VaultFactory, DepositFactory } from '../test/factories';

const user = UserFactory.create({ email: 'alice@example.com' });
const vault = VaultFactory.create({ ownerId: user.id });
const deposit = DepositFactory.create({ userId: user.id, vaultId: vault.id });
```
