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

@Entity('vault_score_history')
@Index('idx_vault_score_history_vault_date', ['vaultId', 'snapshotDate'], {
  unique: true,
})
export class VaultScoreHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vault_id', type: 'uuid' })
  vaultId: string;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;

  @Column({ type: 'int' })
  strategyScore: number;

  @Column({ type: 'int' })
  apyScore: number;

  @Column({ type: 'int' })
  tvlStabilityScore: number;

  @Column({ type: 'int' })
  drawdownScore: number;

  @Column({ type: 'int' })
  operatorScore: number;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}