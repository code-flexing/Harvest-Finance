import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('indexer_state')
export class IndexerState {
  @PrimaryColumn({ name: 'contract_id', type: 'varchar', length: 128 })
  contractId: string;

  @Column({ name: 'last_cursor', type: 'varchar', length: 256 })
  lastCursor: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
