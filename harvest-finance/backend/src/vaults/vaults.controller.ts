import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
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
import { Throttle } from '@nestjs/throttler';
import { VaultsService } from './vaults.service';
import { DepositDto } from './dto/deposit.dto';
import { BatchDepositDto } from './dto/batch-deposit.dto';
import {
  BatchDepositResponseDto,
  DepositVaultResponseDto,
  VaultResponseDto,
} from './dto/vault-response.dto';
import { DepositEventResponseDto } from './dto/deposit-event-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vaults')
@Controller({
  path: 'vaults',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  @Post('deposits/batch')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit multiple deposits atomically' })
  @ApiBody({ type: BatchDepositDto })
  @ApiResponse({
    status: 200,
    description: 'Batch deposit processed successfully',
    type: BatchDepositResponseDto,
  })
  async batchDeposit(
    @Body() dto: BatchDepositDto,
    @Request() req: any,
  ): Promise<BatchDepositResponseDto> {
    return this.vaultsService.batchDepositToVaults(req.user.id, dto);
  }

  @Post(':vaultId/deposit')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
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
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async depositToVault(
    @Param('vaultId') vaultId: string,
    @Body() depositDto: DepositDto,
    @Request() req: any,
  ): Promise<DepositVaultResponseDto> {
    const secureDepositDto = { ...depositDto, userId: req.user.id };
    return this.vaultsService.depositToVault(vaultId, secureDepositDto);
  }

  @Post(':vaultId/withdraw')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw funds from a vault' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { amount: { type: 'number', example: 100 } },
    },
  })
  @ApiResponse({ status: 200, description: 'Withdrawal successful' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid amount or insufficient balance',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async withdrawFromVault(
    @Param('vaultId') vaultId: string,
    @Body('amount') amount: number,
    @Request() req: any,
  ): Promise<any> {
    return this.vaultsService.withdrawFromVault(vaultId, req.user.id, amount);
  }

  @Get('deposits/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authenticated user deposit event history' })
  @ApiResponse({
    status: 200,
    description: 'Deposit event history retrieved successfully',
    type: [DepositEventResponseDto],
  })
  async getUserDepositHistory(
    @Request() req: any,
    @Query('vaultId') vaultId?: string,
  ): Promise<DepositEventResponseDto[]> {
    return this.vaultsService.getUserDepositEventHistory(req.user.id, vaultId);
  }

  @Get('deposits/:depositId/events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get append-only event log for a deposit' })
  @ApiParam({
    name: 'depositId',
    description: 'Deposit ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit events retrieved successfully',
    type: [DepositEventResponseDto],
  })
  async getDepositEventHistory(
    @Param('depositId') depositId: string,
  ): Promise<DepositEventResponseDto[]> {
    return this.vaultsService.getDepositEventHistory(depositId);
  }

  @Get(':vaultId/deposit-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get append-only deposit event history for a vault' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Vault deposit event history retrieved successfully',
    type: [DepositEventResponseDto],
  })
  async getVaultDepositHistory(
    @Param('vaultId') vaultId: string,
  ): Promise<DepositEventResponseDto[]> {
    return this.vaultsService.getVaultDepositEventHistory(vaultId);
  }

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
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async getVaultById(
    @Param('vaultId') vaultId: string,
  ): Promise<VaultResponseDto> {
    const vault = await this.vaultsService.getVaultById(vaultId);
    return this.vaultsService.mapVaultToResponse(vault);
  }

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
  }

  @Get('metadata')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get vault metadata (names, symbols, asset pairs)' })
  @ApiResponse({
    status: 200,
    description: 'Vault metadata retrieved successfully',
  })
  async getVaultsMetadata(): Promise<any[]> {
    return this.vaultsService.getVaultsMetadata();
  }

  @Get('apy-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get APY history for vaults' })
  @ApiResponse({
    status: 200,
    description: 'APY history retrieved successfully',
  })
  async getApyHistory(
    @Query('vaultId') vaultId?: string,
    @Query('timeRange') timeRange: string = '30d',
  ): Promise<any[]> {
    return this.vaultsService.getApyHistory(vaultId, timeRange);
  }

  @Post(':vaultId/multi-signature-config')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update multi-signature configuration for a vault' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        requiresMultiSignature: { type: 'boolean', example: true },
        approvalThreshold: { type: 'number', example: 2 },
      },
      required: ['requiresMultiSignature', 'approvalThreshold'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-signature configuration updated successfully',
    type: VaultResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Only vault owner or admin can update configuration',
  })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async updateVaultMultiSignatureConfig(
    @Param('vaultId') vaultId: string,
    @Body('requiresMultiSignature') requiresMultiSignature: boolean,
    @Body('approvalThreshold') approvalThreshold: number,
    @Request() req: any,
  ): Promise<VaultResponseDto> {
    return this.vaultsService.updateVaultMultiSignatureConfig(
      vaultId,
      req.user.id,
      requiresMultiSignature,
      approvalThreshold,
    );
  }

  @Post(':vaultId/request-approval')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request approval from another user for vault operations' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        approverUserId: { type: 'string', example: '456e7890-e89b-12d3-a456-426614174111' },
      },
      required: ['approverUserId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Approval request sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid approver or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Only vault owner or admin can request approvals',
  })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async requestVaultApproval(
    @Param('vaultId') vaultId: string,
    @Body('approverUserId') approverUserId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.vaultsService.requestVaultApproval(
      vaultId,
      req.user.id,
      approverUserId,
    );
  }

  @Post(':vaultId/approve')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve vault operations' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Vault operation approved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No pending approval request found or invalid state',
  })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async approveVaultOperation(
    @Param('vaultId') vaultId: string,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    return this.vaultsService.approveVaultOperation(vaultId, req.user.id);
  }

  @Post(':vaultId/pause')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a vault (freeze operations)' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Vault paused successfully',
    type: VaultResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Vault is already paused',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Only vault owner or admin can pause vault',
  })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async pauseVault(
    @Param('vaultId') vaultId: string,
    @Request() req: any,
  ): Promise<VaultResponseDto> {
    return this.vaultsService.pauseVault(vaultId, req.user.id);
  }

  @Post(':vaultId/resume')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused vault' })
  @ApiParam({
    name: 'vaultId',
    description: 'Vault ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Vault resumed successfully',
    type: VaultResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Vault is not paused',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Only vault owner or admin can resume vault',
  })
  @ApiResponse({ status: 404, description: 'Vault not found' })
  async resumeVault(
    @Param('vaultId') vaultId: string,
    @Request() req: any,
  ): Promise<VaultResponseDto> {
    return this.vaultsService.resumeVault(vaultId, req.user.id);
  }
}
