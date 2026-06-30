import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import {
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto';

const DEFAULT_PREFERENCES: NotificationPreferencesDto = {
  depositConfirmed: { email: true, sms: false, push: true, inApp: true },
  withdrawalCompleted: { email: true, sms: false, push: true, inApp: true },
  vaultPaused: { email: true, sms: true, push: true, inApp: true },
  securityAlert: { email: true, sms: true, push: true, inApp: true },
  yieldMilestone: { email: true, sms: false, push: true, inApp: true },
};

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.notificationPreferences || DEFAULT_PREFERENCES;
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPreferences = user.notificationPreferences || DEFAULT_PREFERENCES;
    const mergedPreferences = {
      ...currentPreferences,
      ...updateDto.preferences,
    };

    await this.userRepository.update(
      { id: userId },
      { notificationPreferences: mergedPreferences },
    );

    return mergedPreferences;
  }

  /**
   * Check if a user has enabled a specific notification channel for an event
   */
  async isChannelEnabledForEvent(
    userId: string,
    eventType: string,
    channel: string,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    if (!preferences[eventType]) {
      // Default to true if event type not found
      return true;
    }

    const channelEnabled = preferences[eventType][channel];
    return channelEnabled !== false; // Default to true if not explicitly set
  }

  /**
   * Get all enabled channels for an event
   */
  async getEnabledChannelsForEvent(
    userId: string,
    eventType: string,
  ): Promise<string[]> {
    const preferences = await this.getPreferences(userId);

    if (!preferences[eventType]) {
      // Default all channels enabled if event type not found
      return ['email', 'sms', 'push', 'inApp'];
    }

    return Object.entries(preferences[eventType])
      .filter(([, enabled]) => enabled === true)
      .map(([channel]) => channel);
  }
}
