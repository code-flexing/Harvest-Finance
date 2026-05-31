import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { StellarService } from './stellar.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './order-status.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: OrdersRepository;
  let stellar: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        OrdersRepository,
        StellarService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repo = module.get<OrdersRepository>(OrdersRepository);
    stellar = module.get<StellarService>(StellarService);
  });

  it('creates an order', async () => {
    const dto: CreateOrderDto = { cropType: 'WHEAT', quantity: 10, price: 2 };
    const buyer = { id: 'buyer-1', name: 'Buyer One' };
    const order = await service.create(buyer, dto);
    expect(order).toBeDefined();
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.buyerId).toBe(buyer.id);
  });

  it('accepts an order and creates escrow', async () => {
    const dto: CreateOrderDto = { cropType: 'WHEAT', quantity: 5, price: 3 };
    const buyer = { id: 'buyer-2', name: 'Buyer Two' };
    const created = await service.create(buyer, dto);

    // mock stellar.createEscrow
    jest.spyOn(stellar, 'createEscrow').mockResolvedValue('tx-hash-123');

    const farmer = { id: 'farmer-1', name: 'Farmer One', publicKey: 'GFAKE' };
    const accepted = await service.acceptOrder(created.id, farmer as any);
    expect(accepted.status).toBe(OrderStatus.IN_ESCROW);
    expect(accepted.escrowTxHash).toBe('tx-hash-123');
  });

  it('rolls back acceptance if escrow fails', async () => {
    const dto: CreateOrderDto = { cropType: 'MAIZE', quantity: 2, price: 1 };
    const buyer = { id: 'buyer-3', name: 'Buyer Three' };
    const created = await service.create(buyer, dto);

    jest.spyOn(stellar, 'createEscrow').mockRejectedValue(new Error('network'));

    const farmer = { id: 'farmer-2', name: 'Farmer Two', publicKey: 'GFAKE2' };
    await expect(
      service.acceptOrder(created.id, farmer as any),
    ).rejects.toBeDefined();

    const reloaded = await service.findById(created.id);
    expect(reloaded.status).toBe(OrderStatus.PENDING);
    expect(reloaded.escrowTxHash).toBeNull();
  });
});
