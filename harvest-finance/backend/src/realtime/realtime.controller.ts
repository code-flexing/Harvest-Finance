import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('Realtime Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'realtime',
  version: '1',
})
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  /** Admin: current platform-wide KPI snapshot */
  @Get('platform')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get live platform metrics snapshot (admin)' })
  getPlatformMetrics() {
    return this.realtimeService.getPlatformMetrics();
  }

  /** Farmer: their own KPI snapshot */
  @Get('farmer/:userId')
  @ApiOperation({ summary: 'Get live farmer KPI snapshot' })
  getFarmerMetrics(@Param('userId') userId: string, @Request() req: any) {
    // Allow admins to query any user; farmers can only query themselves
    const requesterId: string = req.user.id;
    const role: UserRole = req.user.role;
    const targetId = role === UserRole.ADMIN ? userId : requesterId;
    return this.realtimeService.getFarmerMetrics(targetId);
  }
}
