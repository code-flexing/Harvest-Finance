import { IEventParser, ParsedEvent } from './event-parser.interface';

/**
 * Parser for contract schema v1.
 * Topics layout: [event_name_symbol]
 * Value layout: { amount: i128, actor: address }
 */
export class EventParserV1 implements IEventParser {
  readonly contractVersion = 'v1';

  parse(topics: string[], value: unknown): ParsedEvent | null {
    if (!topics.length) return null;

    const eventName = topics[0];
    if (typeof eventName !== 'string') return null;

    const payload = value as Record<string, unknown> | null;

    return {
      eventName,
      contractVersion: this.contractVersion,
      data: {
        amount: payload?.amount ?? null,
        actor: payload?.actor ?? null,
      },
    };
  }
}
