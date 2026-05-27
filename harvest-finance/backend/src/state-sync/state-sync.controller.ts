import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StateSyncService } from './state-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('state-sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'state-sync',
  version: '1',
})
export class StateSyncController {
  constructor(private readonly stateSyncService: StateSyncService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get last sync status and per-vault drift report' })
  getStatus() {
    return this.stateSyncService.status();
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a state sync run' })
  async trigger() {
    const results = await this.stateSyncService.runSync();
    return { triggered: true, results };
  }
}
