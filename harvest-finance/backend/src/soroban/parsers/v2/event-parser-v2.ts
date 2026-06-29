import { IEventParser, ParsedEvent } from './event-parser.interface';

/**
 * Parser for contract schema v2.
 * Topics layout: [namespace_symbol, event_name_symbol]
 * Value layout: { amount: i128, actor: address, memo: string }
 */
export class EventParserV2 implements IEventParser {
  readonly contractVersion = 'v2';

  parse(topics: string[], value: unknown): ParsedEvent | null {
    // v2 always has at least two topic segments
    if (topics.length < 2) return null;

    const [namespace, eventName] = topics;
    if (typeof namespace !== 'string' || typeof eventName !== 'string') {
      return null;
    }

    const payload = value as Record<string, unknown> | null;

    return {
      eventName: `${namespace}.${eventName}`,
      contractVersion: this.contractVersion,
      data: {
        amount: payload?.amount ?? null,
        actor: payload?.actor ?? null,
        memo: payload?.memo ?? null,
      },
    };
  }
}
