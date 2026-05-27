import { Injectable } from '@nestjs/common';
import { AppStatusResponseDto } from './app/dto/app-status-response.dto';

/**
 * Main application service
 * Provides basic health check and info endpoints
 */
@Injectable()
export class AppService {
  getHello(): AppStatusResponseDto {
    return { message: 'Hello World!' };
  }
}
