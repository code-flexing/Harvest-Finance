@Entity('vaults')
@Index('idx_vaults_owner', ['ownerId'])
@Index('idx_vaults_type', ['type'])
@Index('idx_vaults_status', ['status'])
export class Vault {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'enum', enum: VaultType, default: VaultType.CROP_PRODUCTION })
  type: VaultType;

  @Column({ type: 'enum', enum: VaultStatus, default: VaultStatus.ACTIVE })
  status: VaultStatus;

  @Column({ name: 'vault_name', length: 100 })
  vaultName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 20, default: 'HVF' })
  symbol: string;

  @Column({ name: 'asset_pair', length: 50, default: 'XLM/USDC' })
  assetPair: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalDeposits: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  maxCapacity: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  interestRate: number;

  @Column({
    name: 'strategy_score',
    type: 'float',
    default: 0,
    nullable: true,
  })
  strategyScore: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.5 })
  depositorConcentrationThreshold: number;

  @Column({
    name: 'compounding_frequency',
    type: 'varchar',
    length: 20,
    default: 'daily',
  })
  compoundingFrequency: 'daily' | 'weekly' | 'monthly';

  @Column({
    type: 'timestamp with time zone',
    name: 'maturity_date',
    nullable: true,
  })
  maturityDate: Date | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'lock_period_end',
    nullable: true,
  })
  lockPeriodEnd: Date | null;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'requires_multi_signature', default: false })
  requiresMultiSignature: boolean;

  @Column({ name: 'approval_threshold', type: 'int', default: 1 })
  approvalThreshold: number;

  @Column({ name: 'current_approvals', type: 'int', default: 0 })
  currentApprovals: number;

  @Column({ name: 'strategy_id', type: 'uuid', nullable: true })
  strategyId: string | null;

  @ManyToOne(() => Strategy, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'strategy_id' })
  strategy: Strategy | null;

  @Column({
    name: 'stellar_account_address',
    length: 56,
    nullable: true,
    default: null,
  })
  stellarAccountAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Deposit, (deposit) => deposit.vault)
  deposits: Deposit[];

  @OneToMany(() => VaultApproval, (approval) => approval.vault)
  approvals: VaultApproval[];

  get apr(): number {
    return Number(this.interestRate);
  }

  get apy(): number {
    const apr = Number(this.interestRate);
    if (apr === 0) return 0;

    const frequency =
      this.strategy?.compoundingFrequency ??
      CompoundingFrequency.DAILY;

    const n = COMPOUNDING_FREQUENCY_N[frequency];
    const decimalApr = apr / 100;

    return Math.pow(1 + decimalApr / n, n) - 1;
  }

  get availableCapacity(): number {
    return Number(this.maxCapacity) - Number(this.totalDeposits);
  }

  get utilizationPercentage(): number {
    if (Number(this.maxCapacity) === 0) return 0;

    return (
      (Number(this.totalDeposits) / Number(this.maxCapacity)) * 100
    );
  }

  get isFullCapacity(): boolean {
    return Number(this.totalDeposits) >= Number(this.maxCapacity);
  }

  get requiresApproval(): boolean {
    return (
      this.requiresMultiSignature &&
      this.currentApprovals < this.approvalThreshold
    );
  }

  get approvalStatus(): string {
    if (!this.requiresMultiSignature) return 'NOT_REQUIRED';
    if (this.currentApprovals >= this.approvalThreshold) return 'APPROVED';
    return 'PENDING';
  }
}