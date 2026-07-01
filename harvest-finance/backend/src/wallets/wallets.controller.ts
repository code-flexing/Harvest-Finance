import {
  Controller,
  Post,
  Get,
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
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustodialWalletService } from './custodial-wallet.service';
import { ExportKeyDto } from './dto/export-key.dto';

@ApiTags('Custodial Wallet')
@Controller({
  path: 'wallets',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletsController {
  constructor(
    private readonly custodialWalletService: CustodialWalletService,
  ) {}

  /**
   * Get the authenticated user's wallet public key (if custodial).
   */
  @Get('custodial/info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get custodial wallet info',
    description:
      'Returns the Stellar public key for the authenticated user\'s platform-managed custodial wallet, if one exists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet info retrieved',
    schema: {
      type: 'object',
      properties: {
        public_key: { type: 'string', nullable: true, example: 'GXXXXXXXX...' },
        has_custodial_wallet: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCustodialWalletInfo(
    @Request() req: any,
  ): Promise<{ public_key: string | null; has_custodial_wallet: boolean }> {
    const userId = req.user.id;
    const publicKey = await this.custodialWalletService.getPublicKey(userId);
    return {
      public_key: publicKey,
      has_custodial_wallet: publicKey !== null,
    };
  }

  /**
   * Export the user's Stellar private key (custodial wallets only).
   *
   * Strictly rate-limited to 3 attempts per hour to deter brute-force.
   */
  @Post('custodial/export-key')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 3, ttl: 3600000 } })
  @ApiOperation({
    summary: 'Export custodial private key',
    description:
      'Decrypts and returns the Stellar secret key for the authenticated user\'s custodial wallet. ' +
      'Requires the user\'s current plaintext password for decryption. ' +
      'The returned key can be imported into any Stellar wallet (e.g. Freighter, Albedo) for self-custody.',
  })
  @ApiBody({ type: ExportKeyDto })
  @ApiResponse({
    status: 200,
    description: 'Private key decrypted and returned.',
    schema: {
      type: 'object',
      properties: {
        secret_key: {
          type: 'string',
          example: 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          description: 'Stellar secret key (S-address). Keep this private!',
        },
        warning: {
          type: 'string',
          example:
            'Store this key securely and never share it. Anyone with this key controls your wallet.',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  @ApiResponse({ status: 404, description: 'No custodial wallet found' })
  @ApiResponse({ status: 429, description: 'Too many export attempts' })
  async exportPrivateKey(
    @Request() req: any,
    @Body() exportKeyDto: ExportKeyDto,
  ): Promise<{ secret_key: string; warning: string }> {
    const userId = req.user.id;
    const secretKey = await this.custodialWalletService.exportPrivateKey(
      userId,
      exportKeyDto.password,
    );

    return {
      secret_key: secretKey,
      warning:
        'Store this key securely and never share it. Anyone with this key has full control of your wallet funds.',
    };
  }
}
