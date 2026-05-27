import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { YieldAnalyticsService } from './yield-analytics.service';
import {
  QueryYieldAnalyticsDto,
  YieldAnalyticsPageDto,
  ContractApyDto,
  ProcessHardWorkEventsResponseDto,
} from './dto/yield-analytics.dto';

@ApiTags('Yield Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'yield-analytics',
  version: '1',
})
export class YieldAnalyticsController {
  constructor(private readonly yieldAnalyticsService: YieldAnalyticsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get yield analytics data',
    description:
      'Returns yield analytics data for contracts including 7-day rolling APYs. ' +
      'Supports filtering by contract ID, date range, and pagination.',
  })
  @ApiResponse({ status: 200, type: YieldAnalyticsPageDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getYieldAnalytics(
    @Query() query: QueryYieldAnalyticsDto,
  ): Promise<YieldAnalyticsPageDto> {
    const analytics = await this.yieldAnalyticsService.getYieldAnalytics(
      query.contractId || '',
      query.days || 30,
    );

    // Apply pagination
    const skip = query.skip || 0;
    const limit = query.limit || 50;
    const paginatedItems = analytics.slice(skip, skip + limit);

    return {
      items: paginatedItems as any,
      total: analytics.length,
      skip,
      limit,
    };
  }

  @Get('current-apy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current 7-day APYs for all contracts',
    description:
      'Returns the current 7-day rolling APY for all contracts that have HardWork events.',
  })
  @ApiResponse({ status: 200, type: [ContractApyDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentApys(): Promise<ContractApyDto[]> {
    return this.yieldAnalyticsService.getCurrentSevenDayApys();
  }

  @Get('contract/:contractId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get yield analytics for a specific contract',
    description:
      'Returns yield analytics data for a specific contract address.',
  })
  @ApiResponse({ status: 200, type: YieldAnalyticsPageDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getContractYieldAnalytics(
    @Query('contractId') contractId: string,
    @Query() query: QueryYieldAnalyticsDto,
  ): Promise<YieldAnalyticsPageDto> {
    const analytics = await this.yieldAnalyticsService.getYieldAnalytics(
      contractId,
      query.days || 30,
    );

    // Apply pagination
    const skip = query.skip || 0;
    const limit = query.limit || 50;
    const paginatedItems = analytics.slice(skip, skip + limit);

    return {
      items: paginatedItems as any,
      total: analytics.length,
      skip,
      limit,
    };
  }

  @Post('process-hardwork-events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process HardWork events',
    description:
      'Manually trigger processing of HardWork events from Soroban contracts ' +
      'to calculate yield analytics and 7-day rolling APYs.',
  })
  @ApiResponse({ status: 200, type: ProcessHardWorkEventsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async processHardWorkEvents(): Promise<ProcessHardWorkEventsResponseDto> {
    try {
      await this.yieldAnalyticsService.processHardWorkEvents();
      return {
        success: true,
        eventsProcessed: 0, // We could enhance this to return actual count
        message: 'HardWork events processed successfully',
      };
    } catch (error) {
      return {
        success: false,
        eventsProcessed: 0,
        message: `Error processing HardWork events: ${error.message}`,
      };
    }
  }
}
