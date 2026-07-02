import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

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
@Index('idx_strategies_compounding_frequency', ['compoundingFrequency'])
export class Strategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    name: 'compounding_frequency',
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
