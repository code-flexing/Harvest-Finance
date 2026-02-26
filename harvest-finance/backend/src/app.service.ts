import { Injectable } from '@nestjs/common';

/**
 * Main application service
 * Provides basic health check and info endpoints
 */
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
