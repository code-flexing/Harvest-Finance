import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { VerificationStatus } from '../enums/verification.enums';
import { Delivery } from './delivery.entity';
import { Approval } from './approval.entity';

@Entity('verifications')
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deliveryId: string;

  @ManyToOne(() => Delivery, (delivery) => delivery.verifications)
  @JoinColumn({ name: 'deliveryId' })
  delivery: Delivery;

  @Column()
  inspectorId: string;

  @Column({ nullable: true })
  ipfsImageHash: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLng: number;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: false })
  paymentReleased: boolean;

  @Column({ nullable: true })
  paymentTransactionId: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @OneToMany(() => Approval, (approval) => approval.verification)
  approvals: Approval[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
