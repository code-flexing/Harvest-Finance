import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiQueryHistoryService } from './ai-query-history.service';
import { CreateAiQueryHistoryDto, AiQueryHistoryResponseDto } from './dto/ai-query-history.dto';

@ApiTags('AI Query History')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai-query-history')
export class AiQueryHistoryController {
  constructor(private readonly historyService: AiQueryHistoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record an AI query', description: 'Saves an AI query and its response to the authenticated user\'s history.' })
  @ApiBody({ type: CreateAiQueryHistoryDto })
  @ApiResponse({ status: 201, description: 'Query recorded successfully', type: AiQueryHistoryResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Request() req, @Body() dto: CreateAiQueryHistoryDto) {
    return this.historyService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List AI query history', description: "Returns the authenticated user's AI query history, optionally filtered by a search term." })
  @ApiQuery({ name: 'search', required: false, description: 'Full-text search filter' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully', type: [AiQueryHistoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req, @Query('search') search?: string) {
    return this.historyService.findAll(req.user.id, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single AI query record', description: 'Returns a single AI query history record by ID, scoped to the authenticated user.' })
  @ApiParam({ name: 'id', description: 'Query history record ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Record retrieved successfully', type: AiQueryHistoryResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.historyService.findOne(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an AI query record', description: 'Deletes an AI query history record by ID, scoped to the authenticated user.' })
  @ApiParam({ name: 'id', description: 'Query history record ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  remove(@Request() req, @Param('id') id: string) {
    return this.historyService.remove(req.user.id, id);
  }
}
