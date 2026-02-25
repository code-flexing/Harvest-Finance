import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { DeliveryService } from './services/delivery.service';
import { CreateDeliveryDto, AssignInspectorDto } from './dto/verification.dto';
import { DeliveryStatus } from './enums/verification.enums';

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  /**
   * Create a new delivery
   * POST /deliveries
   */
  @Post()
  @ApiOperation({
    summary: 'Create delivery',
    description: 'Create a new delivery record',
  })
  @ApiBody({ type: CreateDeliveryDto })
  @ApiResponse({
    status: 201,
    description: 'Delivery created successfully',
  })
  async createDelivery(@Body() dto: CreateDeliveryDto) {
    return this.deliveryService.createDelivery(dto);
  }

  /**
   * Get delivery by ID
   * GET /deliveries/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get delivery by ID',
    description: 'Retrieve full details of a delivery including verifications and assignments',
  })
  @ApiParam({ name: 'id', description: 'Delivery ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery details',
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async getDelivery(@Param('id') id: string) {
    return this.deliveryService.getDelivery(id);
  }

  /**
   * Get all deliveries
   * GET /deliveries
   */
  @Get()
  @ApiOperation({
    summary: 'Get deliveries',
    description: 'List deliveries with optional status filter and pagination',
  })
  @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of deliveries',
  })
  async getDeliveries(
    @Query('status') status?: DeliveryStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.deliveryService.getDeliveries(status, page, limit);
  }

  /**
   * Assign inspector to delivery
   * POST /deliveries/:id/assign-inspector
   */
  @Post(':id/assign-inspector')
  @ApiOperation({
    summary: 'Assign inspector to delivery',
    description:
      'Assign an inspector to a delivery. Prevents reassignment if delivery is locked.',
  })
  @ApiParam({ name: 'id', description: 'Delivery ID' })
  @ApiBody({ type: AssignInspectorDto })
  @ApiResponse({
    status: 201,
    description: 'Inspector assigned successfully',
  })
  @ApiResponse({ status: 400, description: 'Delivery is locked for assignment' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async assignInspector(
    @Param('id') id: string,
    @Body() dto: AssignInspectorDto,
  ) {
    return this.deliveryService.assignInspector(id, dto);
  }

  /**
   * Get assignment history for a delivery
   * GET /deliveries/:id/assignments
   */
  @Get(':id/assignments')
  @ApiOperation({
    summary: 'Get assignment history',
    description: 'Get inspector assignment history for a delivery',
  })
  @ApiParam({ name: 'id', description: 'Delivery ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment history',
  })
  async getAssignmentHistory(@Param('id') id: string) {
    return this.deliveryService.getAssignmentHistory(id);
  }

  /**
   * Lock delivery for assignment
   * POST /deliveries/:id/lock
   */
  @Post(':id/lock')
  @ApiOperation({
    summary: 'Lock delivery for assignment',
    description: 'Prevent further inspector reassignments for this delivery',
  })
  @ApiParam({ name: 'id', description: 'Delivery ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery locked successfully',
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async lockDelivery(@Param('id') id: string) {
    return this.deliveryService.lockForAssignment(id);
  }

  /**
   * Unlock delivery for assignment
   * POST /deliveries/:id/unlock
   */
  @Post(':id/unlock')
  @ApiOperation({
    summary: 'Unlock delivery for assignment',
    description: 'Allow inspector reassignments for this delivery',
  })
  @ApiParam({ name: 'id', description: 'Delivery ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery unlocked successfully',
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async unlockDelivery(@Param('id') id: string) {
    return this.deliveryService.unlockForAssignment(id);
  }
}
