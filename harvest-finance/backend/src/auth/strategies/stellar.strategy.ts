import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as StellarSdk from '@stellar/stellar-sdk';
import { User, UserRole } from '../../database/entities/user.entity';

// Minimal placeholder strategy class for PassportStrategy
class StellarPlaceholderStrategy {
  authenticate() {}
}

export interface StellarPayload {
  stellar_address: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class StellarStrategy extends PassportStrategy(
  StellarPlaceholderStrategy,
  'stellar',
) {
  private readonly serverKeypair: StellarSdk.Keypair;
  private readonly networkPassphrase: string;
  private readonly challengeTimeout: number = 300; // 5 minutes

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();

    const serverSecret = configService.get<string>('STELLAR_SERVER_SECRET');
    if (!serverSecret) {
      throw new Error('STELLAR_SERVER_SECRET environment variable is required');
    }

    this.serverKeypair = StellarSdk.Keypair.fromSecret(serverSecret);
    this.networkPassphrase =
      configService.get<string>('STELLAR_NETWORK_PASSPHRASE') ||
      (configService.get<string>('NODE_ENV') === 'production'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET);
  }

  /**
   * Generate a challenge transaction for SEP-10 authentication
   */
  async generateChallenge(clientPublicKey: string): Promise<string> {
    try {
      // Validate client public key
      const clientKeypair = StellarSdk.Keypair.fromPublicKey(clientPublicKey);

      // Create server account with invalid sequence number (0) to prevent execution
      const serverAccount = new StellarSdk.Account(
        this.serverKeypair.publicKey(),
        '0',
      );

      // Set time bounds (5 minutes from now)
      const now = Math.floor(Date.now() / 1000);
      const timebounds = {
        minTime: now.toString(),
        maxTime: (now + this.challengeTimeout).toString(),
      };

      // Create ManageData operation
      const operation = StellarSdk.Operation.manageData({
        source: clientPublicKey,
        name: 'Harvest Finance auth',
        value: this.generateRandomNonce(),
      });

      // Build transaction
      const transaction = new StellarSdk.TransactionBuilder(serverAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
        timebounds,
      })
        .addOperation(operation)
        .build();

      // Sign with server key
      transaction.sign(this.serverKeypair);

      // Return XDR
      return transaction.toEnvelope().toXDR('base64');
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate challenge: ${error.message}`,
      );
    }
  }

  /**
   * Validate the signed challenge transaction and authenticate user
   */
  async validate(transactionXdr: string): Promise<User> {
    try {
      // Parse transaction
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        transactionXdr,
        this.networkPassphrase,
      ) as StellarSdk.Transaction;

      // Validate transaction structure
      this.validateTransactionStructure(transaction);

      // Verify server signature
      this.verifyServerSignature(transaction);

      // Get client public key from operation
      const clientPublicKey = transaction.operations[0].source as string;

      // Verify client signature
      this.verifyClientSignature(transaction, clientPublicKey);

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { stellarAddress: clientPublicKey },
      });

      if (!user) {
        // Create new user for Stellar authentication
        const newUser = new User();
        newUser.stellarAddress = clientPublicKey;
        newUser.email = '';
        newUser.password = '';
        newUser.role = UserRole.FARMER;
        newUser.firstName = 'Stellar';
        newUser.lastName = 'User';
        newUser.isActive = true;
        user = await this.userRepository.save(newUser);
      } else if (!user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }

      // Update last login
      await this.userRepository.update(user.id, { lastLogin: new Date() });

      return user;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException(
        `Authentication failed: ${error.message}`,
      );
    }
  }

  /**
   * Validate transaction structure according to SEP-10
   */
  private validateTransactionStructure(
    transaction: StellarSdk.Transaction,
  ): void {
    // Check source account is server
    if (transaction.source !== this.serverKeypair.publicKey()) {
      throw new UnauthorizedException('Invalid source account');
    }

    // Check sequence number is 0 (invalid)
    if (transaction.sequence !== '0') {
      throw new UnauthorizedException('Invalid sequence number');
    }

    // Check time bounds
    const now = Math.floor(Date.now() / 1000);
    const minTime = parseInt(transaction.timeBounds?.minTime || '0');
    const maxTime = parseInt(transaction.timeBounds?.maxTime || '0');

    if (now < minTime || now > maxTime) {
      throw new UnauthorizedException('Challenge transaction expired');
    }

    // Check operations
    if (transaction.operations.length !== 1) {
      throw new UnauthorizedException('Invalid number of operations');
    }

    const operation = transaction.operations[0];
    if (operation.type !== 'manageData') {
      throw new UnauthorizedException('Invalid operation type');
    }

    if (operation.name !== 'Harvest Finance auth') {
      throw new UnauthorizedException('Invalid operation name');
    }
  }

  /**
   * Verify server signature on transaction
   */
  private verifyServerSignature(transaction: StellarSdk.Transaction): void {
    const hash = transaction.hash();
    const serverSignature = transaction.signatures.find((sig) => {
      try {
        return this.serverKeypair.verify(hash, sig.signature());
      } catch {
        return false;
      }
    });

    if (!serverSignature) {
      throw new UnauthorizedException('Server signature missing or invalid');
    }
  }

  /**
   * Verify client signature on transaction
   */
  private verifyClientSignature(
    transaction: StellarSdk.Transaction,
    clientPublicKey: string,
  ): void {
    const hash = transaction.hash();
    const clientKeypair = StellarSdk.Keypair.fromPublicKey(clientPublicKey);

    const clientSignature = transaction.signatures.find((sig) => {
      try {
        return clientKeypair.verify(hash, sig.signature());
      } catch {
        return false;
      }
    });

    if (!clientSignature) {
      throw new UnauthorizedException('Client signature missing or invalid');
    }
  }

  /**
   * Generate random nonce for challenge
   */
  private generateRandomNonce(): string {
    const nonce = new Array(32);
    for (let i = 0; i < 32; i++) {
      nonce[i] = Math.floor(Math.random() * 256);
    }
    return Buffer.from(nonce).toString('hex');
  }

  /**
   * Get server public key (for client verification)
   */
  getServerPublicKey(): string {
    return this.serverKeypair.publicKey();
  }
}
