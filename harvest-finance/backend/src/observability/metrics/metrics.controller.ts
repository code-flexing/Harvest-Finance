import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiExcludeEndpoint()
  @Header('Content-Type', MetricsService.contentType)
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}

