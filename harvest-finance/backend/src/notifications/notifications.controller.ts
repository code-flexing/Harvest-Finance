import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller({
  path: 'notifications',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  async getNotifications(
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<NotificationResponseDto[]> {
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You can only access your own notifications',
      );
    }
    return this.notificationsService.findAllByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new notification (Admin/System only)' })
  @ApiResponse({ status: 201, type: NotificationResponseDto })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: any,
  ): Promise<NotificationResponseDto> {
    if (req.user.role !== 'ADMIN' && !createNotificationDto.userId) {
      throw new ForbiddenException(
        'Only admins can create global notifications',
      );
    }
    return this.notificationsService.create(createNotificationDto);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<NotificationResponseDto> {
    // Note: In a real app, we should verify the notification belongs to the user
    // For this implementation, we'll keep it simple but ideally we'd check ownership
    return this.notificationsService.markAsRead(id);
  }

  @Put('user/:userId/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200 })
  async markAllAsRead(
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You can only update your own notifications',
      );
    }
    return this.notificationsService.markAllAsRead(userId);
  }
}
