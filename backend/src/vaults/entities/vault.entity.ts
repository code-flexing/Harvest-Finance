import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Vault entity representing a yield-bearing vault in the Harvest Finance protocol.
 * Tracks total assets (TVL) and an all-time high watermark for social proof metrics.
 */
@Entity('vaults')
export class Vault {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'token_address' })
  tokenAddress: string;

  @Column({ type: 'varchar', name: 'owner_id' })
  ownerId: string;

  /**
   * Current total assets locked in the vault (TVL).
   * Stored as a decimal string to avoid floating-point precision loss.
   */
  @Column({
    type: 'numeric',
    precision: 36,
    scale: 18,
    default: '0',
    name: 'total_assets',
  })
  totalAssets: string;

  /**
   * All-time high TVL watermark for this vault.
   * Monotonically increasing — updated only when current TVL exceeds it.
   * Stored as a decimal string to avoid floating-point precision loss.
   */
  @Column({
    type: 'numeric',
    precision: 36,
    scale: 18,
    default: '0',
    name: 'tvl_at_high_watermark',
  })
  tvlAtHighWatermark: string;

  /**
   * Timestamp when the all-time high TVL watermark was last achieved.
   * Null until the first deposit sets the initial watermark.
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'watermark_achieved_at',
  })
  watermarkAchievedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
