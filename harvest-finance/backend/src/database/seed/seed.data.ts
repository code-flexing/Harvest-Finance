import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { Verification, VerificationStatus } from '../entities/verification.entity';
import { CreditScore } from '../entities/credit-score.entity';

/**
 * Seed Data Configuration
 * 
 * This file contains sample data for testing and development purposes.
 * Run with: npm run seed
 */
export interface SeedConfig {
  users: Partial<User>[];
  orders: Partial<Order>[];
  transactions: Partial<Transaction>[];
  verifications: Partial<Verification>[];
  creditScores: Partial<CreditScore>[];
}

/**
 * Generate seed data for the database
 * 
 * This function creates sample data for all entities:
 * - 3 Farmers
 * - 2 Buyers
 * - 1 Inspector
 * - 1 Admin
 * - Multiple orders in various statuses
 * - Transactions and verifications
 * - Credit scores for farmers
 */
export async function generateSeedData(dataSource: DataSource): Promise<SeedConfig> {
  const userRepository = dataSource.getRepository(User);
  const orderRepository = dataSource.getRepository(Order);
  const transactionRepository = dataSource.getRepository(Transaction);
  const verificationRepository = dataSource.getRepository(Verification);
  const creditScoreRepository = dataSource.getRepository(CreditScore);

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const farmer1 = await userRepository.save({
    email: 'john.farmer@harvest.finance',
    password: hashedPassword,
    role: UserRole.FARMER,
    firstName: 'John',
    lastName: 'Smith',
    stellarAddress: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    phone: '+2348012345678',
    address: '123 Farm Road, Lagos, Nigeria',
    isActive: true,
  });

  const farmer2 = await userRepository.save({
    email: 'grace.farmer@harvest.finance',
    password: hashedPassword,
    role: UserRole.FARMER,
    firstName: 'Grace',
    lastName: 'Adamu',
    stellarAddress: 'GDEF2345678901BCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    phone: '+2348012345679',
    address: '456 Agriculture Ave, Abuja, Nigeria',
    isActive: true,
  });

  const farmer3 = await userRepository.save({
    email: 'michael.farmer@harvest.finance',
    password: hashedPassword,
    role: UserRole.FARMER,
    firstName: 'Michael',
    lastName: 'Okafor',
    stellarAddress: 'GHIJ3456789012CDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    phone: '+2348012345680',
    address: '789 Harvest Lane, Kano, Nigeria',
    isActive: true,
  });

  const buyer1 = await userRepository.save({
    email: 'emma.buyer@harvest.finance',
    password: hashedPassword,
    role: UserRole.BUYER,
    firstName: 'Emma',
    lastName: 'Johnson',
    stellarAddress: 'GKLN4567890123DEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    phone: '+2348012345681',
    address: 'Market Street, Lagos, Nigeria',
    isActive: true,
  });

  const buyer2 = await userRepository.save({
    email: 'david.buyer@harvest.finance',
    password: hashedPassword,
    role: UserRole.BUYER,
    firstName: 'David',
    lastName: 'Chukwu',
    stellarAddress: 'GMNO5678901234EFGHIJKLMNOPQRSTUVWXYZ1234567890',
    phone: '+2348012345682',
    address: 'Commerce Road, Port Harcourt, Nigeria',
    isActive: true,
  });

  const inspector = await userRepository.save({
    email: 'inspector@harvest.finance',
    password: hashedPassword,
    role: UserRole.INSPECTOR,
    firstName: 'Sarah',
    lastName: 'Williams',
    stellarAddress: 'GPQR6789012345FGHIJKLMNOPQRSTUVWXYZ1234567890',
    phone: '+2348012345683',
    address: 'Quality Control Office, Lagos, Nigeria',
    isActive: true,
  });

  const admin = await userRepository.save({
    email: 'admin@harvest.finance',
    password: hashedPassword,
    role: UserRole.ADMIN,
    firstName: 'Admin',
    lastName: 'User',
    stellarAddress: 'GSTU7890123456GHIJKLMNOPQRSTUVWXYZ1234567890',
    phone: '+2348012345684',
    address: 'Headquarters, Lagos, Nigeria',
    isActive: true,
  });

  // Create Orders
  const order1 = await orderRepository.save({
    farmerId: farmer1.id,
    buyerId: buyer1.id,
    cropType: 'Maize',
    quantity: 1000,
    quantityUnit: 'kg',
    price: 250000,
    status: OrderStatus.COMPLETED,
    description: 'High quality yellow maize, suitable for animal feed',
    deliveryAddress: 'Warehouse A, Lagos Port',
    expectedDeliveryDate: new Date('2024-03-15'),
    escrowTxHash: 'abc123def456',
  });

  const order2 = await orderRepository.save({
    farmerId: farmer2.id,
    buyerId: buyer1.id,
    cropType: 'Rice',
    quantity: 500,
    quantityUnit: 'kg',
    price: 300000,
    status: OrderStatus.IN_ESCROW,
    description: 'Premium long grain rice, well polished',
    deliveryAddress: 'Warehouse B, Apapa, Lagos',
    expectedDeliveryDate: new Date('2024-04-01'),
    escrowTxHash: 'def456ghi789',
  });

  const order3 = await orderRepository.save({
    farmerId: farmer1.id,
    buyerId: buyer2.id,
    cropType: 'Cassava',
    quantity: 2000,
    quantityUnit: 'kg',
    price: 100000,
    status: OrderStatus.PENDING,
    description: 'Fresh cassava tubers, high starch content',
    deliveryAddress: 'Warehouse C, Port Harcourt',
    expectedDeliveryDate: new Date('2024-04-15'),
  });

  const order4 = await orderRepository.save({
    farmerId: farmer3.id,
    buyerId: buyer2.id,
    cropType: 'Soybeans',
    quantity: 800,
    quantityUnit: 'kg',
    price: 280000,
    status: OrderStatus.ACCEPTED,
    description: 'Organic soybeans, non-GMO certified',
    deliveryAddress: 'Warehouse D, Kano',
    expectedDeliveryDate: new Date('2024-04-20'),
  });

  const order5 = await orderRepository.save({
    farmerId: farmer2.id,
    buyerId: buyer1.id,
    cropType: 'Tomatoes',
    quantity: 300,
    quantityUnit: 'kg',
    price: 90000,
    status: OrderStatus.CANCELLED,
    description: 'Fresh tomatoes, red and ripe',
    deliveryAddress: 'Warehouse A, Lagos',
    expectedDeliveryDate: new Date('2024-02-28'),
  });

  const order6 = await orderRepository.save({
    farmerId: farmer3.id,
    buyerId: buyer1.id,
    cropType: 'Groundnuts',
    quantity: 600,
    quantityUnit: 'kg',
    price: 180000,
    status: OrderStatus.EXPIRED,
    description: 'Quality groundnuts, ready for processing',
    deliveryAddress: 'Warehouse B, Abuja',
    expectedDeliveryDate: new Date('2024-01-15'),
  });

  // Create Transactions
  const transaction1 = await transactionRepository.save({
    orderId: order1.id,
    stellarTxHash: 'tx1234567890abcdef',
    amount: 250000,
    assetCode: 'USDC',
    assetIssuer: 'GA5ZSEJYJ37T3KNRG4B3GWGZ3Z5J6B7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    status: TransactionStatus.CONFIRMED,
    type: TransactionType.ESCROW_DEPOSIT,
    sourceAccount: buyer1.stellarAddress,
    destinationAccount: farmer1.stellarAddress,
    stellarMemo: 'Order-001',
    confirmedAt: new Date('2024-02-10'),
    memo: 'Payment for maize order #1',
  });

  const transaction2 = await transactionRepository.save({
    orderId: order1.id,
    stellarTxHash: 'tx2345678901bcdefg',
    amount: 250000,
    assetCode: 'USDC',
    assetIssuer: 'GA5ZSEJYJ37T3KNRG4B3GWGZ3Z5J6B7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    status: TransactionStatus.CONFIRMED,
    type: TransactionType.ESCROW_RELEASE,
    sourceAccount: 'escrow_account',
    destinationAccount: farmer1.stellarAddress,
    stellarMemo: 'Order-001-release',
    confirmedAt: new Date('2024-03-16'),
    memo: 'Release payment for completed order #1',
  });

  const transaction3 = await transactionRepository.save({
    orderId: order2.id,
    stellarTxHash: 'tx3456789012cdefgh',
    amount: 300000,
    assetCode: 'USDC',
    assetIssuer: 'GA5ZSEJYJ37T3KNRG4B3GWGZ3Z5J6B7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    status: TransactionStatus.PENDING,
    type: TransactionType.ESCROW_DEPOSIT,
    sourceAccount: buyer1.stellarAddress,
    destinationAccount: 'escrow_account',
    stellarMemo: 'Order-002',
    memo: 'Escrow deposit for rice order #2',
  });

  const transaction4 = await transactionRepository.save({
    orderId: order5.id,
    stellarTxHash: 'tx4567890123defghi',
    amount: 90000,
    assetCode: 'USDC',
    assetIssuer: 'GA5ZSEJYJ37T3KNRG4B3GWGZ3Z5J6B7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    status: TransactionStatus.CANCELLED,
    type: TransactionType.ESCROW_REFUND,
    sourceAccount: 'escrow_account',
    destinationAccount: buyer1.stellarAddress,
    stellarMemo: 'Order-005-refund',
    memo: 'Refund for cancelled tomatoes order #5',
  });

  // Create Verifications
  const verification1 = await verificationRepository.save({
    orderId: order1.id,
    inspectorId: inspector.id,
    proofHash: 'ipfs://QmProof1234567890',
    status: VerificationStatus.APPROVED,
    notes: 'Quality verified. Maize meets all standards.',
    inspectionDate: new Date('2024-03-14'),
    cropQuality: 'A+',
    quantityVerified: 1000,
    verificationDocuments: ['ipfs://QmDoc1', 'ipfs://QmDoc2'],
    approvedAt: new Date('2024-03-14'),
  });

  const verification2 = await verificationRepository.save({
    orderId: order2.id,
    inspectorId: inspector.id,
    proofHash: 'ipfs://QmProof2345678901',
    status: VerificationStatus.PENDING,
    notes: 'Inspection scheduled for tomorrow',
    inspectionDate: new Date('2024-03-25'),
    cropQuality: null,
    quantityVerified: null,
    verificationDocuments: null,
  });

  const verification3 = await verificationRepository.save({
    orderId: order4.id,
    inspectorId: inspector.id,
    proofHash: 'ipfs://QmProof3456789012',
    status: VerificationStatus.APPROVED,
    notes: 'Organic certification verified. All quality checks passed.',
    inspectionDate: new Date('2024-03-18'),
    cropQuality: 'A',
    quantityVerified: 800,
    verificationDocuments: ['ipfs://QmDoc3', 'ipfs://QmDoc4'],
    approvedAt: new Date('2024-03-18'),
  });

  const verification4 = await verificationRepository.save({
    orderId: order5.id,
    inspectorId: inspector.id,
    proofHash: 'ipfs://QmProof4567890123',
    status: VerificationStatus.REJECTED,
    notes: 'Tomatoes were overripe and not suitable for delivery.',
    inspectionDate: new Date('2024-02-25'),
    cropQuality: 'C',
    quantityVerified: 250,
    verificationDocuments: ['ipfs://QmDoc5'],
    rejectedAt: new Date('2024-02-25'),
  });

  // Create Credit Scores
  const creditScore1 = await creditScoreRepository.save({
    farmerId: farmer1.id,
    score: 850,
    totalTransactions: 15,
    successfulTransactions: 14,
    failedTransactions: 1,
    totalVolume: 2500000,
    averageRating: 4.5,
    totalRatings: 12,
    history: [
      {
        date: new Date('2024-01-01'),
        score: 780,
        reason: 'Initial score',
      },
      {
        date: new Date('2024-02-01'),
        score: 800,
        reason: 'Successful order completed',
        orderId: order1.id,
      },
      {
        date: new Date('2024-03-15'),
        score: 850,
        reason: 'Excellent delivery and quality',
        orderId: order1.id,
      },
    ],
    lastUpdated: new Date('2024-03-15'),
    lastOrderId: order1.id,
  });

  const creditScore2 = await creditScoreRepository.save({
    farmerId: farmer2.id,
    score: 720,
    totalTransactions: 8,
    successfulTransactions: 7,
    failedTransactions: 1,
    totalVolume: 1200000,
    averageRating: 4.0,
    totalRatings: 6,
    history: [
      {
        date: new Date('2024-01-15'),
        score: 700,
        reason: 'Initial score',
      },
      {
        date: new Date('2024-02-20'),
        score: 720,
        reason: 'Successful transaction',
        orderId: order2.id,
      },
    ],
    lastUpdated: new Date('2024-02-20'),
    lastOrderId: order2.id,
  });

  const creditScore3 = await creditScoreRepository.save({
    farmerId: farmer3.id,
    score: 650,
    totalTransactions: 3,
    successfulTransactions: 3,
    failedTransactions: 0,
    totalVolume: 450000,
    averageRating: 3.8,
    totalRatings: 2,
    history: [
      {
        date: new Date('2024-02-01'),
        score: 650,
        reason: 'Initial score',
      },
    ],
    lastUpdated: new Date('2024-02-01'),
    lastOrderId: order4.id,
  });

  console.log('✅ Seed data created successfully!');
  console.log(`   - Users: 7 (3 farmers, 2 buyers, 1 inspector, 1 admin)`);
  console.log(`   - Orders: 6 (various statuses)`);
  console.log(`   - Transactions: 4`);
  console.log(`   - Verifications: 4`);
  console.log(`   - Credit Scores: 3`);

  return {
    users: [farmer1, farmer2, farmer3, buyer1, buyer2, inspector, admin],
    orders: [order1, order2, order3, order4, order5, order6],
    transactions: [transaction1, transaction2, transaction3, transaction4],
    verifications: [verification1, verification2, verification3, verification4],
    creditScores: [creditScore1, creditScore2, creditScore3],
  };
}

/**
 * Clear all seed data from the database
 */
export async function clearSeedData(dataSource: DataSource): Promise<void> {
  await dataSource.query('DELETE FROM credit_scores');
  await dataSource.query('DELETE FROM verifications');
  await dataSource.query('DELETE FROM transactions');
  await dataSource.query('DELETE FROM orders');
  await dataSource.query('DELETE FROM users');
  console.log('✅ Seed data cleared!');
}
