import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CHAIN_ADAPTERS,
  ChainAdapter,
} from './interfaces/chain-adapter.interface';
import { MultiChainYieldsDto } from './dto/multi-chain.dto';
import { ChainYield } from './interfaces/chain-adapter.interface';

@Injectable()
export class MultiChainService {
  private readonly logger = new Logger(MultiChainService.name);

  constructor(
    @Inject(CHAIN_ADAPTERS) private readonly adapters: ChainAdapter[],
  ) {}

  /**
   * Fan out across every registered chain adapter in parallel and aggregate
   * the results. A single adapter failure is recorded under `errors` rather
   * than failing the whole response — partial data is more useful than none.
   */
  async getCrossChainYields(userId: string): Promise<MultiChainYieldsDto> {
    const settled = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.getYieldsForUser(userId)),
    );

    const positions: ChainYield[] = [];
    const errors: { chain: string; message: string }[] = [];

    settled.forEach((result, idx) => {
      const adapter = this.adapters[idx];
      if (result.status === 'fulfilled') {
        positions.push(...result.value);
      } else {
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : 'unknown error';
        this.logger.warn(
          `Adapter '${adapter.chain}' failed for user=${userId}: ${message}`,
        );
        errors.push({ chain: adapter.chain, message });
      }
    });

    return {
      userId,
      generatedAt: new Date().toISOString(),
      positions,
      chainsQueried: this.adapters.map((a) => a.chain),
      errors,
    };
  }
}
