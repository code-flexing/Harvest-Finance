import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AppStatusResponseDto } from './app/dto/app-status-response.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({
    type: AppStatusResponseDto,
    description: 'Application status message',
  })
  getHello(): AppStatusResponseDto {
    return this.appService.getHello();
  }
}
