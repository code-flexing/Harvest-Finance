  @Post(':id/upfront')
  @ApiOperation({ summary: 'Release upfront payment (60%) to farmer' })
  async releaseUpfront(@Req() req: any, @Param('id') id: string) {
    const role = req.headers['x-user-role'];
    if (role !== 'FARMER') throw new NotFoundException('Only farmers can receive upfront payment');
    const farmerPublicKey = req.headers['x-user-public-key'];
    return this.service.releaseUpfrontPayment(id, farmerPublicKey);
  }
import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Req,
  Get,
  Query,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create an order (buyers only)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Req() req: any, @Body() dto: CreateOrderDto) {
    const role = req.headers['x-user-role'];
    if (role !== 'BUYER') throw new NotFoundException('Only buyers can create orders');
    const buyer = { id: req.headers['x-user-id'], name: req.headers['x-user-name'] };
    return this.service.create(buyer, dto);
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get orders with filtering and pagination' })
  async findAll(@Req() req: any, @Query() query: QueryOrdersDto) {
    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const opts = {
      ...query,
      role,
      userId,
    };
    return this.service.findAll(opts);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept order (farmers only)' })
  async accept(@Req() req: any, @Param('id') id: string) {
    const role = req.headers['x-user-role'];
    if (role !== 'FARMER') throw new NotFoundException('Only farmers can accept orders');
    const farmer = { id: req.headers['x-user-id'], name: req.headers['x-user-name'], publicKey: req.headers['x-user-public-key'] };
    return this.service.acceptOrder(id, farmer);
  }
}
