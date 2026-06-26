import { NotificationType } from '../database/entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

export interface LargeDepositNotificationParams {
  amount: number;
  vaultName: string;
}

export interface DepositConfirmedNotificationParams {
  userId: string;
  amount: number | string;
  vaultId: string;
}

export interface WithdrawalConfirmedNotificationParams {
  userId: string;
  amount: number;
  vaultName: string;
}

export interface InsuranceActivatedNotificationParams {
  userId: string;
  planName: string;
  monthlyPremium: number;
  coverageStart: Date;
  coverageEnd: Date;
}

export interface InsuranceRenewalNotificationParams {
  userId: string;
  planName: string;
  coverageEnd: Date | string;
  cropType: string;
}

export interface RewardsClaimedNotificationParams {
  userId: string;
  claimedAmount: number;
  vaultId?: string;
  vaultName: string;
}

export class NotificationHelper {
  static largeDepositAlert(
    params: LargeDepositNotificationParams,
  ): CreateNotificationDto {
    return {
      title: 'Large Deposit Alert',
      message: `A large deposit of ${params.amount} has been initiated for vault ${params.vaultName}.`,
      type: NotificationType.LARGE_TRANSACTION,
      adminOnly: true,
    };
  }

  static depositConfirmed(
    params: DepositConfirmedNotificationParams,
  ): CreateNotificationDto {
    return {
      userId: params.userId,
      title: 'Deposit Confirmed',
      message: `Your deposit of ${params.amount} into vault ${params.vaultId} has been confirmed.`,
      type: NotificationType.DEPOSIT,
    };
  }

  static withdrawalConfirmed(
    params: WithdrawalConfirmedNotificationParams,
  ): CreateNotificationDto {
    return {
      userId: params.userId,
      title: 'Withdrawal Confirmed',
      message: `Your withdrawal of ${params.amount} from vault ${params.vaultName} has been confirmed.`,
      type: NotificationType.WITHDRAWAL,
    };
  }

  static insuranceActivated(
    params: InsuranceActivatedNotificationParams,
  ): CreateNotificationDto {
    return {
      userId: params.userId,
      title: 'Insurance Plan Activated',
      message: `Your "${params.planName}" crop insurance is now active. Monthly premium: $${params.monthlyPremium.toFixed(2)}. Coverage period: ${params.coverageStart.toLocaleDateString()} - ${params.coverageEnd.toLocaleDateString()}.`,
      type: NotificationType.INSURANCE,
    };
  }

  static insuranceRenewalReminder(
    params: InsuranceRenewalNotificationParams,
  ): CreateNotificationDto {
    return {
      userId: params.userId,
      title: 'Insurance Renewal Reminder',
      message: `Your "${params.planName}" insurance coverage expires on ${new Date(params.coverageEnd).toLocaleDateString()}. Renew now to maintain protection for your ${params.cropType} crop.`,
      type: NotificationType.INSURANCE,
    };
  }

  static rewardsClaimed(
    params: RewardsClaimedNotificationParams,
  ): CreateNotificationDto {
    const source = params.vaultId ? `vault ${params.vaultName}` : 'all vaults';

    return {
      userId: params.userId,
      title: 'Rewards Claimed',
      message: `You have successfully claimed ${params.claimedAmount.toFixed(8)} in rewards from ${source}.`,
      type: NotificationType.REWARD,
    };
  }
}
