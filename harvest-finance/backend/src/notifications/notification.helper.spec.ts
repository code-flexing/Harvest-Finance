import { NotificationType } from '../database/entities/notification.entity';
import { NotificationHelper } from './notification.helper';

describe('NotificationHelper', () => {
  it('builds large deposit admin alerts', () => {
    expect(
      NotificationHelper.largeDepositAlert({
        amount: 12000,
        vaultName: 'Maize Vault',
      }),
    ).toEqual({
      title: 'Large Deposit Alert',
      message:
        'A large deposit of 12000 has been initiated for vault Maize Vault.',
      type: NotificationType.LARGE_TRANSACTION,
      adminOnly: true,
    });
  });

  it('builds user deposit confirmation notifications', () => {
    expect(
      NotificationHelper.depositConfirmed({
        userId: 'user-1',
        amount: '500.25',
        vaultId: 'vault-1',
      }),
    ).toEqual({
      userId: 'user-1',
      title: 'Deposit Confirmed',
      message: 'Your deposit of 500.25 into vault vault-1 has been confirmed.',
      type: NotificationType.DEPOSIT,
    });
  });

  it('builds user withdrawal confirmation notifications', () => {
    expect(
      NotificationHelper.withdrawalConfirmed({
        userId: 'user-1',
        amount: 250,
        vaultName: 'Cassava Vault',
      }),
    ).toEqual({
      userId: 'user-1',
      title: 'Withdrawal Confirmed',
      message:
        'Your withdrawal of 250 from vault Cassava Vault has been confirmed.',
      type: NotificationType.WITHDRAWAL,
    });
  });

  it('builds insurance activation notifications', () => {
    const coverageStart = new Date('2026-01-01T00:00:00.000Z');
    const coverageEnd = new Date('2026-12-31T00:00:00.000Z');

    expect(
      NotificationHelper.insuranceActivated({
        userId: 'user-1',
        planName: 'Basic Cover',
        monthlyPremium: 18.5,
        coverageStart,
        coverageEnd,
      }),
    ).toEqual({
      userId: 'user-1',
      title: 'Insurance Plan Activated',
      message: `Your "Basic Cover" crop insurance is now active. Monthly premium: $18.50. Coverage period: ${coverageStart.toLocaleDateString()} - ${coverageEnd.toLocaleDateString()}.`,
      type: NotificationType.INSURANCE,
    });
  });

  it('builds reward claim notifications', () => {
    expect(
      NotificationHelper.rewardsClaimed({
        userId: 'user-1',
        claimedAmount: 1.234567891,
        vaultId: 'vault-1',
        vaultName: 'Rice Vault',
      }),
    ).toEqual({
      userId: 'user-1',
      title: 'Rewards Claimed',
      message:
        'You have successfully claimed 1.23456789 in rewards from vault Rice Vault.',
      type: NotificationType.REWARD,
    });
  });
});
