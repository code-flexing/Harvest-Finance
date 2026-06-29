import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsuranceService } from './insurance.service';
import { RiskAssessmentDto, SubscribeInsuranceDto } from './dto/insurance.dto';

@ApiTags('Insurance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List insurance plans', description: 'Returns all active insurance plans available for subscription.' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPlans() {
    return this.insuranceService.getAvailablePlans();
  }

  @Get('assess')
  @ApiOperation({ summary: 'Risk assessment', description: 'Performs a quick risk assessment for a given crop and farm profile without saving any data.' })
  @ApiResponse({ status: 200, description: 'Risk assessment result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  assess(@Query() dto: RiskAssessmentDto) {
    return this.insuranceService.assessRisk(dto);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get plan recommendations', description: 'Returns a risk assessment combined with ranked insurance plan matches for the authenticated user.' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecommendations(@Req() _req: any, @Query() dto: RiskAssessmentDto) {
    return this.insuranceService.getRecommendations(dto);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get user subscriptions', description: "Returns the authenticated user's active and past insurance subscriptions." })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSubscriptions(@Req() req: any) {
    const userId: string = req.user?.userId ?? req.user?.id;
    return this.insuranceService.getUserSubscriptions(userId);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to an insurance plan', description: 'Subscribes the authenticated user to an insurance plan and optionally links a Farm Vault for premium tracking.' })
  @ApiBody({ type: SubscribeInsuranceDto })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  subscribe(@Req() req: any, @Body() dto: SubscribeInsuranceDto) {
    const userId: string = req.user?.userId ?? req.user?.id;
    return this.insuranceService.subscribe(userId, dto);
  }

  @Post('renewal-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send renewal alerts', description: 'Triggers renewal reminder notifications for subscriptions expiring within 30 days. Intended for admin or cron use.' })
  @ApiResponse({ status: 200, description: 'Alerts sent', schema: { properties: { alertsSent: { type: 'number', example: 5 } } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  sendRenewalAlerts() {
    return this.insuranceService.sendRenewalAlerts().then((count) => ({
      alertsSent: count,
    }));
  }
}
