import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MultiChainYieldsDto } from './dto/multi-chain.dto';
import { MultiChainService } from './multi-chain.service';

@ApiTags('Multi-chain')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'multi-chain',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MultiChainController {
  constructor(private readonly service: MultiChainService) {}

  @Get('yields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Aggregate yield-bearing positions for the authenticated user across all registered chains',
    description:
      'Currently Stellar is the only registered chain. The response shape is designed so additional chains slot in without breaking clients — any failing chain is reported under `errors` while the rest of the data is returned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cross-chain yields aggregated',
    type: MultiChainYieldsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — invalid or missing token',
  })
  async getYields(
    @Request() req: { user: { id: string } },
  ): Promise<MultiChainYieldsDto> {
    return this.service.getCrossChainYields(req.user.id);
  }
}
