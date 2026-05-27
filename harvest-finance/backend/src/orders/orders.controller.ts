import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Request,
  Get,
  Query,
  Param,
  NotFoundException,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('orders')
@Controller({
  path: 'orders',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create an order (buyers only)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Request() req: any, @Body() dto: CreateOrderDto) {
    if (req.user.role !== UserRole.BUYER) {
      throw new ForbiddenException('Only buyers can create orders');
    }
    const buyer = {
      id: req.user.id,
      name: `${req.user.firstName} ${req.user.lastName}`,
    };
    return this.service.create(buyer, dto);
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get orders with filtering and pagination' })
  async findAll(@Request() req: any, @Query() query: QueryOrdersDto) {
    const opts = {
      ...query,
      role: req.user.role,
      userId: req.user.id,
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
  async accept(@Request() req: any, @Param('id') id: string) {
    if (req.user.role !== UserRole.FARMER) {
      throw new ForbiddenException('Only farmers can accept orders');
    }
    const farmer = {
      id: req.user.id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      publicKey: req.user.stellarAddress,
    };
    return this.service.acceptOrder(id, farmer);
  }

  @Post(':id/upfront')
  @ApiOperation({ summary: 'Release upfront payment (60%) to farmer' })
  async releaseUpfront(@Request() req: any, @Param('id') id: string) {
    if (req.user.role !== UserRole.FARMER) {
      throw new ForbiddenException('Only farmers can receive upfront payment');
    }
    const farmerPublicKey = req.user.stellarAddress;
    return this.service.releaseUpfrontPayment(id, farmerPublicKey);
  }
}
