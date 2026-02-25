import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { VerificationStatus, DeliveryStatus } from '../enums/verification.enums';
import { Verification } from './verification.entity';
import { InspectorAssignment } from './inspector-assignment.entity';

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  destinationLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  destinationLng: number;

  @Column({ nullable: true })
  destinationAddress: string;

  @Column({ nullable: true })
  recipientName: string;

  @Column({ nullable: true })
  recipientPhone: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ default: false })
  isLockedForAssignment: boolean;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => Verification, (verification) => verification.delivery)
  verifications: Verification[];

  @OneToMany(
    () => InspectorAssignment,
    (assignment) => assignment.delivery,
  )
  inspectorAssignments: InspectorAssignment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
