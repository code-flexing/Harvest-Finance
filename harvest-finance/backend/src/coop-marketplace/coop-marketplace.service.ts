import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  CoopListing,
  ListingStatus,
} from '../database/entities/coop-listing.entity';
import {
  CoopOrder,
  CoopOrderStatus,
} from '../database/entities/coop-order.entity';
import { CoopReview } from '../database/entities/coop-review.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateCoopOrderDto } from './dto/create-order.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryListingsDto } from './dto/query-listings.dto';

@Injectable()
export class CoopMarketplaceService {
  constructor(
    @InjectRepository(CoopListing) private listingRepo: Repository<CoopListing>,
    @InjectRepository(CoopOrder) private orderRepo: Repository<CoopOrder>,
    @InjectRepository(CoopReview) private reviewRepo: Repository<CoopReview>,
    private dataSource: DataSource,
  ) {}

  // ── Listings ───────────────────────────────────────────────────────────────

  async createListing(
    sellerId: string,
    dto: CreateListingDto,
  ): Promise<CoopListing> {
    const listing = this.listingRepo.create({
      sellerId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      price: dto.price,
      currency: dto.currency ?? 'USD',
      quantity: dto.quantity,
      unit: dto.unit ?? 'kg',
      deliveryOption: dto.deliveryOption,
      location: dto.location ?? null,
      imageUrl: dto.imageUrl ?? null,
    });
    return this.listingRepo.save(listing);
  }

  async getListings(
    query: QueryListingsDto,
  ): Promise<{ data: CoopListing[]; total: number; page: number }> {
    const { page = 1, limit = 20, category, search, location, sort } = query;

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .leftJoin('l.seller', 'seller')
      .addSelect([
        'seller.id',
        'seller.firstName',
        'seller.lastName',
        'seller.profileImageUrl',
      ])
      .where('l.status = :status', { status: ListingStatus.ACTIVE });

    if (category) qb.andWhere('l.category = :category', { category });
    if (location)
      qb.andWhere('l.location ILIKE :location', { location: `%${location}%` });
    if (search) {
      qb.andWhere('(l.title ILIKE :search OR l.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    switch (sort) {
      case 'price_asc':
        qb.orderBy('l.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('l.price', 'DESC');
        break;
      default:
        qb.orderBy('l.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page };
  }

  async getListingById(id: string): Promise<CoopListing> {
    const listing = await this.listingRepo.findOne({
      where: { id, status: ListingStatus.ACTIVE },
      relations: ['seller'],
    });
    if (!listing) throw new NotFoundException('Listing not found');
    await this.listingRepo.increment({ id }, 'viewCount', 1);
    return listing;
  }

  async getMyListings(sellerId: string): Promise<CoopListing[]> {
    return this.listingRepo.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async removeListing(id: string, requesterId: string): Promise<void> {
    const listing = await this.listingRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== requesterId) throw new ForbiddenException();
    await this.listingRepo.update(id, { status: ListingStatus.REMOVED });
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async placeOrder(
    buyerId: string,
    dto: CreateCoopOrderDto,
  ): Promise<CoopOrder> {
    const listing = await this.listingRepo.findOne({
      where: { id: dto.listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== ListingStatus.ACTIVE)
      throw new BadRequestException('Listing is no longer available');
    if (listing.sellerId === buyerId)
      throw new ForbiddenException('Cannot buy your own listing');
    if (dto.quantity > listing.quantity) {
      throw new BadRequestException(
        `Only ${listing.quantity} ${listing.unit} available`,
      );
    }

    const totalPrice = Number(listing.price) * dto.quantity;

    const order = await this.dataSource.transaction(async (manager) => {
      const newOrder = this.orderRepo.create({
        listingId: dto.listingId,
        buyerId,
        sellerId: listing.sellerId,
        quantity: dto.quantity,
        totalPrice,
        notes: dto.notes ?? null,
        deliveryAddress: dto.deliveryAddress ?? null,
      });
      const saved = await manager.save(CoopOrder, newOrder);

      // reserve listing when fully purchased
      if (dto.quantity >= listing.quantity) {
        await manager.update(
          CoopListing,
          { id: listing.id },
          { status: ListingStatus.RESERVED },
        );
      }

      return saved;
    });

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    requesterId: string,
    status: CoopOrderStatus,
  ): Promise<CoopOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const allowedForSeller = [
      CoopOrderStatus.CONFIRMED,
      CoopOrderStatus.SHIPPED,
      CoopOrderStatus.CANCELLED,
    ];
    const allowedForBuyer = [
      CoopOrderStatus.DELIVERED,
      CoopOrderStatus.DISPUTED,
    ];

    if (order.sellerId === requesterId && !allowedForSeller.includes(status)) {
      throw new BadRequestException('Invalid status transition for seller');
    }
    if (order.buyerId === requesterId && !allowedForBuyer.includes(status)) {
      throw new BadRequestException('Invalid status transition for buyer');
    }
    if (order.sellerId !== requesterId && order.buyerId !== requesterId) {
      throw new ForbiddenException();
    }

    const updates: Partial<CoopOrder> = { status };
    if (status === CoopOrderStatus.CONFIRMED) updates.confirmedAt = new Date();
    if (status === CoopOrderStatus.DELIVERED) updates.deliveredAt = new Date();

    await this.orderRepo.update(orderId, updates);
    return this.orderRepo.findOne({
      where: { id: orderId },
    }) as Promise<CoopOrder>;
  }

  async getMyOrders(
    userId: string,
    as: 'buyer' | 'seller',
  ): Promise<CoopOrder[]> {
    const where = as === 'buyer' ? { buyerId: userId } : { sellerId: userId };
    return this.orderRepo.find({
      where,
      relations: ['listing'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  async addReview(
    reviewerId: string,
    dto: CreateReviewDto,
  ): Promise<CoopReview> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== CoopOrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Can only review after delivery is confirmed',
      );
    }
    if (order.buyerId !== reviewerId && order.sellerId !== reviewerId) {
      throw new ForbiddenException();
    }

    const existing = await this.reviewRepo.findOne({
      where: { orderId: dto.orderId, reviewerId },
    });
    if (existing) throw new ConflictException('Already reviewed this order');

    const revieweeId =
      order.buyerId === reviewerId ? order.sellerId : order.buyerId;

    const review = this.reviewRepo.create({
      orderId: dto.orderId,
      reviewerId,
      revieweeId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    return this.reviewRepo.save(review);
  }

  async getSellerRating(
    sellerId: string,
  ): Promise<{ average: number; count: number; reviews: CoopReview[] }> {
    const reviews = await this.reviewRepo.find({
      where: { revieweeId: sellerId },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
    });
    const average = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
    return {
      average: Math.round(average * 10) / 10,
      count: reviews.length,
      reviews,
    };
  }
}
