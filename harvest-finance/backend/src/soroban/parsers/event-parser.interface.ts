/**
 * The normalised shape every parser must produce.
 * Additional fields are allowed via the `data` bag so parsers can
 * surface version-specific payload without changing the shared type.
 */
export interface ParsedEvent {
  /** Semantic event name, e.g. "escrow_funded" */
  eventName: string;
  /** Decoded, human-readable payload */
  data: Record<string, unknown>;
  /** Contract version tag that produced this parse result */
  contractVersion: string;
}

/**
 * Each parser is bound to exactly one contract version string.
 * The factory selects the right parser so the indexer never needs to
 * know about version-specific schema details.
 */
export interface IEventParser {
  /** Must match the version string stored in ContractVersionRegistry */
  readonly contractVersion: string;
  /**
   * Attempt to parse the raw RPC topics + value.
   * Return `null` when the schema does not match (unknown / unrecognised event).
   */
  parse(topics: string[], value: unknown): ParsedEvent | null;
}
