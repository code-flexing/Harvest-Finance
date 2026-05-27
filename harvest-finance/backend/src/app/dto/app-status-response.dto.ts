import { ApiProperty } from '@nestjs/swagger';

/** Response DTO for the root GET / endpoint. */
export class AppStatusResponseDto {
  /** Human-readable greeting or status message returned by the application. */
  @ApiProperty({
    example: 'Hello World!',
    description: 'Application status message',
  })
  message: string;
}
