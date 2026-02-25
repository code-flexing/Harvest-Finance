import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Verification } from '../entities/verification.entity';
import { Delivery } from '../entities/delivery.entity';
import { Approval } from '../entities/approval.entity';
import { InspectorAssignment } from '../entities/inspector-assignment.entity';
import {
  VerificationStatus,
  ApprovalRole,
  DeliveryStatus,
} from '../enums/verification.enums';
import { IpfsService } from './ipfs.service';
import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';
import { GpsValidationService } from './gps-validation.service';
import { CreateVerificationDto } from '../dto/verification.dto';

// Required roles for multi-signature verification
const REQUIRED_APPROVAL_ROLES = [
  ApprovalRole.INSPECTOR,
  ApprovalRole.SUPERVISOR,
  ApprovalRole.CLIENT,
];

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Approval)
    private readonly approvalRepository: Repository<Approval>,
    @InjectRepository(InspectorAssignment)
    private readonly assignmentRepository: Repository<InspectorAssignment>,
    private readonly ipfsService: IpfsService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly gpsValidationService: GpsValidationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new verification submission
   */
  async createVerification(dto: CreateVerificationDto): Promise<Verification> {
    // Validate delivery exists
    const delivery = await this.deliveryRepository.findOne({
      where: { id: dto.deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${dto.deliveryId} not found`);
    }

    // Validate GPS coordinates against destination if available
    if (delivery.destinationLat && delivery.destinationLng) {
      const validation = this.gpsValidationService.validateWithinRadius(
        dto.gpsLat,
        dto.gpsLng,
        delivery.destinationLat,
        delivery.destinationLng,
      );

      if (!validation.valid) {
        throw new BadRequestException({
          message: 'GPS coordinates validation failed',
          details: validation.message,
        });
      }
    } else {
      // Just validate format if no destination set
      if (!this.gpsValidationService.validateCoordinates(dto.gpsLat, dto.gpsLng)) {
        throw new BadRequestException('Invalid GPS coordinate format');
      }
    }

    // Create verification record
    const verification = this.verificationRepository.create({
      deliveryId: dto.deliveryId,
      inspectorId: dto.inspectorId,
      ipfsImageHash: dto.ipfsImageHash,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      notes: dto.notes,
      status: VerificationStatus.PENDING,
    });

    const savedVerification = await this.verificationRepository.save(verification);

    this.logger.log(
      `Verification created: ${savedVerification.id} for delivery ${dto.deliveryId}`,
    );

    // Notify relevant parties about new verification
    await this.notificationService.notifyVerificationSubmitted(
      dto.inspectorId,
      `inspector_${dto.inspectorId}@example.com`, // Mock email
      dto.deliveryId,
    );

    return savedVerification;
  }

  /**
   * Approve/reject a verification (multi-sig flow)
   */
  async approveVerification(
    verificationId: string,
    approverId: string,
    role: ApprovalRole,
    comments?: string,
    approved: boolean = true,
  ): Promise<Verification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
      relations: ['approvals', 'delivery'],
    });

    if (!verification) {
      throw new NotFoundException(`Verification ${verificationId} not found`);
    }

    if (
      verification.status === VerificationStatus.VERIFIED ||
      verification.status === VerificationStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Verification is already ${verification.status}`,
      );
    }

    // Check if this role has already approved
    const existingApproval = verification.approvals.find(
      (a) => a.role === role && a.approved,
    );

    if (existingApproval) {
      throw new BadRequestException(`Role ${role} has already approved`);
    }

    // Create/update approval record
    let approval = verification.approvals.find((a) => a.role === role);

    if (approval) {
      approval.approved = approved;
      approval.comments = comments || '';
      if (approved) {
        approval.approvedAt = new Date();
      }
    } else {
      approval = this.approvalRepository.create({
        verificationId,
        approverId,
        role,
        approved,
        comments,
        approvedAt: approved ? new Date() : undefined,
      });
    }

    await this.approvalRepository.save(approval);

    // Determine new status based on all required approvals
    const allApprovals = await this.approvalRepository.find({
      where: { verificationId },
    });

    const approvedRoles = allApprovals
      .filter((a) => a.approved)
      .map((a) => a.role);

    // Check if all required roles have approved
    const allRequiredApproved = REQUIRED_APPROVAL_ROLES.every((r) =>
      approvedRoles.includes(r),
    );

    if (allRequiredApproved) {
      verification.status = VerificationStatus.VERIFIED;
      verification.verifiedAt = new Date();
    } else if (approvedRoles.length > 0) {
      verification.status = VerificationStatus.PARTIALLY_APPROVED;
    }

    const savedVerification = await this.verificationRepository.save(verification);

    // Send notifications
    if (approved) {
      await this.notificationService.notifyApproved(
        verification.inspectorId,
        `inspector_${verification.inspectorId}@example.com`,
        verification.deliveryId,
        `${role}_approver`,
      );

      // Trigger payment if fully verified
      if (savedVerification.status === VerificationStatus.VERIFIED) {
        await this.triggerPayment(savedVerification);
      }
    } else {
      verification.status = VerificationStatus.REJECTED;
      await this.verificationRepository.save(verification);

      await this.notificationService.notifyRejected(
        verification.inspectorId,
        `inspector_${verification.inspectorId}@example.com`,
        verification.deliveryId,
        `${role}_approver`,
        comments,
      );
    }

    this.logger.log(
      `Verification ${verificationId} ${approved ? 'approved' : 'rejected'} by ${role}`,
    );

    return savedVerification;
  }

  /**
   * Trigger automatic payment release
   */
  private async triggerPayment(verification: Verification): Promise<void> {
    if (verification.paymentReleased) {
      this.logger.log(
        `Payment already released for verification ${verification.id}`,
      );
      return;
    }

    const delivery = await this.deliveryRepository.findOne({
      where: { id: verification.deliveryId },
    });

    if (!delivery) {
      this.logger.error(`Delivery not found for verification ${verification.id}`);
      return;
    }

    const paymentResult = await this.paymentService.releasePayment(
      verification.deliveryId,
      Number(delivery.amount) || 100, // Default amount if not set
      verification.inspectorId, // In production, this would be the recipient wallet
    );

    if (paymentResult.success) {
      verification.paymentReleased = true;
      verification.paymentTransactionId = paymentResult.transactionId || '';
      await this.verificationRepository.save(verification);

      // Update delivery status
      delivery.status = DeliveryStatus.VERIFIED;
      await this.deliveryRepository.save(delivery);

      // Notify about payment
      await this.notificationService.notifyPaymentReleased(
        verification.inspectorId,
        `inspector_${verification.inspectorId}@example.com`,
        verification.deliveryId,
        paymentResult.amount!,
        paymentResult.transactionId!,
      );

      this.logger.log(
        `Payment released for verification ${verification.id}: ${paymentResult.transactionId}`,
      );
    }
  }

  /**
   * Get verification by ID with full details
   */
  async getVerification(id: string): Promise<Verification> {
    const verification = await this.verificationRepository.findOne({
      where: { id },
      relations: ['approvals', 'delivery'],
    });

    if (!verification) {
      throw new NotFoundException(`Verification ${id} not found`);
    }

    return verification;
  }

  /**
   * Get verifications with filters
   */
  async getVerifications(
    status?: VerificationStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: Verification[]; total: number }> {
    const queryBuilder = this.verificationRepository
      .createQueryBuilder('verification')
      .leftJoinAndSelect('verification.approvals', 'approvals')
      .leftJoinAndSelect('verification.delivery', 'delivery');

    if (status) {
      queryBuilder.where('verification.status = :status', { status });
    }

    queryBuilder
      .orderBy('verification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * Get approval progress for a verification
   */
  async getApprovalProgress(verificationId: string): Promise<{
    total: number;
    approved: number;
    required: typeof REQUIRED_APPROVAL_ROLES;
    approvals: Approval[];
  }> {
    const approvals = await this.approvalRepository.find({
      where: { verificationId },
    });

    const approvedApprovals = approvals.filter((a) => a.approved);

    return {
      total: REQUIRED_APPROVAL_ROLES.length,
      approved: approvedApprovals.length,
      required: REQUIRED_APPROVAL_ROLES,
      approvals,
    };
  }
}
