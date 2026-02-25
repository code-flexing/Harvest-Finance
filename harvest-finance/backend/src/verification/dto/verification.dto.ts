import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ApprovalRole } from '../enums/verification.enums';

/**
 * DTO for creating a new verification
 */
export class CreateVerificationDto {
  @ApiProperty({ description: 'The delivery ID to verify' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ description: 'The inspector ID submitting the verification' })
  @IsString()
  @IsNotEmpty()
  inspectorId: string;

  @ApiPropertyOptional({ description: 'IPFS hash of the uploaded proof image' })
  @IsString()
  @IsOptional()
  ipfsImageHash?: string;

  @ApiProperty({ description: 'GPS latitude coordinate', example: 40.7128 })
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  gpsLat: number;

  @ApiProperty({ description: 'GPS longitude coordinate', example: -74.006 })
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  gpsLng: number;

  @ApiPropertyOptional({ description: 'Optional notes for the verification' })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO for GPS coordinates
 */
export class GpsCoordinatesDto {
  @ApiProperty({ description: 'Latitude', example: 40.7128 })
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: -74.006 })
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  lng: number;
}

/**
 * DTO for updating verification status (approval)
 */
export class ApproveVerificationDto {
  @ApiProperty({ description: 'ID of the approver' })
  @IsString()
  @IsNotEmpty()
  approverId: string;

  @ApiProperty({ enum: ApprovalRole, description: 'Role of the approver' })
  @IsEnum(ApprovalRole)
  role: ApprovalRole;

  @ApiPropertyOptional({ description: 'Comments from the approver' })
  @IsString()
  @IsOptional()
  comments?: string;
}

/**
 * DTO for querying verifications
 */
export class QueryVerificationDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'PARTIALLY_APPROVED', 'VERIFIED', 'REJECTED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO for creating a delivery
 */
export class CreateDeliveryDto {
  @ApiProperty({ description: 'Order ID associated with this delivery' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: 'Destination latitude' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destinationLat?: number;

  @ApiPropertyOptional({ description: 'Destination longitude' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destinationLng?: number;

  @ApiPropertyOptional({ description: 'Destination address' })
  @IsString()
  @IsOptional()
  destinationAddress?: string;

  @ApiPropertyOptional({ description: 'Recipient name' })
  @IsString()
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional({ description: 'Recipient phone' })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiPropertyOptional({ description: 'Delivery amount' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Notes for the delivery' })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO for assigning inspector to delivery
 */
export class AssignInspectorDto {
  @ApiProperty({ description: 'Inspector ID' })
  @IsString()
  @IsNotEmpty()
  inspectorId: string;

  @ApiProperty({ description: 'Inspector name' })
  @IsString()
  @IsNotEmpty()
  inspectorName: string;

  @ApiPropertyOptional({ description: 'Inspector email' })
  @IsString()
  @IsOptional()
  inspectorEmail?: string;

  @ApiPropertyOptional({ description: 'Assigned by user ID' })
  @IsString()
  @IsOptional()
  assignedBy?: string;

  @ApiPropertyOptional({ description: 'Notes for the assignment' })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO for IPFS upload response
 */
export class IpfsUploadResponseDto {
  @ApiProperty({ description: 'IPFS Content Identifier (CID)' })
  hash: string;

  @ApiProperty({ description: 'Size of the uploaded file in bytes' })
  size: string;
}

/**
 * DTO for verification response
 */
export class VerificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deliveryId: string;

  @ApiProperty()
  inspectorId: string;

  @ApiPropertyOptional()
  ipfsImageHash?: string;

  @ApiProperty()
  gpsLat: number;

  @ApiProperty()
  gpsLng: number;

  @ApiProperty({ enum: ['PENDING', 'PARTIALLY_APPROVED', 'VERIFIED', 'REJECTED'] })
  status: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  paymentReleased: boolean;

  @ApiPropertyOptional()
  paymentTransactionId?: string;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  approvals: ApprovalResponseDto[];
}

export class ApprovalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  approverId: string;

  @ApiProperty({ enum: ApprovalRole })
  role: ApprovalRole;

  @ApiProperty()
  approved: boolean;

  @ApiPropertyOptional()
  comments?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
