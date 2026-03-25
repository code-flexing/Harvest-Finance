import { Controller, Post, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VaultsService } from './vaults.service';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Vaults')
@Controller('vaults')
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  @Post(':vaultId/withdraw')
  @ApiOperation({ summary: 'Withdraw tokens from a vault' })
  @ApiResponse({ status: 201, description: 'Withdrawal successful' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient balance/liquidity' })
  @ApiResponse({ status: 404, description: 'Vault or user deposit not found' })
  async withdraw(
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.vaultsService.withdraw(vaultId, withdrawDto);
  }
}
