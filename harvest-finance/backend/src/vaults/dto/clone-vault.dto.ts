import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CloneVaultDto {
  @ApiPropertyOptional({
    example: 'Corn High Yield Vault (Copy)',
    description:
      'Optional name for the cloned vault. Defaults to "{source name} (Copy)".',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vaultName?: string;
}
