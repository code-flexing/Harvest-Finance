import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { StellarService } from './services/stellar.service';
import { StellarController } from './stellar.controller';

@Module({
    imports: [ConfigModule, CommonModule],
    providers: [StellarService],
    controllers: [StellarController],
    exports: [StellarService],
})
export class StellarModule {}