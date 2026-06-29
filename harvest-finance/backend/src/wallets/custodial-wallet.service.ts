import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import * as argon2 from 'argon2';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { CustodialWallet } from './entities/custodial-wallet.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

/**
 * Argon2id parameters used for key derivation.
 * These are deliberately conservative to resist GPU/ASIC attacks while
 * remaining acceptable on server hardware (~200-400 ms per derivation).
 *
 * References:
 * - OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 * - Argon2 RFC 9106 recommendations.
 */
const ARGON2_MEMORY_COST = 65536; // 64 MiB
const ARGON2_TIME_COST = 3;
const ARGON2_PARALLELISM = 4;

/** Length of the AES-256 key in bytes (32 bytes = 256 bits). */
const AES_KEY_LENGTH = 32;

/** Length of the AES-GCM IV in bytes (12 bytes = 96 bits — GCM standard). */
const AES_IV_LENGTH = 12;

/** Argon2 salt length in bytes. */
const ARGON2_SALT_LENGTH = 32;

/**
 * CustodialWalletService
 *
 * Manages platform-custodied Stellar wallets for users who do not have
 * their own self-custody wallet at registration time.
 *
 * Security model:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. A fresh Stellar keypair is generated with `Keypair.random()`.
 * 2. An AES-256-GCM encryption key is derived from the user's plaintext password
 *    using Argon2id with:
 *      - A unique 32-byte random salt (stored per-wallet in the DB).
 *      - A platform-level pepper (from env var) mixed into the salt context,
 *        providing defence-in-depth against DB-only breaches.
 *      - The userId is appended to the domain-separator to prevent cross-user
 *        attacks even if two users choose the same password.
 * 3. The Stellar secret key is encrypted with the derived AES key using a
 *    unique 12-byte random IV.  The GCM authentication tag is stored separately
 *    to allow integrity verification before decryption.
 * 4. Only the ciphertext, IV, auth tag, and Argon2 params are persisted.
 *    The platform can NOT decrypt without the user's plaintext password.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Injectable()
export class CustodialWalletService {
  constructor(
    @InjectRepository(CustodialWallet)
    private readonly custodialWalletRepository: Repository<CustodialWallet>,
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService,
  ) {}

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Returns the platform pepper from config.
   * Falls back to a weak placeholder if not configured — logs an error in
   * production so operators are alerted.
   */
  private getPepper(): Buffer {
    const pepper = this.configService.get<string>(
      'CUSTODIAL_WALLET_ENCRYPTION_PEPPER',
    );
    if (!pepper) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        this.logger.error(
          'CUSTODIAL_WALLET_ENCRYPTION_PEPPER is not set! Custodial wallets are insecure.',
          'CustodialWalletService',
        );
      }
      // Use a deterministic weak fallback for dev/test only
      return Buffer.from('dev_fallback_pepper_not_for_production_use!!', 'utf8').subarray(0, 32);
    }
    return Buffer.from(pepper, 'hex');
  }

  /**
   * Derives a 256-bit AES encryption key from a user password.
   *
   * The Argon2id input is the password itself.
   * The salt is: argon2Salt ‖ pepper ‖ userId (mixed via scrypt pre-hash
   * to produce a fixed-length 32-byte salt for Argon2).
   *
   * @param password  The user's plaintext password.
   * @param userId    The user's UUID (domain separator).
   * @param argon2Salt  The random per-wallet salt (hex string or Buffer).
   * @returns 32-byte AES key Buffer.
   */
  private async deriveKey(
    password: string,
    userId: string,
    argon2Salt: Buffer,
  ): Promise<Buffer> {
    const pepper = this.getPepper();

    // Mix salt + pepper + userId into a fixed-length 32-byte composite salt
    // using scrypt (deterministic, fast — not used for password hardening here,
    // just for combining materials).
    const compositeSalt = scryptSync(
      Buffer.concat([argon2Salt, pepper, Buffer.from(userId, 'utf8')]),
      Buffer.from('harvest-finance-custodial-wallet-kdf', 'utf8'),
      32, // output length
      { N: 2 ** 14, r: 8, p: 1 }, // lightweight — real hardening is done by Argon2
    );

    // Derive the AES key with Argon2id
    const rawKey = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
      salt: compositeSalt,
      hashLength: AES_KEY_LENGTH,
      raw: true,
    });

    return rawKey as Buffer;
  }

  /**
   * Encrypts a Stellar secret key with AES-256-GCM.
   *
   * @returns `{ ciphertext, iv, authTag }` all as hex strings.
   */
  private encryptSecretKey(
    secretKey: string,
    aesKey: Buffer,
  ): { ciphertext: string; iv: string; authTag: string } {
    const iv = randomBytes(AES_IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', aesKey, iv);

    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(secretKey, 'utf8')),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypts a Stellar secret key stored as AES-256-GCM ciphertext.
   *
   * @throws `UnauthorizedException` when the authentication tag check fails
   *         (wrong password or tampered ciphertext).
   */
  private decryptSecretKey(
    ciphertextHex: string,
    ivHex: string,
    authTagHex: string,
    aesKey: Buffer,
  ): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      aesKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    try {
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextHex, 'hex')),
        decipher.final(),
      ]);
      return plaintext.toString('utf8');
    } catch {
      // GCM auth tag verification failed → wrong password or data corruption
      throw new UnauthorizedException('Invalid password or corrupted wallet data');
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Creates a new custodial Stellar wallet for a user.
   *
   * @param userId           UUID of the user who will own the wallet.
   * @param plaintextPassword The user's registration password (not yet hashed).
   * @returns The Stellar public key (G-address) of the new wallet.
   */
  async createCustodialWallet(
    userId: string,
    plaintextPassword: string,
  ): Promise<string> {
    // Guard: ensure no duplicate custodial wallet
    const existing = await this.custodialWalletRepository.findOne({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('A custodial wallet already exists for this user');
    }

    // 1. Generate Stellar keypair
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const secretKey = keypair.secret();

    // 2. Derive AES key from password
    const argon2Salt = randomBytes(ARGON2_SALT_LENGTH);
    const aesKey = await this.deriveKey(plaintextPassword, userId, argon2Salt);

    // 3. Encrypt secret key
    const { ciphertext, iv, authTag } = this.encryptSecretKey(secretKey, aesKey);

    // 4. Persist
    const wallet = this.custodialWalletRepository.create({
      userId,
      publicKey,
      encryptedSecretKey: ciphertext,
      iv,
      authTag,
      argon2Params: {
        salt: argon2Salt.toString('hex'),
        memoryCost: ARGON2_MEMORY_COST,
        timeCost: ARGON2_TIME_COST,
        parallelism: ARGON2_PARALLELISM,
      },
    });

    await this.custodialWalletRepository.save(wallet);

    this.logger.log(
      `Created custodial wallet for user ${userId}: ${publicKey}`,
      'CustodialWalletService',
    );

    return publicKey;
  }

  /**
   * Decrypts and returns the Stellar secret key for a custodial wallet user.
   *
   * The user must supply their correct plaintext password.
   * The decrypted key is never logged or cached.
   *
   * @param userId            UUID of the requesting user.
   * @param plaintextPassword The user's current plaintext password.
   * @returns Stellar secret key (S-address).
   */
  async exportPrivateKey(
    userId: string,
    plaintextPassword: string,
  ): Promise<string> {
    // Load wallet with sensitive fields explicitly selected
    const wallet = await this.custodialWalletRepository
      .createQueryBuilder('w')
      .where('w.user_id = :userId', { userId })
      .addSelect('w.encrypted_secret_key')
      .addSelect('w.iv')
      .addSelect('w.auth_tag')
      .addSelect('w.argon2_params')
      .getOne();

    if (!wallet) {
      throw new NotFoundException('No custodial wallet found for this user');
    }

    // Re-derive AES key from the stored Argon2 params
    const argon2Salt = Buffer.from(wallet.argon2Params.salt, 'hex');
    const aesKey = await this.deriveKey(plaintextPassword, userId, argon2Salt);

    // Decrypt — throws UnauthorizedException on wrong password
    const secretKey = this.decryptSecretKey(
      wallet.encryptedSecretKey,
      wallet.iv,
      wallet.authTag,
      aesKey,
    );

    this.logger.log(
      `Private key exported for custodial wallet of user ${userId}`,
      'CustodialWalletService',
    );

    return secretKey;
  }

  /**
   * Returns the public key for a custodial wallet, or null if none exists.
   */
  async getPublicKey(userId: string): Promise<string | null> {
    const wallet = await this.custodialWalletRepository.findOne({
      where: { userId },
      select: ['publicKey'],
    });
    return wallet?.publicKey ?? null;
  }

  /**
   * Returns whether a custodial wallet exists for the given user.
   */
  async hasCustodialWallet(userId: string): Promise<boolean> {
    const count = await this.custodialWalletRepository.count({
      where: { userId },
    });
    return count > 0;
  }
}
