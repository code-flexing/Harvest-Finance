import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vault } from './vault.entity';

@Entity('vault_apy_history')
@Index('idx_vault_apy_history_vault_date', ['vaultId', 'snapshotDate'], {
  unique: true,
})
@Index('idx_vault_apy_history_vault', ['vaultId'])
@Index('idx_vault_apy_history_snapshot_date', ['snapshotDate'])
export class VaultApyHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vault_id', type: 'uuid' })
  vaultId: string;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  apr: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  apy: number;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
