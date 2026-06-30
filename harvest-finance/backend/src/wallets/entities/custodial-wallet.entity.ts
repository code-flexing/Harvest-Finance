import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../database/entities/user.entity';

/**
 * Stores encrypted Stellar keypairs for custodial wallet users.
 *
 * Security model:
 * - The private key is encrypted with AES-256-GCM.
 * - The encryption key is derived from the user's plaintext password via Argon2id,
 *   using a unique per-wallet salt plus a platform-level pepper (env var).
 * - The platform cannot decrypt the private key without the user's password.
 * - All Argon2 parameters (memory, iterations, parallelism) are stored alongside
 *   the ciphertext so they can be updated on future logins without re-encryption.
 */
@Entity('custodial_wallets')
@Index('idx_custodial_wallets_user_id', ['userId'], { unique: true })
@Index('idx_custodial_wallets_public_key', ['publicKey'], { unique: true })
export class CustodialWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK to the owning user. One user → at most one custodial wallet. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Stellar G-address (public key) — safe to store in plaintext. */
  @Column({ name: 'public_key', length: 56 })
  publicKey: string;

  /**
   * AES-256-GCM ciphertext of the Stellar secret key (S-address).
   * Stored as a hex string. Never returned to clients.
   */
  @Column({ name: 'encrypted_secret_key', type: 'text', select: false })
  encryptedSecretKey: string;

  /**
   * 96-bit (12-byte) AES-GCM initialisation vector.
   * Unique per encryption operation. Stored as hex. Not secret, but must be unique.
   */
  @Column({ name: 'iv', length: 24, select: false })
  iv: string;

  /**
   * 128-bit (16-byte) AES-GCM authentication tag.
   * Verifies ciphertext integrity and authenticates decryption.
   * Stored as hex.
   */
  @Column({ name: 'auth_tag', length: 32, select: false })
  authTag: string;

  /**
   * JSON-serialised Argon2 parameters used during key derivation.
   * Allows future migration to stronger parameters without forcing re-registration.
   * Shape: { salt: string (hex), memoryCost: number, timeCost: number, parallelism: number }
   */
  @Column({ name: 'argon2_params', type: 'jsonb', select: false })
  argon2Params: {
    salt: string;
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
