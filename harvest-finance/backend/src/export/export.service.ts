import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import { Reward, RewardStatus } from '../database/entities/reward.entity';
import { User, UserRole } from '../database/entities/user.entity';
import * as fastCsv from 'fast-csv';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';

export interface TransactionExportData {
  date: string;
  type: 'Deposit' | 'Withdraw' | 'Reward';
  vault: string;
  amount: string;
  status: string;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Aggregate transactions for a user or all users (admin)
   */
  async getTransactionData(userId?: string): Promise<TransactionExportData[]> {
    const data: TransactionExportData[] = [];

    // 1. Fetch Deposits
    const depositQuery = this.depositRepository
      .createQueryBuilder('deposit')
      .leftJoinAndSelect('deposit.vault', 'vault')
      .orderBy('deposit.createdAt', 'DESC');

    if (userId) {
      depositQuery.where('deposit.userId = :userId', { userId });
    }

    const deposits = await depositQuery.getMany();
    deposits.forEach((d) => {
      data.push({
        date: d.createdAt.toISOString(),
        type: 'Deposit',
        vault: d.vault?.vaultName || d.vaultId,
        amount: d.amount.toString(),
        status: d.status,
      });
    });

    // 2. Fetch Withdrawals
    const withdrawalQuery = this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .leftJoinAndSelect('withdrawal.vault', 'vault')
      .orderBy('withdrawal.createdAt', 'DESC');

    if (userId) {
      withdrawalQuery.where('withdrawal.userId = :userId', { userId });
    }

    const withdrawals = await withdrawalQuery.getMany();
    withdrawals.forEach((w) => {
      data.push({
        date: w.createdAt.toISOString(),
        type: 'Withdraw',
        vault: w.vault?.vaultName || w.vaultId,
        amount: w.amount.toString(),
        status: w.status,
      });
    });

    // 3. Fetch Rewards (Claimed)
    const rewardQuery = this.rewardRepository
      .createQueryBuilder('reward')
      .leftJoinAndSelect('reward.vault', 'vault')
      .where('reward.status = :status', { status: RewardStatus.CLAIMED })
      .orderBy('reward.createdAt', 'DESC');

    if (userId) {
      rewardQuery.andWhere('reward.userId = :userId', { userId });
    }

    const rewards = await rewardQuery.getMany();
    rewards.forEach((r) => {
      data.push({
        date: r.claimedAt?.toISOString() || r.createdAt.toISOString(),
        type: 'Reward',
        vault: r.vault?.vaultName || r.vaultId,
        amount: r.accruedAmount.toString(),
        status: r.status,
      });
    });

    // Sort all by date descending
    return data.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  /**
   * Generate CSV from transaction data
   */
  async generateCsv(data: TransactionExportData[]): Promise<string> {
    return new Promise((resolve, reject) => {
      let csvContent = '';
      const stream = fastCsv.format({ headers: true });

      stream.on('data', (chunk) => {
        csvContent += chunk.toString();
      });

      stream.on('end', () => {
        resolve(csvContent);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      data.forEach((row) => stream.write(row));
      stream.end();
    });
  }

  /**
   * Generate Excel buffer from transaction data
   */
  async generateExcel(data: TransactionExportData[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Transaction Type', key: 'type', width: 15 },
      { header: 'Vault / Token', key: 'vault', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEEEEE' },
    };

    data.forEach((row) => {
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  /**
   * Generate PDF buffer from transaction data
   */
  async generatePdf(data: TransactionExportData[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc
        .fillColor('#444444')
        .fontSize(20)
        .text('Harvest Finance - Transaction Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, {
        align: 'right',
      });
      doc.moveDown();

      // Table Header
      const tableTop = 150;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Date', 50, tableTop);
      doc.text('Type', 200, tableTop);
      doc.text('Vault', 270, tableTop);
      doc.text('Amount', 400, tableTop);
      doc.text('Status', 480, tableTop);

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table Rows
      let currentY = tableTop + 25;
      doc.font('Helvetica');

      data.forEach((row) => {
        if (currentY > 750) {
          doc.addPage();
          currentY = 50;
        }

        doc.text(new Date(row.date).toLocaleDateString(), 50, currentY);
        doc.text(row.type, 200, currentY);
        doc.text(row.vault, 270, currentY, { width: 120 });
        doc.text(`$${row.amount}`, 400, currentY);
        doc.text(row.status, 480, currentY);

        currentY += 20;
      });

      doc.end();
    });
  }
}
