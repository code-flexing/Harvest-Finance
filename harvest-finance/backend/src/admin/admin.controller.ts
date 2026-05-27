import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { PlatformAnalyticsDto } from './dto/analytics.dto';
import { CreateVaultDto, UpdateVaultDto } from './dto/vault-crud.dto';
import { UpdateUserStatusDto } from './dto/user-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('Admin')
@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overall dashboard metrics' })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get platform analytics for charts' })
  @ApiResponse({ status: 200, type: PlatformAnalyticsDto })
  async getPlatformAnalytics(): Promise<PlatformAnalyticsDto> {
    return this.adminService.getPlatformAnalytics();
  }

  @Get('vaults')
  @ApiOperation({ summary: 'Get all vaults with detailed info' })
  @ApiResponse({ status: 200 })
  async getAllVaults(): Promise<any> {
    return this.adminService.getAllVaults();
  }

  @Post('vaults')
  @ApiOperation({ summary: 'Create a new vault' })
  @ApiResponse({ status: 201 })
  async createVault(
    @Body() createVaultDto: CreateVaultDto,
    @Request() req: any,
  ): Promise<any> {
    return this.adminService.createVault(createVaultDto, req.user.id);
  }

  @Patch('vaults/:id')
  @ApiOperation({ summary: 'Update an existing vault' })
  @ApiParam({ name: 'id', description: 'Vault ID' })
  @ApiResponse({ status: 200 })
  async updateVault(
    @Param('id') id: string,
    @Body() updateVaultDto: UpdateVaultDto,
  ): Promise<any> {
    return this.adminService.updateVault(id, updateVaultDto);
  }

  @Delete('vaults/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vault' })
  @ApiParam({ name: 'id', description: 'Vault ID' })
  @ApiResponse({ status: 204 })
  async deleteVault(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteVault(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with optional search filter' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search users by name, email, or role',
  })
  @ApiResponse({ status: 200 })
  async getAllUsers(@Query('search') search?: string): Promise<any[]> {
    return this.adminService.getAllUsers(search);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200 })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ): Promise<any> {
    return this.adminService.updateUserStatus(id, body.isActive);
  }

  @Get('users/activity')
  @ApiOperation({ summary: 'Get all user transactions/deposits' })
  @ApiResponse({ status: 200 })
  async getUserActivity(): Promise<any[]> {
    return this.adminService.getUserActivity();
  }
}
