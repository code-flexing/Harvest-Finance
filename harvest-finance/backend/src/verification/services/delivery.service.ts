import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from '../entities/delivery.entity';
import { InspectorAssignment } from '../entities/inspector-assignment.entity';
import { DeliveryStatus } from '../enums/verification.enums';
import { CreateDeliveryDto, AssignInspectorDto } from '../dto/verification.dto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(InspectorAssignment)
    private readonly assignmentRepository: Repository<InspectorAssignment>,
  ) {}

  /**
   * Create a new delivery
   */
  async createDelivery(dto: CreateDeliveryDto): Promise<Delivery> {
    const delivery = this.deliveryRepository.create({
      orderId: dto.orderId,
      destinationLat: dto.destinationLat,
      destinationLng: dto.destinationLng,
      destinationAddress: dto.destinationAddress,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      amount: dto.amount,
      notes: dto.notes,
      status: DeliveryStatus.PENDING,
    });

    const savedDelivery = await this.deliveryRepository.save(delivery);

    this.logger.log(`Delivery created: ${savedDelivery.id}`);

    return savedDelivery;
  }

  /**
   * Get delivery by ID
   */
  async getDelivery(id: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id },
      relations: ['verifications', 'inspectorAssignments'],
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${id} not found`);
    }

    return delivery;
  }

  /**
   * Get all deliveries with optional filters
   */
  async getDeliveries(
    status?: DeliveryStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: Delivery[]; total: number }> {
    const queryBuilder = this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.verifications', 'verifications')
      .leftJoinAndSelect('delivery.inspectorAssignments', 'assignments');

    if (status) {
      queryBuilder.where('delivery.status = :status', { status });
    }

    queryBuilder
      .orderBy('delivery.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * Assign inspector to delivery
   * Prevents reassignment if locked
   */
  async assignInspector(
    deliveryId: string,
    dto: AssignInspectorDto,
  ): Promise<InspectorAssignment> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    if (delivery.isLockedForAssignment) {
      throw new BadRequestException(
        'Delivery is locked for assignment. Cannot reassign.',
      );
    }

    // Check if there's already an active assignment
    const existingAssignment = await this.assignmentRepository.findOne({
      where: { deliveryId, isActive: true },
    });

    if (existingAssignment) {
      // Deactivate existing assignment
      existingAssignment.isActive = false;
      await this.assignmentRepository.save(existingAssignment);

      this.logger.log(
        `Deactivated previous assignment ${existingAssignment.id} for delivery ${deliveryId}`,
      );
    }

    // Create new assignment
    const assignment = this.assignmentRepository.create({
      deliveryId,
      inspectorId: dto.inspectorId,
      inspectorName: dto.inspectorName,
      inspectorEmail: dto.inspectorEmail,
      assignedBy: dto.assignedBy,
      notes: dto.notes,
      isActive: true,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    // Update delivery status
    delivery.status = DeliveryStatus.ASSIGNED;
    await this.deliveryRepository.save(delivery);

    this.logger.log(
      `Inspector ${dto.inspectorId} assigned to delivery ${deliveryId}`,
    );

    return savedAssignment;
  }

  /**
   * Get inspector assignment history for a delivery
   */
  async getAssignmentHistory(deliveryId: string): Promise<InspectorAssignment[]> {
    return this.assignmentRepository.find({
      where: { deliveryId },
      order: { assignedAt: 'DESC' },
    });
  }

  /**
   * Lock delivery for assignment (prevent reassignment)
   */
  async lockForAssignment(deliveryId: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    delivery.isLockedForAssignment = true;
    return this.deliveryRepository.save(delivery);
  }

  /**
   * Unlock delivery for assignment
   */
  async unlockForAssignment(deliveryId: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    delivery.isLockedForAssignment = false;
    return this.deliveryRepository.save(delivery);
  }

  /**
   * Update delivery status
   */
  async updateStatus(
    deliveryId: string,
    status: DeliveryStatus,
  ): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    delivery.status = status;
    return this.deliveryRepository.save(delivery);
  }
}
