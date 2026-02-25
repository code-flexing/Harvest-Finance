import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/verification.enums';

export interface NotificationPayload {
  userId: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('NotificationService initialized');
  }

  /**
   * Send notification - publishes event for async processing
   */
  async sendNotification(payload: NotificationPayload): Promise<Notification> {
    // Create notification record in database
    const notification = this.notificationRepository.create({
      ...payload,
      sentAt: new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Emit event for external handlers (email, SMS, etc.)
    this.eventEmitter.emit('notification.sent', {
      notification: savedNotification,
      type: payload.type,
    });

    this.logger.log(
      `Notification sent to ${payload.userEmail}: ${payload.type} - ${payload.title}`,
    );

    return savedNotification;
  }

  /**
   * Send verification submitted notification
   */
  async notifyVerificationSubmitted(
    inspectorId: string,
    inspectorEmail: string,
    deliveryId: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId: inspectorId,
      userEmail: inspectorEmail,
      type: NotificationType.VERIFICATION_SUBMITTED,
      title: 'Verification Submitted',
      message: `Your verification for delivery ${deliveryId} has been submitted and is pending approval.`,
      referenceId: deliveryId,
    });
  }

  /**
   * Send approval notification
   */
  async notifyApproved(
    userId: string,
    userEmail: string,
    deliveryId: string,
    approverName: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      userEmail,
      type: NotificationType.APPROVED,
      title: 'Verification Approved',
      message: `Your verification for delivery ${deliveryId} has been approved by ${approverName}.`,
      referenceId: deliveryId,
    });
  }

  /**
   * Send rejection notification
   */
  async notifyRejected(
    userId: string,
    userEmail: string,
    deliveryId: string,
    approverName: string,
    reason?: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      userEmail,
      type: NotificationType.REJECTED,
      title: 'Verification Rejected',
      message: reason
        ? `Your verification for delivery ${deliveryId} has been rejected by ${approverName}. Reason: ${reason}`
        : `Your verification for delivery ${deliveryId} has been rejected by ${approverName}.`,
      referenceId: deliveryId,
    });
  }

  /**
   * Send payment released notification
   */
  async notifyPaymentReleased(
    userId: string,
    userEmail: string,
    deliveryId: string,
    amount: number,
    transactionId: string,
  ): Promise<Notification> {
    return this.sendNotification({
      userId,
      userEmail,
      type: NotificationType.PAYMENT_RELEASED,
      title: 'Payment Released',
      message: `Payment of $${amount} has been released for delivery ${deliveryId}. Transaction ID: ${transactionId}`,
      referenceId: deliveryId,
    });
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, { isRead: true });
  }

  /**
   * Handle notification events - mock email/SMS sending
   */
  @OnEvent('notification.sent')
  handleNotificationSent(payload: { notification: Notification; type: NotificationType }) {
    // Mock email sending - in production, integrate with SendGrid, AWS SES, etc.
    this.logger.log(
      `[MOCK EMAIL] Sending ${payload.type} email to ${payload.notification.userEmail}`,
    );

    // Mock SMS sending - in production, integrate with Twilio, AWS SNS, etc.
    this.logger.log(`[MOCK SMS] Sending SMS notification to user ${payload.notification.userId}`);
  }
}
