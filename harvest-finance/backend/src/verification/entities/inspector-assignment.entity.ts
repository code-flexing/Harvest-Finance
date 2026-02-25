import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Delivery } from './delivery.entity';

@Entity('inspector_assignments')
export class InspectorAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deliveryId: string;

  @ManyToOne(() => Delivery, (delivery) => delivery.inspectorAssignments)
  @JoinColumn({ name: 'deliveryId' })
  delivery: Delivery;

  @Column()
  inspectorId: string;

  @Column()
  inspectorName: string;

  @Column({ nullable: true })
  inspectorEmail: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  assignedBy: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  assignedAt: Date;
}
