import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrackFunnelEventDto } from './dto/analytics.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'analytics',
  version: '1',
})
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('vaults')
  @ApiOperation({ summary: 'Get vault-level metrics' })
  getVaultMetrics() {
    return this.analyticsService.getVaultMetrics();
  }

  @Get('system')
  @ApiOperation({
    summary: 'Get system-level metrics (uptime, request counts)',
  })
  getSystemMetrics() {
    return this.analyticsService.getSystemMetrics();
  }

  @Post('funnel/events')
  @ApiOperation({ summary: 'Track a privacy-safe funnel event (no PII)' })
  trackFunnelEvent(@Body() body: TrackFunnelEventDto) {
    return this.analyticsService.trackFunnelEvent(body);
  }

  @Get('funnel/conversion')
  @ApiOperation({ summary: 'Get funnel conversion summary by step' })
  getFunnelConversion(
    @Query('funnelName') funnelName = 'deposit-conversion',
    @Query('fromStep') fromStep = 'Click Deposit',
    @Query('toStep') toStep = 'Transaction Confirmed',
  ) {
    return this.analyticsService.getFunnelConversion(
      funnelName,
      fromStep,
      toStep,
    );
  }
}
