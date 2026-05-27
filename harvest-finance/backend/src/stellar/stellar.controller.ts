import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StellarService } from './services/stellar.service';
import {
  CreateEscrowDto,
  ReleasePaymentDto,
  RefundDto,
  SetupMultiSigDto,
  StellarTransactionStatusDto,
} from './dto/stellar.dto';
import {
  DecodedHistoryPageDto,
  StellarHistoryPageDto,
  StellarHistoryQueryDto,
} from './dto/stellar-history.dto';

@ApiTags('Stellar')
@Controller('stellar')
export class StellarController {
  constructor(private readonly stellarService: StellarService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Check the health of the Stellar Horizon connection',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection status and server timestamp',
    schema: {
      example: { connected: true, timestamp: '2026-04-24T12:00:00.000Z' },
    },
  })
  async checkHealth() {
    const connected = await this.stellarService.verifyConnection();
    return { connected, timestamp: new Date().toISOString() };
  }

  @Get('account/:publicKey')
  @ApiOperation({
    summary:
      'Load a Stellar account overview (native balance, signers, thresholds)',
  })
  @ApiParam({ name: 'publicKey', description: 'Stellar G-address (56 chars)' })
  @ApiResponse({ status: 200, description: 'Account info' })
  @ApiResponse({
    status: 400,
    description: 'Invalid public key or account not found',
  })
  async getAccount(@Param('publicKey') publicKey: string) {
    return this.stellarService.getAccountInfo(publicKey);
  }

  @Get('account/:publicKey/balances')
  @ApiOperation({
    summary: 'List every asset balance for a Stellar account',
    description:
      'Returns native XLM plus all trustline balances; useful for portfolio aggregators.',
  })
  @ApiParam({ name: 'publicKey', description: 'Stellar G-address (56 chars)' })
  @ApiResponse({ status: 200, description: 'Per-asset balances' })
  async getAccountBalances(@Param('publicKey') publicKey: string) {
    return this.stellarService.getAccountBalances(publicKey);
  }

  @Get('account/:publicKey/transactions')
  @ApiOperation({
    summary: 'Paginated transaction history for a Stellar account',
    description:
      'Returns the account transaction history from Horizon with skip/limit pagination. ' +
      'Use `limit` (1-200) to bound the response size and `skip` to page through older records.',
  })
  @ApiParam({ name: 'publicKey', description: 'Stellar G-address (56 chars)' })
  @ApiResponse({ status: 200, type: StellarHistoryPageDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid public key or pagination parameters',
  })
  async getAccountTransactions(
    @Param('publicKey') publicKey: string,
    @Query() query: StellarHistoryQueryDto,
  ): Promise<StellarHistoryPageDto> {
    return this.stellarService.getAccountTransactions(
      publicKey,
      query.skip ?? 0,
      query.limit ?? 20,
      query.order ?? 'desc',
    );
  }

  @Get('account/:publicKey/transactions/decoded')
  @ApiOperation({
    summary: 'Decoded transaction history for a Stellar account',
    description:
      'Decodes XDR envelopes to provide human-readable operation details.',
  })
  @ApiParam({ name: 'publicKey', description: 'Stellar G-address' })
  @ApiResponse({ status: 200, type: DecodedHistoryPageDto })
  async getDecodedAccountTransactions(
    @Param('publicKey') publicKey: string,
    @Query() query: StellarHistoryQueryDto,
  ): Promise<DecodedHistoryPageDto> {
    const result = await this.stellarService.getDecodedAccountTransactions(
      publicKey,
      query.skip ?? 0,
      query.limit ?? 20,
      query.order ?? 'desc',
    );
    return result as DecodedHistoryPageDto;
  }

  @Get('fee')
  @ApiOperation({
    summary: 'Estimate the current network base fee for N operations',
  })
  @ApiResponse({ status: 200, description: 'Fee estimate in XLM and stroops' })
  async estimateFee(@Query('operations') ops?: string) {
    return this.stellarService.estimateFee(ops ? parseInt(ops, 10) : 1);
  }

  @Post('escrow')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a claimable-balance escrow for an order' })
  @ApiBody({ type: CreateEscrowDto })
  @ApiResponse({ status: 201, description: 'Escrow created' })
  @ApiResponse({
    status: 400,
    description: 'Validation or Stellar network error',
  })
  async createEscrow(@Body() dto: CreateEscrowDto) {
    return this.stellarService.createEscrow(dto);
  }

  @Post('escrow/release')
  @ApiOperation({ summary: 'Release escrow funds to the farmer' })
  @ApiBody({ type: ReleasePaymentDto })
  @ApiResponse({ status: 200, description: 'Payment released' })
  async releasePayment(@Body() dto: ReleasePaymentDto) {
    return this.stellarService.releasePayment(dto);
  }

  @Post('escrow/refund')
  @ApiOperation({ summary: 'Refund an expired escrow back to the buyer' })
  @ApiBody({ type: RefundDto })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async refundEscrow(@Body() dto: RefundDto) {
    return this.stellarService.refundEscrow(dto);
  }

  @Get('escrow/:publicKey')
  @ApiOperation({ summary: 'List claimable-balance escrows for an account' })
  @ApiParam({ name: 'publicKey', description: 'Claimant public key' })
  async getEscrows(@Param('publicKey') publicKey: string) {
    return this.stellarService.getClaimableBalances(publicKey);
  }

  @Get('transaction/:hash')
  @ApiOperation({
    summary: 'Fetch the status of a Stellar transaction by hash',
  })
  @ApiParam({ name: 'hash', description: 'Transaction hash (hex)' })
  @ApiResponse({
    status: 200,
    description: 'Detailed transaction status',
    type: StellarTransactionStatusDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transaction hash or Stellar error',
  })
  async getTransaction(
    @Param('hash') hash: string,
  ): Promise<StellarTransactionStatusDto> {
    return this.stellarService.getTransactionStatus(hash);
  }

  @Post('multisig')
  @ApiOperation({
    summary: 'Configure multi-signature thresholds for a Stellar account',
  })
  @ApiBody({ type: SetupMultiSigDto })
  async setupMultiSig(@Body() dto: SetupMultiSigDto) {
    return this.stellarService.setupMultiSigAccount(dto);
  }
}
