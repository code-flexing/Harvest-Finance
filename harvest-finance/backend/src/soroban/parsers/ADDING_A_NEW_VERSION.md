# Adding a New Contract Version

Follow these four steps whenever a contract upgrade changes the Soroban event schema.

---

## 1. Write the parser

Create `src/soroban/parsers/vN/event-parser-vN.ts` implementing `IEventParser`:

```ts
import { IEventParser, ParsedEvent } from '../event-parser.interface';

export class EventParserVN implements IEventParser {
  readonly contractVersion = 'vN';

  parse(topics: string[], value: unknown): ParsedEvent | null {
    // Return null for any topic/value shape you don't recognise.
    // The indexer will log a warning and store the raw event, but won't crash.
    if (!topics.length) return null;

    const payload = value as Record<string, unknown> | null;
    return {
      eventName: topics[0],
      contractVersion: this.contractVersion,
      data: {
        // map your new schema fields here
      },
    };
  }
}
```

---

## 2. Register the parser in the factory

Open `src/soroban/parsers/event-parser.factory.ts` and add:

```ts
import { EventParserVN } from './vN/event-parser-vN';

// inside the constructor:
this.register(new EventParserVN());
```

---

## 3. Add the ledger range to the registry

Update the `SOROBAN_CONTRACT_VERSIONS` environment variable (or `.env`).  
Close the previous version's `toLedger` to the ledger **before** the upgrade,
and open the new version from the upgrade ledger:

```json
{
  "C<CONTRACT_ID>": [
    { "version": "v1", "fromLedger": 0,       "toLedger": 749999 },
    { "version": "v2", "fromLedger": 750000,   "toLedger": 999999 },
    { "version": "vN", "fromLedger": 1000000,  "toLedger": null   }
  ]
}
```

Set `toLedger: null` for the currently active version (open-ended range).

---

## 4. Run the migration (if the schema changed)

If this version introduced new database columns you must also write and run a
TypeORM migration.  The `contract_version` column itself already exists after
`1700000000021-AddContractVersionToSorobanEvents`.

```bash
cd harvest-finance/backend
npm run migration:run
```

---

## Invariants

| Invariant | Where enforced |
|-----------|---------------|
| Every event in the DB has a `contract_version` | `toEntity()` in `SorobanIndexerService` |
| Unknown versions are skipped, never crash | `EventParserFactory.parse()` logs a warning and returns `null` |
| Historical events default to `v1` | `SOROBAN_DEFAULT_CONTRACT_VERSION` env var (default: `v1`) |
| Ledger ranges are non-overlapping per contract | Responsibility of the operator configuring `SOROBAN_CONTRACT_VERSIONS` |
