import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import {
  ExportService,
  TransactionExportData,
} from './export.service';
import { Deposit } from '../database/entities/deposit.entity';
import { Withdrawal } from '../database/entities/withdrawal.entity';
import { Reward } from '../database/entities/reward.entity';
import { User } from '../database/entities/user.entity';

const EXPECTED_CSV_HEADERS = ['date', 'type', 'vault', 'amount', 'status'];

const EXPECTED_EXCEL_HEADERS = [
  'Date',
  'Transaction Type',
  'Vault / Token',
  'Amount',
  'Status',
];

const sampleData: TransactionExportData[] = [
  {
    date: '2026-01-15T10:00:00.000Z',
    type: 'Deposit',
    vault: 'USDC Vault',
    amount: '100.50',
    status: 'confirmed',
  },
  {
    date: '2026-01-14T08:30:00.000Z',
    type: 'Withdraw',
    vault: 'XLM Vault',
    amount: '50',
    status: 'pending',
  },
  {
    date: '2026-01-13T12:00:00.000Z',
    type: 'Reward',
    vault: 'USDC Vault',
    amount: '25.75',
    status: 'claimed',
  },
];

function parseCsvRows(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

async function readExcelRows(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet('Transactions');
  if (!worksheet) {
    throw new Error('Transactions worksheet not found');
  }

  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    rows.push(
      row.values
        .slice(1)
        .map((value) => (value == null ? '' : String(value))),
    );
  });
  return rows;
}

describe('ExportService file formats', () => {
  let service: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: getRepositoryToken(Deposit), useValue: {} },
        { provide: getRepositoryToken(Withdrawal), useValue: {} },
        { provide: getRepositoryToken(Reward), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  describe('generateCsv', () => {
    it('includes expected column headers and one row per transaction', async () => {
      const csv = await service.generateCsv(sampleData);
      const rows = parseCsvRows(csv);

      expect(rows.length).toBe(sampleData.length + 1);
      expect(rows[0]).toEqual(EXPECTED_CSV_HEADERS);
      expect(rows[1][0]).toBe(sampleData[0].date);
      expect(rows[1][1]).toBe(sampleData[0].type);
      expect(rows[2][2]).toBe(sampleData[1].vault);
    });

    it('returns empty output when data is empty', async () => {
      const csv = await service.generateCsv([]);

      expect(csv).toBe('');
    });
  });

  describe('generateExcel', () => {
    it('includes expected column headers and one row per transaction', async () => {
      const buffer = await service.generateExcel(sampleData);
      const rows = await readExcelRows(buffer);

      expect(rows.length).toBe(sampleData.length + 1);
      expect(rows[0]).toEqual(EXPECTED_EXCEL_HEADERS);
      expect(rows[1][0]).toBe(sampleData[0].date);
      expect(rows[1][1]).toBe(sampleData[0].type);
      expect(rows[2][3]).toBe(sampleData[1].amount);
    });

    it('returns header row only when data is empty', async () => {
      const buffer = await service.generateExcel([]);
      const rows = await readExcelRows(buffer);

      expect(rows.length).toBe(1);
      expect(rows[0]).toEqual(EXPECTED_EXCEL_HEADERS);
    });
  });

  describe('generatePdf', () => {
    it('produces a valid PDF buffer larger than an empty export', async () => {
      const emptyBuffer = await service.generatePdf([]);
      const buffer = await service.generatePdf(sampleData);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(buffer.toString('latin1').trimEnd()).toMatch(/%%EOF\s*$/);
      expect(buffer.length).toBeGreaterThan(emptyBuffer.length);
    });

    it('produces a valid PDF when data is empty', async () => {
      const buffer = await service.generatePdf([]);

      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(buffer.toString('latin1')).toContain('PDFKit');
      expect(buffer.toString('latin1').trimEnd()).toMatch(/%%EOF\s*$/);
    });
  });
});
