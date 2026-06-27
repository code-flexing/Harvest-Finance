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
import { Vault } from './vault.entity';
import { User } from './user.entity';

@Entity('vault_approvals')
@Index('idx_vault_approvals_vault', ['vaultId'])
@Index('idx_vault_approvals_user', ['userId'])
export class VaultApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault: Vault;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
