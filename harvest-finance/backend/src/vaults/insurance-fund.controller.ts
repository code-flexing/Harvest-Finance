import { Controller, Post, Body, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { InsuranceFundService } from './insurance-fund.service';
import { JwtAuthGuard as AuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

/**
 * Controller exposing insurance fund management endpoints.
 *
 * - POST /insurance-fund/deposit   -> depositToFund (userId from body)
 * - GET  /insurance-fund/coverage  -> getCoverageRatio
 * - POST /insurance-fund/incident/:adminId   -> processIncident (admin only)
 */
@UseGuards(AuthGuard)
@Controller('insurance-fund')
export class InsuranceFundController {
  constructor(private readonly insuranceFundService: InsuranceFundService) {}

  @Post('deposit')
  async depositToFund(@Body() body: { userId: string; amount: number }) {
    const { userId, amount } = body;
    if (!userId || typeof amount !== 'number') {
      throw new BadRequestException('Invalid deposit payload');
    }
    return this.insuranceFundService.depositToFund(userId, amount);
  }

  @Get('coverage')
  async getCoverage() {
    return { coverageRatio: await this.insuranceFundService.getCoverageRatio() };
  }

  @Post('incident/:adminId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async processIncident(
    @Param('adminId') adminId: string,
    @Body() losses: Record<string, number>,
  ) {
    return this.insuranceFundService.processIncident(adminId, losses);
  }
}
