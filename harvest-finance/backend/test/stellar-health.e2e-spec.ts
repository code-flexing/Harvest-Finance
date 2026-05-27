import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { StellarController } from '../src/stellar/stellar.controller';
import { StellarService } from '../src/stellar/services/stellar.service';

describe('GET /stellar/health (e2e)', () => {
  let app: INestApplication;
  const mockStellarService = { verifyConnection: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StellarController],
      providers: [{ provide: StellarService, useValue: mockStellarService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  it('returns connected:true when Stellar server is reachable', async () => {
    mockStellarService.verifyConnection.mockResolvedValue(true);

    const { body } = await request(app.getHttpServer())
      .get('/stellar/health')
      .expect(200);

    expect(body.connected).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  it('returns connected:false when Stellar server is unreachable', async () => {
    mockStellarService.verifyConnection.mockResolvedValue(false);

    const { body } = await request(app.getHttpServer())
      .get('/stellar/health')
      .expect(200);

    expect(body.connected).toBe(false);
    expect(body.timestamp).toBeDefined();
  });
});
