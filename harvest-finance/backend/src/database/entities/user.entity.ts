import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Order } from './order.entity';
import { Verification } from './verification.entity';
import { CreditScore } from './credit-score.entity';
import { UserOAuthLink } from './user-oauth-link.entity';
import { Session } from './session.entity';

/**
 * User roles in the agricultural marketplace
 */
export enum UserRole {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  INSPECTOR = 'INSPECTOR',
  ADMIN = 'ADMIN',
}

/**
 * User entity representing all participants in the marketplace
 *
 * Relationships:
 * - One User can have many Orders (as farmer)
 * - One User can have many Orders (as buyer)
 * - One User can have many Verifications (as inspector)
 * - One User can have one CreditScore (as farmer)
 */
@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_role', ['role'])
@Index('idx_users_stellar_address', ['stellarAddress'])
@Index('idx_users_solana_address', ['solanaAddress'])
@Index('idx_users_ethereum_address', ['ethereumAddress'])
@Index('idx_users_polygon_address', ['polygonAddress'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.FARMER,
  })
  role: UserRole;

  @Column({ name: 'stellar_address', nullable: true })
  stellarAddress: string | null;

  @Column({ name: 'solana_address', nullable: true })
  solanaAddress: string | null;

  @Column({ name: 'ethereum_address', nullable: true })
  ethereumAddress: string | null;

  @Column({ name: 'polygon_address', nullable: true })
  polygonAddress: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ name: 'profile_image_url', nullable: true })
  profileImageUrl: string | null;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date | null;

  @Column({ name: 'email_verified_at', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'email_verification_token', nullable: true })
  @Exclude()
  emailVerificationToken: string | null;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @Column({ name: 'reset_password_token', select: false, nullable: true })
  @Exclude()
  resetPasswordToken: string | null;

  @Column({ name: 'reset_password_expires', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ name: 'locked_until', nullable: true, default: null })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships

  /** Orders where user is the farmer (seller) */
  @OneToMany(() => Order, (order) => order.farmer)
  ordersAsFarmer: Order[];

  /** Orders where user is the buyer */
  @OneToMany(() => Order, (order) => order.buyer)
  ordersAsBuyer: Order[];

  /** Verifications performed by this user (if inspector) */
  @OneToMany(() => Verification, (verification) => verification.inspector)
  verifications: Verification[];

  /** Credit score for farmers */
  @OneToOne(() => CreditScore, (creditScore) => creditScore.farmer)
  creditScore: CreditScore;

  /** OAuth provider links */
  @OneToMany(() => UserOAuthLink, (link) => link.user)
  oauthLinks: UserOAuthLink[];
}
