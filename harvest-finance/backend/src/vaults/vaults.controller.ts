 feat/withdraw-api
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
=======
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { VaultsService } from './vaults.service';
import { DepositDto } from './dto/deposit.dto';
import { 
  DepositVaultResponseDto, 
  VaultResponseDto 
} from './dto/vault-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vaults')
@Controller('api/v1/vaults')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  /**
   * Deposit funds into a vault
   */
  @Post(':vaultId/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit funds into a vault' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: DepositDto })
  @ApiResponse({
    status: 200,
    description: 'Deposit successful',
    type: DepositVaultResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid amount or vault capacity',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Vault not found',
  })
  async depositToVault(
    @Param('vaultId') vaultId: string,
    @Body() depositDto: DepositDto,
    @Request() req: any,
  ): Promise<DepositVaultResponseDto> {
    // Override userId from authenticated user for security
    const secureDepositDto = {
      ...depositDto,
      userId: req.user.id,
    };

    return this.vaultsService.depositToVault(vaultId, secureDepositDto);
  }

  /**
   * Get all vaults for the authenticated user
   */
  @Get('my-vaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all vaults for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'User vaults retrieved successfully',
    type: [VaultResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getMyVaults(@Request() req: any): Promise<VaultResponseDto[]> {
    return this.vaultsService.getUserVaults(req.user.id);
  }

  /**
   * Get vault by ID
   */
  @Get(':vaultId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get vault by ID' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Vault retrieved successfully',
    type: VaultResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Vault not found',
  })
  async getVaultById(
    @Param('vaultId') vaultId: string,
  ): Promise<VaultResponseDto> {
    const vault = await this.vaultsService.getVaultById(vaultId);
    return this.vaultsService.mapVaultToResponse(vault);
  }

  /**
   * Get all public vaults
   */
  @Get('public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all public vaults' })
  @ApiResponse({
    status: 200,
    description: 'Public vaults retrieved successfully',
    type: [VaultResponseDto],
  })
  async getPublicVaults(): Promise<VaultResponseDto[]> {
    return this.vaultsService.getPublicVaults();
main
  }
}
