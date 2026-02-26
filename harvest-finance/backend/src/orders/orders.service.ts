  async releaseUpfrontPayment(orderId: string, farmerPublicKey: string): Promise<OrderEntity> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.IN_ESCROW) throw new ConflictException('Order not in escrow');
    // Calculate 60% upfront
    const upfrontAmount = ((order.price * order.quantity) * 0.6).toFixed(7);
    // Call StellarService to release upfront payment
    const tx = await this.stellar.releaseUpfrontPayment({
      orderId,
      farmerPublicKey,
      amount: upfrontAmount,
      assetCode: 'XLM', // TODO: support other assets if needed
    });
    // Update order status and record tx
    order.status = OrderStatus.ACCEPTED;
    order.escrowTxHash = tx.transactionHash;
    await this.repo.save(order);
    return order;
  }
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderStatus } from './order-status.enum';
import { StellarService } from './stellar.service';

@Injectable()
export class OrdersService {
  constructor(private repo: OrdersRepository, private stellar: StellarService) {}

  async create(buyer: { id: string; name: string }, dto: CreateOrderDto): Promise<OrderEntity> {
    const order = await this.repo.create({
      buyerId: buyer.id,
      buyerName: buyer.name,
      cropType: dto.cropType,
      quantity: dto.quantity,
      price: dto.price,
    });
    return order;
  }

  async findAll(opts: any) {
    return this.repo.findAll(opts);
  }

  async findById(id: string): Promise<OrderEntity> {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async acceptOrder(orderId: string, farmer: { id: string; name: string; publicKey?: string }) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) throw new ConflictException('Order not available for acceptance');

    // Prevent duplicate acceptance in race conditions
    order.status = OrderStatus.ACCEPTED;
    await this.repo.save(order);

    // Create escrow on Stellar
    try {
      const escrowTx = await this.stellar.createEscrow(order.buyerId, farmer.publicKey ?? '', String(order.price * order.quantity));
      order.escrowTxHash = escrowTx;
      order.status = OrderStatus.IN_ESCROW;
      await this.repo.save(order);
      return order;
    } catch (err) {
      // rollback acceptance
      order.status = OrderStatus.PENDING;
      order.escrowTxHash = null;
      await this.repo.save(order);
      throw new BadRequestException('Failed creating escrow');
    }
  }
}
