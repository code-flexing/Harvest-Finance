import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';

@Global()
@Module({
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
