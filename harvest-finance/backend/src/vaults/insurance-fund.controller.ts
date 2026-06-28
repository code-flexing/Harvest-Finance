import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InsuranceFundService, InsuranceFundStats } from './insurance-fund.service';
import { JwtAuthGuard as AuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { InsuranceClaimStatus } from '../database/entities/insurance-claim.entity';

class DepositToFundDto {
  userId: string;
  amount: number;
}

class DeclareIncidentDto {
  vaultId: string;
  lossAmount: number;
  description: string;
}

class ProcessPayoutDto {
  losses: Record<string, number>;
  reason?: string;
}

@Controller('insurance-fund')
@UseGuards(AuthGuard)
export class InsuranceFundController {
  constructor(private readonly insuranceFundService: InsuranceFundService) {}

  @Post('deposit')
  async depositToFund(@Body() body: DepositToFundDto) {
    if (!body.userId || typeof body.amount !== 'number') {
      throw new BadRequestException('userId and amount are required');
    }
    return this.insuranceFundService.depositToFund(body.userId, body.amount);
  }

  @Get('coverage')
  async getCoverage() {
    return { coverageRatio: await this.insuranceFundService.getCoverageRatio() };
  }

  @Get('stats')
  async getStats(): Promise<InsuranceFundStats> {
    return this.insuranceFundService.getStats();
  }

  @Get('balance')
  async getBalance() {
    const balance = await this.insuranceFundService.getInsuranceFundBalance();
    return { fundBalance: balance };
  }

  @Get('escrow')
  async getEscrowDetails() {
    return this.insuranceFundService.getEscrowDetails();
  }

  @Get('claims')
  async getAllClaims() {
    return this.insuranceFundService.getAllClaims();
  }

  @Get('claims/user/:userId')
  async getUserClaims(@Param('userId') userId: string) {
    return this.insuranceFundService.getUserClaims(userId);
  }

  @Get('claims/status/:status')
  async getClaimsByStatus(@Param('status') status: InsuranceClaimStatus) {
    return this.insuranceFundService.getClaimsByStatus(status);
  }

  @Get('claims/:claimId')
  async getClaim(@Param('claimId') claimId: string) {
    return this.insuranceFundService.getClaimById(claimId);
  }

  @Get('audit')
  async getAuditTrail(@Param('vaultId') vaultId?: string) {
    return this.insuranceFundService.getAuditTrail(vaultId);
  }

  @Post('incident')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async declareIncident(
    @Body() body: DeclareIncidentDto,
    @Body('adminId') adminId: string,
    @Body('adminRole') adminRole: UserRole,
  ) {
    return this.insuranceFundService.declareIncident(adminId, adminRole, body);
  }

  @Post('payout')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async processPayout(
    @Body() body: ProcessPayoutDto,
    @Body('adminId') adminId: string,
    @Body('adminRole') adminRole: UserRole,
  ) {
    return this.insuranceFundService.processIncident(adminId, adminRole, body.losses, body.reason);
  }

  @Post('claims/:claimId/finalize')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async finalizeClaim(
    @Param('claimId') claimId: string,
    @Body('adminId') adminId: string,
    @Body('adminRole') adminRole: UserRole,
  ) {
    return this.insuranceFundService.finalizeClaim(claimId, adminId, adminRole);
  }
}