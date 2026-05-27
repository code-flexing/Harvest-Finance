import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { FarmVaultsService } from './farm-vaults.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateFarmVaultDto {
  @IsString()
  name: string;

  @IsUUID()
  cropCycleId: string;

  @IsNumber()
  @Min(0)
  targetAmount: number;
}

class FarmVaultAmountDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}

@ApiTags('Farm Vaults')
@Controller({
  path: 'farm-vaults',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FarmVaultsController {
  constructor(private readonly farmVaultsService: FarmVaultsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a personal farm savings vault' })
  async createVault(@Request() req: any, @Body() data: CreateFarmVaultDto) {
    return this.farmVaultsService.createVault(req.user.id, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all personal farm vaults for the user' })
  async getUserVaults(@Request() req: any) {
    return this.farmVaultsService.getUserVaults(req.user.id);
  }

  @Post(':id/deposit')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Deposit funds into a personal farm vault' })
  async deposit(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: FarmVaultAmountDto,
  ) {
    return this.farmVaultsService.deposit(id, req.user.id, body.amount);
  }

  @Post(':id/withdraw')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Withdraw funds from a personal farm vault' })
  async withdraw(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: FarmVaultAmountDto,
  ) {
    return this.farmVaultsService.withdraw(id, req.user.id, body.amount);
  }

  @Get('crop-cycles')
  @ApiOperation({ summary: 'Get all available crop cycles' })
  async getCropCycles() {
    return this.farmVaultsService.getCropCycles();
  }
}
