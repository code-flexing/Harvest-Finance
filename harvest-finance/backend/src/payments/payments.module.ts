import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FIAT_ON_RAMP_PROVIDER } from './interfaces/fiat-on-ramp-provider.interface';
import { PaymentService } from './payment.service';
import { MockFiatOnRampProvider } from './providers/mock-fiat-on-ramp.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    MockFiatOnRampProvider,
    {
      provide: FIAT_ON_RAMP_PROVIDER,
      useFactory: (
        configService: ConfigService,
        mockProvider: MockFiatOnRampProvider,
      ) => {
        const provider = configService.get<string>(
          'PAYMENTS_ONRAMP_PROVIDER',
          'mock',
        );

        switch (provider.toLowerCase()) {
          case 'mock':
            return mockProvider;
          default:
            throw new Error(
              `Unsupported PAYMENTS_ONRAMP_PROVIDER: ${provider}. ` +
                'Register a new provider implementation and add it to PaymentsModule.',
            );
        }
      },
      inject: [ConfigService, MockFiatOnRampProvider],
    },
    PaymentService,
  ],
  exports: [PaymentService],
})
export class PaymentsModule {}
