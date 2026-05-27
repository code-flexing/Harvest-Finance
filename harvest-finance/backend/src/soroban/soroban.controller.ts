import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  IndexerStatusDto,
  QuerySorobanEventsDto,
  SorobanEventPageDto,
} from './dto/soroban-events.dto';
import { SorobanIndexerService } from './soroban-indexer.service';

@ApiTags('Soroban Events')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'soroban/events',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class SorobanController {
  constructor(private readonly indexer: SorobanIndexerService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query indexed Soroban contract events',
    description:
      'Returns Soroban ContractEvents pulled from the Soroban RPC by the background indexer. ' +
      'Supports filtering by contract ID, event type, and ledger range, plus skip/limit pagination.',
  })
  @ApiResponse({ status: 200, type: SorobanEventPageDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Query() query: QuerySorobanEventsDto,
  ): Promise<SorobanEventPageDto> {
    return this.indexer.query(query);
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inspect Soroban indexer status' })
  @ApiResponse({ status: 200, type: IndexerStatusDto })
  async status(): Promise<IndexerStatusDto> {
    return this.indexer.status();
  }
}
