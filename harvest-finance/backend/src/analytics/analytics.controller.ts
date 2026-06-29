import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ScoringService } from './scoring.service';

@Controller('vaults')
export class AnalyticsController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get(':id/score-breakdown')
  async getScoreBreakdown(@Param('id') id: string) {
    const breakdown = await this.scoringService.getVaultScoreBreakdown(id);
    if (!breakdown) {
      throw new NotFoundException('Vault not found');
    }
    return breakdown;
  }
}
