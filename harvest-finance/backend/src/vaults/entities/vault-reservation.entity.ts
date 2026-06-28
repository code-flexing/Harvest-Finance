import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vault } from '../../database/entities/vault.entity';

@Entity('vault_reservations')
@Index('idx_vault_reservations_vault_id', ['vaultId'])
@Index('idx_vault_reservations_wallet_address', ['walletAddress'])
@Index('idx_vault_reservations_active', ['vaultId', 'isActive', 'expiresAt'])
export class VaultReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;

  @Column({ name: 'wallet_address' })
  walletAddress: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, name: 'reserved_amount' })
  reservedAmount: number;

  @Column({ type: 'timestamp with time zone', name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
