export enum NotificationType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  REWARD = 'REWARD',
  SYSTEM = 'SYSTEM',
  VAULT_CREATED = 'VAULT_CREATED',
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  VAULT_MILESTONE = 'VAULT_MILESTONE',
  ERROR = 'ERROR',
}

export interface Notification {
  id: string;
  userId: string | null;
  adminOnly: boolean;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
