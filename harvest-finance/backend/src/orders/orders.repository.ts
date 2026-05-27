import { Injectable, Logger } from '@nestjs/common';
import { OrderEntity } from './entities/order.entity';
import { v4 as uuidv4 } from 'uuid';
import { OrderStatus } from './order-status.enum';

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);
  private items: OrderEntity[] = [];

  async create(data: Partial<OrderEntity>): Promise<OrderEntity> {
    const now = new Date();
    const entity = new OrderEntity({
      id: uuidv4(),
      status: OrderStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      escrowTxHash: null,
      ...data,
    });
    this.items.push(entity);
    return entity;
  }

  async findById(id: string): Promise<OrderEntity | undefined> {
    return this.items.find((i) => i.id === id);
  }

  async save(entity: OrderEntity): Promise<OrderEntity> {
    const idx = this.items.findIndex((i) => i.id === entity.id);
    entity.updatedAt = new Date();
    if (idx === -1) {
      this.items.push(entity);
    } else {
      this.items[idx] = entity;
    }
    return entity;
  }

  async findAll(filter: {
    status?: string;
    cropType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: string;
    role?: 'FARMER' | 'BUYER' | undefined;
    userId?: string | undefined;
  }): Promise<{ items: OrderEntity[]; total: number }> {
    let res = this.items.slice();
    if (filter.status) {
      res = res.filter((r) => r.status === filter.status);
    }
    if (filter.cropType) {
      res = res.filter((r) => r.cropType === filter.cropType);
    }
    if (filter.search) {
      const s = filter.search.toLowerCase();
      res = res.filter(
        (r) =>
          r.cropType.toLowerCase().includes(s) ||
          r.buyerName.toLowerCase().includes(s),
      );
    }
    if (filter.startDate) {
      const sd = new Date(filter.startDate);
      res = res.filter((r) => r.createdAt >= sd);
    }
    if (filter.endDate) {
      const ed = new Date(filter.endDate);
      res = res.filter((r) => r.createdAt <= ed);
    }
    if (filter.role === 'FARMER') {
      // Farmers should only see open orders (PENDING)
      res = res.filter((r) => r.status === OrderStatus.PENDING);
    }
    if (filter.role === 'BUYER' && filter.userId) {
      res = res.filter((r) => r.buyerId === filter.userId);
    }

    const total = res.length;
    // sort by createdAt desc by default
    res.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const start = (page - 1) * limit;
    const items = res.slice(start, start + limit);
    return { items, total };
  }
}
