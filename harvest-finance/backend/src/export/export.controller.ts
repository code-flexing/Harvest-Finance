import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  Request,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportService } from './export.service';
import { UserRole } from '../database/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Export')
@Controller({
  path: 'export',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * User-side export: GET /api/v1/export/users/:userId/vault/export
   */
  @Get('users/:userId/vault/export')
  @ApiOperation({ summary: 'Export vault data for a user' })
  @ApiQuery({ name: 'format', enum: ['csv', 'excel', 'pdf'], required: true })
  @ApiResponse({ status: 200, description: 'File download initiated' })
  async exportUserVault(
    @Param('userId') userId: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Check authorization: user can only export their own data, admins can export anyone
    if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only export your own vault data');
    }

    const data = await this.exportService.getTransactionData(userId);

    if (format === 'excel') {
      const buffer = await this.exportService.generateExcel(data);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=vault_export_${userId}_${Date.now()}.xlsx`,
      );
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = await this.exportService.generatePdf(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=vault_export_${userId}_${Date.now()}.pdf`,
      );
      return res.send(buffer);
    } else {
      const csv = await this.exportService.generateCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=vault_export_${userId}_${Date.now()}.csv`,
      );
      return res.send(csv);
    }
  }

  /**
   * User-side transactions export: GET /api/v1/export/users/:userId/transactions
   */
  @Get('users/:userId/transactions')
  @ApiOperation({ summary: 'Export transaction history for a user' })
  @ApiQuery({ name: 'format', enum: ['csv', 'excel', 'pdf'], required: true })
  @ApiResponse({ status: 200, description: 'File download initiated' })
  async exportUserTransactions(
    @Param('userId') userId: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Check authorization: user can only export their own data, admins can export anyone
    if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You can only export your own transaction history',
      );
    }

    const data = await this.exportService.getTransactionData(userId);

    if (format === 'excel') {
      const buffer = await this.exportService.generateExcel(data);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=transactions_${userId}_${Date.now()}.xlsx`,
      );
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = await this.exportService.generatePdf(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=transactions_${userId}_${Date.now()}.pdf`,
      );
      return res.send(buffer);
    } else {
      const csv = await this.exportService.generateCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=transactions_${userId}_${Date.now()}.csv`,
      );
      return res.send(csv);
    }
  }

  /**
   * Admin-side export: GET /api/v1/export/admin/vault/export
   */
  @Get('admin/vault/export')
  @ApiOperation({ summary: 'Export all vault data (Admin only)' })
  @ApiQuery({ name: 'format', enum: ['csv', 'excel', 'pdf'], required: true })
  @ApiResponse({ status: 200, description: 'File download initiated' })
  async exportAllVaults(
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Check admin role
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can export all vault data');
    }

    const data = await this.exportService.getTransactionData();

    if (format === 'excel') {
      const buffer = await this.exportService.generateExcel(data);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=admin_vault_export_${Date.now()}.xlsx`,
      );
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = await this.exportService.generatePdf(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=admin_vault_export_${Date.now()}.pdf`,
      );
      return res.send(buffer);
    } else {
      const csv = await this.exportService.generateCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=admin_vault_export_${Date.now()}.csv`,
      );
      return res.send(csv);
    }
  }

  /**
   * Admin-side export: GET /api/v1/export/admin/transactions
   */
  @Get('admin/transactions')
  @ApiOperation({ summary: 'Export all transactions (Admin only)' })
  @ApiQuery({ name: 'format', enum: ['csv', 'excel', 'pdf'], required: true })
  @ApiResponse({ status: 200, description: 'File download initiated' })
  async exportAllTransactions(
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Check admin role
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can export all transactions');
    }

    const data = await this.exportService.getTransactionData();

    if (format === 'excel') {
      const buffer = await this.exportService.generateExcel(data);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=admin_transactions_${Date.now()}.xlsx`,
      );
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = await this.exportService.generatePdf(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=admin_transactions_${Date.now()}.pdf`,
      );
      return res.send(buffer);
    } else {
      const csv = await this.exportService.generateCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=admin_transactions_${Date.now()}.csv`,
      );
      return res.send(csv);
    }
  }
}
