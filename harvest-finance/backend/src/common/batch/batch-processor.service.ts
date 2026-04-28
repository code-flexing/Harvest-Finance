import { Injectable, Logger } from '@nestjs/common';

/**
 * Batch processor for contract operations
 * Groups multiple requests to reduce RPC calls and improve throughput
 */
export interface BatchRequest<T> {
  id: string;
  operation: () => Promise<T>;
}

export interface BatchResult<T> {
  id: string;
  result?: T;
  error?: Error;
  success: boolean;
}

@Injectable()
export class BatchProcessorService {
  private readonly logger = new Logger(BatchProcessorService.name);
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly DEFAULT_BATCH_TIMEOUT = 100; // ms

  /**
   * Process a batch of requests with configurable size and timeout
   * Useful for batching contract reads/writes to reduce RPC calls
   */
  async processBatch<T>(
    requests: BatchRequest<T>[],
    options?: {
      batchSize?: number;
      timeout?: number;
    },
  ): Promise<BatchResult<T>[]> {
    const batchSize = options?.batchSize || this.DEFAULT_BATCH_SIZE;
    const timeout = options?.timeout || this.DEFAULT_BATCH_TIMEOUT;

    const results: BatchResult<T>[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      this.logger.debug(
        `Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} requests`,
      );

      const batchResults = await Promise.allSettled(
        batch.map((req) =>
          Promise.race([
            req.operation(),
            this.createTimeout(timeout),
          ]).then((result) => ({
            id: req.id,
            result,
            success: true,
          })),
        ),
      );

      for (const settled of batchResults) {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          const failedReq = batch[results.length % batch.length];
          results.push({
            id: failedReq.id,
            error: settled.reason,
            success: false,
          });
        }
      }
    }

    return results;
  }

  /**
   * Process requests with automatic retry on failure
   */
  async processBatchWithRetry<T>(
    requests: BatchRequest<T>[],
    maxRetries: number = 3,
    options?: {
      batchSize?: number;
      timeout?: number;
    },
  ): Promise<BatchResult<T>[]> {
    let results = await this.processBatch(requests, options);
    let retryCount = 0;

    while (
      retryCount < maxRetries &&
      results.some((r) => !r.success)
    ) {
      const failedRequests = requests.filter(
        (req) => !results.find((r) => r.id === req.id && r.success),
      );

      this.logger.warn(
        `Retrying ${failedRequests.length} failed requests (attempt ${retryCount + 1}/${maxRetries})`,
      );

      const retryResults = await this.processBatch(failedRequests, options);
      results = results.map(
        (r) => retryResults.find((rr) => rr.id === r.id) || r,
      );

      retryCount++;
    }

    return results;
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Batch operation timeout after ${ms}ms`)), ms),
    );
  }
}
