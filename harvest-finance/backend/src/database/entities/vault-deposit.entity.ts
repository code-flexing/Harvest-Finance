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
import { User } from './user.entity';
import { Vault } from './vault.entity';

@Entity('vault_deposits')
@Index('idx_vault_deposits_user_vault', ['user', 'vault'], { unique: true })
export class VaultDeposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Vault, vault => vault.deposits)
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  balance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
