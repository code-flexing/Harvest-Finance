import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VerificationService } from './services/verification.service';
import { IpfsService } from './services/ipfs.service';
import { NotificationService } from './services/notification.service';
import {
  CreateVerificationDto,
  ApproveVerificationDto,
  QueryVerificationDto,
} from './dto/verification.dto';
import { VerificationStatus, ApprovalRole } from './enums/verification.enums';

// Allowed MIME types for image uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('verifications')
@Controller('verifications')
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Upload proof of delivery image to IPFS
   * POST /verifications/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload proof of delivery image to IPFS',
    description:
      'Accepts image files (JPEG, PNG) up to 10MB and stores them on IPFS',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      example: {
        hash: 'QmXyZ123456789...',
        size: '1024000',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadProof(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ hash: string; size: string }> {
    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Upload to IPFS
    const result = await this.ipfsService.uploadFile(file.buffer, file.originalname);

    return result;
  }

  /**
   * Create a new verification submission
   * POST /verifications
   */
  @Post()
  @ApiOperation({
    summary: 'Create verification submission',
    description:
      'Submit a new delivery verification with GPS coordinates and IPFS image hash',
  })
  @ApiBody({ type: CreateVerificationDto })
  @ApiResponse({
    status: 201,
    description: 'Verification created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async createVerification(
    @Body() dto: CreateVerificationDto,
  ) {
    return this.verificationService.createVerification(dto);
  }

  /**
   * Approve a verification
   * POST /verifications/:id/approve
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve verification',
    description:
      'Approve a verification. Requires multi-signature from INSPECTOR, SUPERVISOR, and CLIENT roles',
  })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiBody({ type: ApproveVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification approved successfully',
  })
  @ApiResponse({ status: 400, description: 'Already approved or invalid role' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async approveVerification(
    @Param('id') id: string,
    @Body() dto: ApproveVerificationDto,
  ) {
    return this.verificationService.approveVerification(
      id,
      dto.approverId,
      dto.role,
      dto.comments,
      true,
    );
  }

  /**
   * Reject a verification
   * POST /verifications/:id/reject
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject verification',
    description: 'Reject a verification submission',
  })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiBody({ type: ApproveVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification rejected successfully',
  })
  @ApiResponse({ status: 400, description: 'Already processed' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async rejectVerification(
    @Param('id') id: string,
    @Body() dto: ApproveVerificationDto,
  ) {
    return this.verificationService.approveVerification(
      id,
      dto.approverId,
      dto.role,
      dto.comments,
      false,
    );
  }

  /**
   * Get verification by ID
   * GET /verifications/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get verification by ID',
    description: 'Retrieve full details of a verification including approval progress',
  })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Verification details',
  })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  async getVerification(@Param('id') id: string) {
    const verification = await this.verificationService.getVerification(id);
    const progress = await this.verificationService.getApprovalProgress(id);

    return {
      ...verification,
      approvalProgress: progress,
    };
  }

  /**
   * Get verifications with filters
   * GET /verifications
   */
  @Get()
  @ApiOperation({
    summary: 'Get verifications',
    description: 'List verifications with optional status filter and pagination',
  })
  @ApiQuery({ name: 'status', required: false, enum: VerificationStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of verifications',
  })
  async getVerifications(
    @Query('status') status?: VerificationStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.verificationService.getVerifications(status, page, limit);
  }

  /**
   * Get approval progress for a verification
   * GET /verifications/:id/progress
   */
  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get approval progress',
    description: 'Get multi-signature approval progress for a verification',
  })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval progress details',
  })
  async getApprovalProgress(@Param('id') id: string) {
    return this.verificationService.getApprovalProgress(id);
  }
}
