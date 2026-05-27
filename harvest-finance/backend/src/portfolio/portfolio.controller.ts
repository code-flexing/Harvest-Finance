import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AggregatePortfolioDto,
  PortfolioResponseDto,
} from './dto/portfolio.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'portfolio',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aggregate a user portfolio across Stellar accounts and vaults',
    description:
      "Calculates the authenticated user's balance across multiple Stellar accounts and all vault holdings. " +
      'Provide a comma-separated list of Stellar public keys via the `addresses` query parameter. ' +
      "If omitted, only the user's stored stellar address and vault holdings are used.",
  })
  @ApiQuery({
    name: 'addresses',
    required: false,
    type: String,
    description: 'Comma-separated list of Stellar G-addresses',
    example: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated portfolio',
    type: PortfolioResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getPortfolio(
    @Request() req: any,
    @Query('addresses') addresses?: string,
  ): Promise<PortfolioResponseDto> {
    const parsed = (addresses ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    return this.portfolioService.buildPortfolio(req.user.id, parsed);
  }

  @Post('aggregate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Aggregate a portfolio across an explicit list of Stellar accounts',
    description:
      'Same as GET /portfolio but accepts a validated JSON body listing the Stellar public keys to aggregate. ' +
      'Useful for clients holding custody across many accounts.',
  })
  @ApiBody({ type: AggregatePortfolioDto })
  @ApiResponse({
    status: 200,
    description: 'Aggregated portfolio',
    type: PortfolioResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async aggregatePortfolio(
    @Request() req: any,
    @Body() dto: AggregatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    return this.portfolioService.buildPortfolio(
      req.user.id,
      dto.stellarAddresses,
    );
  }
}
