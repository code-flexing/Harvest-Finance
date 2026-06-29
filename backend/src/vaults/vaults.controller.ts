import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { VaultsService } from './vaults.service';
import { VaultResponseDto, VaultLeaderboardEntryDto } from './dto/vault-response.dto';

class DepositBodyDto {
  @IsNumberString()
  amount: string;
}

/**
 * Vaults controller — exposes vault CRUD and TVL leaderboard.
 * All routes follow the URI versioning strategy: /api/v1/vaults/...
 */
@ApiTags('vaults')
@Controller({ path: 'vaults', version: '1' })
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  /**
   * List all vaults including TVL watermark data.
   * GET /api/v1/vaults
   */
  @Get()
  @ApiOperation({ summary: 'List all vaults with TVL watermark data' })
  @ApiResponse({ status: 200, type: [VaultResponseDto] })
  findAll(): Promise<VaultResponseDto[]> {
    return this.vaultsService.findAll();
  }

  /**
   * Rank vaults by their all-time high TVL watermark descending.
   * GET /api/v1/vaults/leaderboard/tvl
   *
   * NOTE: This route must be declared before /:id to prevent
   * "leaderboard" being matched as a UUID param.
   */
  @Get('leaderboard/tvl')
  @ApiOperation({
    summary: 'Rank vaults by all-time high TVL watermark (descending)',
  })
  @ApiResponse({ status: 200, type: [VaultLeaderboardEntryDto] })
  getLeaderboard(): Promise<VaultLeaderboardEntryDto[]> {
    return this.vaultsService.getLeaderboard();
  }

  /**
   * Get a single vault by ID including TVL watermark data.
   * GET /api/v1/vaults/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get vault detail including TVL watermark' })
  @ApiParam({ name: 'id', description: 'Vault UUID' })
  @ApiResponse({ status: 200, type: VaultResponseDto })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<VaultResponseDto> {
    return this.vaultsService.findOne(id);
  }

  /**
   * Deposit into a vault and update TVL watermark if a new ATH is reached.
   * POST /api/v1/vaults/:id/deposit
   */
  @Post(':id/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deposit into a vault; updates TVL watermark if new ATH is reached',
  })
  @ApiParam({ name: 'id', description: 'Vault UUID' })
  @ApiBody({ type: DepositBodyDto })
  @ApiResponse({ status: 200, type: VaultResponseDto })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  deposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DepositBodyDto,
  ): Promise<VaultResponseDto> {
    return this.vaultsService.deposit(id, body.amount);
  }
}
