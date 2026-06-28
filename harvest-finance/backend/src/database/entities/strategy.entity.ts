import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CompoundingFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export const COMPOUNDING_FREQUENCY_N: Record<CompoundingFrequency, number> = {
  [CompoundingFrequency.DAILY]: 365,
  [CompoundingFrequency.WEEKLY]: 52,
  [CompoundingFrequency.MONTHLY]: 12,
};

@Entity('strategies')
export class Strategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: CompoundingFrequency,
    default: CompoundingFrequency.DAILY,
  })
  compoundingFrequency: CompoundingFrequency;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
