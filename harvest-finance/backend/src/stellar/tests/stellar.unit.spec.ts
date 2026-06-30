import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from '../services/stellar.service';
import { SecretsService } from '../../common/secrets/secrets.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomLoggerService } from '../../logger/custom-logger.service';
import { StellarClientService } from '../services/stellar-client.service';

describe('StellarService (unit)', () => {
  let service: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: StellarClientService, useValue: {} },
        {
          provide: SecretsService,
          useValue: {
            getSecret: (key: string) =>
              Promise.resolve(
                key === 'STELLAR_PLATFORM_SECRET_KEY'
                  ? 'STESTSECRETKEY'
                  : undefined,
              ),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'STELLAR_NETWORK') return 'testnet';
              if (key === 'STELLAR_PLATFORM_PUBLIC_KEY')
                return 'GTESTPUBLICKEY';
              return undefined;
            },
            getOrThrow: (key: string) => {
              if (key === 'STELLAR_PLATFORM_PUBLIC_KEY')
                return 'GTESTPUBLICKEY';
              throw new Error(`Config ${key} not found`);
            },
          },
        },
        {
          provide: CustomLoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    await module.init();
    service = module.get<StellarService>(StellarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
