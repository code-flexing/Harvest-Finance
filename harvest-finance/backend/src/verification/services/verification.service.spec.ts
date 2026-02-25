import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { VerificationService } from './verification.service';
import { Verification } from '../entities/verification.entity';
import { Delivery } from '../entities/delivery.entity';
import { Approval } from '../entities/approval.entity';
import { InspectorAssignment } from '../entities/inspector-assignment.entity';
import { IpfsService } from './ipfs.service';
import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';
import { GpsValidationService } from './gps-validation.service';
import {
  VerificationStatus,
  ApprovalRole,
  DeliveryStatus,
} from '../enums/verification.enums';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('VerificationService', () => {
  let service: VerificationService;

  const mockVerificationRepo: any = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockDeliveryRepo: any = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockApprovalRepo: any = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockAssignmentRepo: any = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockIpfsService: any = {
    uploadFile: jest.fn(),
    getFile: jest.fn(),
    getGatewayUrl: jest.fn(),
  };

  const mockPaymentService: any = {
    releasePayment: jest.fn(),
    isAutoReleaseEnabled: jest.fn(),
  };

  const mockNotificationService: any = {
    notifyVerificationSubmitted: jest.fn(),
    notifyApproved: jest.fn(),
    notifyRejected: jest.fn(),
    notifyPaymentReleased: jest.fn(),
  };

  const mockGpsValidationService: any = {
    validateCoordinates: jest.fn(),
    validateWithinRadius: jest.fn(),
  };

  const mockConfigService: any = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: getRepositoryToken(Verification), useValue: mockVerificationRepo },
        { provide: getRepositoryToken(Delivery), useValue: mockDeliveryRepo },
        { provide: getRepositoryToken(Approval), useValue: mockApprovalRepo },
        { provide: getRepositoryToken(InspectorAssignment), useValue: mockAssignmentRepo },
        { provide: IpfsService, useValue: mockIpfsService },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: GpsValidationService, useValue: mockGpsValidationService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    jest.clearAllMocks();
  });

  describe('createVerification', () => {
    const createDto = {
      deliveryId: 'delivery-123',
      inspectorId: 'inspector-456',
      ipfsImageHash: 'QmHash123',
      gpsLat: 40.7128,
      gpsLng: -74.006,
      notes: 'Test verification',
    };

    const mockDelivery: Partial<Delivery> = {
      id: 'delivery-123',
      destinationLat: 40.7128,
      destinationLng: -74.006,
      status: DeliveryStatus.ASSIGNED,
    };

    it('should create a verification successfully', async () => {
      mockDeliveryRepo.findOne.mockResolvedValue(mockDelivery);
      mockGpsValidationService.validateWithinRadius.mockReturnValue({
        valid: true,
        distance: 50,
      });
      mockVerificationRepo.create.mockReturnValue({ ...createDto, id: 'ver-123' });
      mockVerificationRepo.save.mockResolvedValue({ ...createDto, id: 'ver-123' });
      mockNotificationService.notifyVerificationSubmitted = jest.fn().mockResolvedValue({});

      const result = await service.createVerification(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('ver-123');
    });

    it('should throw NotFoundException if delivery not found', async () => {
      mockDeliveryRepo.findOne.mockResolvedValue(null);

      await expect(service.createVerification(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if GPS validation fails', async () => {
      mockDeliveryRepo.findOne.mockResolvedValue(mockDelivery);
      mockGpsValidationService.validateWithinRadius.mockReturnValue({
        valid: false,
        distance: 200,
        message: 'Coordinates are 200m away (max: 100m)',
      });

      await expect(service.createVerification(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVerification', () => {
    it('should return verification by id', async () => {
      const mockVerification = { id: 'ver-123', status: VerificationStatus.PENDING };
      mockVerificationRepo.findOne.mockResolvedValue(mockVerification);

      const result = await service.getVerification('ver-123');

      expect(result).toEqual(mockVerification);
    });
  });

  describe('getVerifications', () => {
    it('should return paginated verifications', async () => {
      const mockVerifications = [
        { id: 'ver-1', status: VerificationStatus.PENDING },
        { id: 'ver-2', status: VerificationStatus.VERIFIED },
      ];

      mockVerificationRepo.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockVerifications, 2]),
      });

      const result = await service.getVerifications(VerificationStatus.PENDING, 1, 10);

      expect(result.total).toBe(2);
      expect(result.data).toEqual(mockVerifications);
    });
  });
});
