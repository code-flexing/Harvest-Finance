import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoopMarketplaceService } from './coop-marketplace.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateCoopOrderDto } from './dto/create-order.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { CoopOrderStatus } from '../database/entities/coop-order.entity';

@ApiTags('coop-marketplace')
@Controller({
  path: 'marketplace',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoopMarketplaceController {
  constructor(private readonly service: CoopMarketplaceService) {}

  // ── Listings ───────────────────────────────────────────────────────────────

  @Post('listings')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a marketplace listing' })
  createListing(@Request() req: any, @Body() dto: CreateListingDto) {
    return this.service.createListing(req.user.id, dto);
  }

  @Get('listings')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Browse marketplace listings with filters' })
  getListings(@Query() query: QueryListingsDto) {
    return this.service.getListings(query);
  }

  @Get('listings/mine')
  @ApiOperation({ summary: 'Get my own listings' })
  myListings(@Request() req: any) {
    return this.service.getMyListings(req.user.id);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get listing detail' })
  getListing(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getListingById(id);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove own listing' })
  removeListing(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeListing(id, req.user.id);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @Post('orders')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Place an order on a listing' })
  placeOrder(@Request() req: any, @Body() dto: CreateCoopOrderDto) {
    return this.service.placeOrder(req.user.id, dto);
  }

  @Patch('orders/:id/status')
  @ApiOperation({
    summary:
      'Update order status (seller: confirm/ship/cancel, buyer: delivered/dispute)',
  })
  @ApiQuery({ name: 'status', enum: CoopOrderStatus })
  updateStatus(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: CoopOrderStatus,
  ) {
    return this.service.updateOrderStatus(id, req.user.id, status);
  }

  @Get('orders/mine')
  @ApiOperation({ summary: 'Get my orders (as buyer or seller)' })
  @ApiQuery({ name: 'as', enum: ['buyer', 'seller'], required: false })
  myOrders(@Request() req: any, @Query('as') as: 'buyer' | 'seller' = 'buyer') {
    return this.service.getMyOrders(req.user.id, as);
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  @Post('reviews')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Leave a review after delivery' })
  addReview(@Request() req: any, @Body() dto: CreateReviewDto) {
    return this.service.addReview(req.user.id, dto);
  }

  @Get('sellers/:id/rating')
  @ApiOperation({ summary: 'Get seller rating summary and reviews' })
  getSellerRating(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSellerRating(id);
  }
}
