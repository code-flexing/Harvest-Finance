import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../database/entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Create a new notification
   */
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      userId: createNotificationDto.userId || null,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);
    return this.mapToResponseDto(savedNotification);
  }

  /**
   * Get notifications for a user
   */
  async findAllByUser(userId: string): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.find({
      where: [
        { userId, adminOnly: false },
        { adminOnly: true }, // Admins see admin alerts, but for now let's assume filtering happens at controller level if needed
      ],
      order: { createdAt: 'DESC' },
    });

    return notifications.map((n) => this.mapToResponseDto(n));
  }

  /**
   * Get admin notifications
   */
  async findAdminNotifications(): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.find({
      where: { adminOnly: true },
      order: { createdAt: 'DESC' },
    });

    return notifications.map((n) => this.mapToResponseDto(n));
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    notification.isRead = true;
    const updatedNotification =
      await this.notificationRepository.save(notification);
    return this.mapToResponseDto(updatedNotification);
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    return { success: true };
  }

  /**
   * Map Entity to Response DTO
   */
  private mapToResponseDto(
    notification: Notification,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      adminOnly: notification.adminOnly,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
