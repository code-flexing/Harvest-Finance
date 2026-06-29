import { Injectable, Logger } from '@nestjs/common';
import { IEventParser, ParsedEvent } from './event-parser.interface';
import { EventParserV1 } from './v1/event-parser-v1';
import { EventParserV2 } from './v2/event-parser-v2';

/**
 * EventParserFactory
 *
 * Maintains a registry of versioned parsers and routes incoming raw events
 * to the correct parser based on the resolved contract version string.
 *
 * Adding a new contract version:
 *   1. Create `src/soroban/parsers/vN/event-parser-vN.ts` implementing IEventParser.
 *   2. Instantiate it below and pass it to `register()`.
 *   3. Add the version's ledger range to ContractVersionRegistry.
 *
 * @see ContractVersionRegistry for how versions are resolved from ledger numbers.
 */
@Injectable()
export class EventParserFactory {
  private readonly logger = new Logger(EventParserFactory.name);
  private readonly parsers = new Map<string, IEventParser>();

  constructor() {
    this.register(new EventParserV1());
    this.register(new EventParserV2());
  }

  private register(parser: IEventParser): void {
    this.parsers.set(parser.contractVersion, parser);
  }

  /**
   * Returns the parser for the given version, or `null` when unknown.
   * Callers should log and skip unknown versions rather than throwing.
   */
  getParser(contractVersion: string): IEventParser | null {
    return this.parsers.get(contractVersion) ?? null;
  }

  /**
   * Convenience method: resolve a parser and run it in one call.
   * Returns `null` for unknown versions or when the parser rejects the schema.
   */
  parse(
    contractVersion: string,
    topics: string[],
    value: unknown,
  ): ParsedEvent | null {
    const parser = this.getParser(contractVersion);
    if (!parser) {
      this.logger.warn(
        `Unknown contract version "${contractVersion}" — skipping event`,
      );
      return null;
    }
    return parser.parse(topics, value);
  }

  /** Returns all registered version strings (useful for health/status endpoints). */
  registeredVersions(): string[] {
    return [...this.parsers.keys()];
  }
}
