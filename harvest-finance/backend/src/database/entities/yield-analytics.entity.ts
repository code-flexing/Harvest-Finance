import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('yield_analytics')
@Index('idx_yield_analytics_contract', ['contractId'])
@Index('idx_yield_analytics_date', ['date'])
@Index('idx_yield_analytics_7day_apy', ['sevenDayApy'])
export class YieldAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 128 })
  contractId: string;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({
    name: 'total_assets',
    type: 'decimal',
    precision: 36,
    scale: 18,
    default: 0,
  })
  totalAssets: string;

  @Column({
    name: 'total_shares',
    type: 'decimal',
    precision: 36,
    scale: 18,
    default: 0,
  })
  totalShares: string;

  @Column({ name: 'hardwork_events_count', type: 'int', default: 0 })
  hardworkEventsCount: number;

  @Column({
    name: 'seven_day_apy',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  sevenDayApy: number | null;

  @Column({
    name: 'daily_apy',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  dailyApy: number | null;

  @Column({
    name: 'price_per_share',
    type: 'decimal',
    precision: 36,
    scale: 18,
    default: 0,
  })
  pricePerShare: string;

  @Column({
    name: 'price_per_share_previous',
    type: 'decimal',
    precision: 36,
    scale: 18,
    nullable: true,
  })
  pricePerSharePrevious: string | null;

  @Column({
    name: 'volume_24h',
    type: 'decimal',
    precision: 36,
    scale: 18,
    default: 0,
  })
  volume24h: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
