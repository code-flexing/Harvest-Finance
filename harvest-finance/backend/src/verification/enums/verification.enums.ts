/**
 * Verification status enum
 * Represents the lifecycle states of a delivery verification
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

/**
 * Approval role enum
 * Represents the different roles required for multi-signature verification
 */
export enum ApprovalRole {
  INSPECTOR = 'INSPECTOR',
  SUPERVISOR = 'SUPERVISOR',
  CLIENT = 'CLIENT',
}

/**
 * Notification type enum
 * Represents different types of notifications sent to users
 */
export enum NotificationType {
  VERIFICATION_SUBMITTED = 'VERIFICATION_SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAYMENT_RELEASED = 'PAYMENT_RELEASED',
}

/**
 * Delivery status enum
 * Represents the lifecycle states of a delivery
 */
export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED',
}
