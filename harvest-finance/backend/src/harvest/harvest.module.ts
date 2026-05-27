import { Module } from '@nestjs/common';
import { HarvestService } from './harvest.service';
import { HarvestSchedulerService } from './harvest-scheduler.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [HarvestService, HarvestSchedulerService],
  exports: [HarvestService],
})
export class HarvestModule {}
