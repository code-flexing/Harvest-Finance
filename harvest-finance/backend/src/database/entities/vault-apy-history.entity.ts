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
@Index('idx_vault_apy_history_vault', ['vaultId'])
@Index('idx_vault_apy_history_date', ['date'])
export class VaultApyHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 0,
  })
  apy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;
}
