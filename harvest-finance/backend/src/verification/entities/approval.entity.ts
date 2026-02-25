import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApprovalRole } from '../enums/verification.enums';
import { Verification } from './verification.entity';

@Entity('approvals')
export class Approval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  verificationId: string;

  @ManyToOne(() => Verification, (verification) => verification.approvals)
  @JoinColumn({ name: 'verificationId' })
  verification: Verification;

  @Column()
  approverId: string;

  @Column({
    type: 'enum',
    enum: ApprovalRole,
  })
  role: ApprovalRole;

  @Column({ default: false })
  approved: boolean;

  @Column({ nullable: true })
  comments: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
