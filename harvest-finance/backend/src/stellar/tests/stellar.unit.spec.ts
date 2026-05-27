import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from '../services/stellar.service';
import { SecretsService } from '../../common/secrets/secrets.service';

describe('StellarService (unit)', () => {
  let service: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
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
      ],
    }).compile();

    await module.init();
    service = module.get<StellarService>(StellarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
