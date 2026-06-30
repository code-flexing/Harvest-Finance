# Custodial Wallet Security Model

> **Applies to:** Harvest Finance — Platform-Managed Stellar Wallets  
> **Last updated:** 2026-06-27  
> **Status:** Production-ready

---

## Overview

Harvest Finance allows users who do not have a Stellar wallet (e.g. crypto newcomers in rural Africa) to opt into a **platform-managed custodial wallet** during registration. The platform generates a Stellar keypair on the user's behalf and stores the encrypted private key in the database.

Users can export their private key at any time and migrate to full self-custody (e.g. Freighter, Albedo, Lobstr).

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Database breach: attacker dumps `custodial_wallets` table | Private key is AES-256-GCM encrypted. Without the user's plaintext password AND the platform pepper, decryption is computationally infeasible. |
| Brute-force / dictionary attack against encrypted key | Argon2id KDF with high memory (64 MiB) and time cost makes exhaustive search prohibitively expensive. |
| Insider threat: malicious platform employee | The encryption key is derived from the user's password — the platform never stores the plaintext password after registration completes (bcrypt is used for auth). Only the user can decrypt their key. |
| Same password across two users | Per-wallet unique Argon2 salt and userId domain-separator produce independent encryption keys for every user. |
| Ciphertext tampering | AES-GCM authentication tag verifies both the integrity and authenticity of the ciphertext. Any modification causes decryption to fail. |
| Environment variable theft (pepper leak) | The pepper is one factor of a two-factor KDF (password + pepper). A pepper leak alone does not enable decryption without the user's password. |
| Key export brute-force | The export endpoint is rate-limited to 3 attempts per hour per user. |

---

## Key Derivation Design

```
plaintext_password  (from user registration form)
        │
        ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Composite salt construction                                 │
  │                                                              │
  │  argon2_salt (32 random bytes, per-wallet, stored in DB)    │
  │        +                                                     │
  │  platform_pepper (32 bytes, from env var, NOT in DB)        │
  │        +                                                     │
  │  userId (UUID, domain separator)                            │
  │        │                                                     │
  │        ▼  scrypt(N=2^14, r=8, p=1)  → 32-byte composite    │
  └─────────────────────────────────────────────────────────────┘
        │
        ▼
  Argon2id(
    password = plaintext_password,
    salt     = composite_salt,
    memory   = 64 MiB,
    time     = 3 iterations,
    threads  = 4,
    length   = 32 bytes   ← AES-256 key
  )
        │
        ▼
  aes_key (32 bytes)
        │
        ▼
  AES-256-GCM encrypt(stellar_secret_key, aes_key, iv=random_12_bytes)
  → { ciphertext, iv, auth_tag }  stored in DB
```

### Why Argon2id?

Argon2id is the winner of the Password Hashing Competition (2015) and is recommended by OWASP and RFC 9106 for password-based key derivation. The "id" variant combines:
- **Argon2i** (data-independent memory access) — resists side-channel attacks.
- **Argon2d** (data-dependent memory access) — resists GPU/ASIC parallel attacks.

### Why a pepper?

A pepper is a server-side secret NOT stored in the database. Even if an attacker obtains a full database dump, they cannot attempt key derivation without also compromising the pepper from the running environment. This provides defence-in-depth without requiring HSM infrastructure.

---

## Encryption Algorithm

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Algorithm | AES-256-GCM | AEAD — provides both confidentiality and integrity. NIST-approved. |
| Key length | 256 bits (32 bytes) | Maximum AES key size; resistant to quantum pre-image attacks (128 bits of quantum security). |
| IV length | 96 bits (12 bytes) | GCM standard recommended IV length for performance and security. |
| Auth tag | 128 bits (16 bytes) | Full-length GCM tag; provides 128-bit integrity guarantee. |
| IV generation | `crypto.randomBytes(12)` | Cryptographically secure random IV; must never be reused with the same key. |

---

## What Is Stored in the Database

| Column | Sensitivity | Notes |
|--------|-------------|-------|
| `public_key` | Public | Stellar G-address — safe to display |
| `encrypted_secret_key` | Encrypted | AES-256-GCM ciphertext — meaningless without the AES key |
| `iv` | Non-secret | Must be unique; stored in plaintext (standard practice) |
| `auth_tag` | Non-secret | GCM tag; integrity check only |
| `argon2_params` | Non-secret | Salt + KDF parameters (NOT the pepper or password) |

> [!CAUTION]
> The `encrypted_secret_key`, `iv`, `auth_tag`, and `argon2_params` columns are marked `select: false` in TypeORM — they are **never returned** by ordinary SELECT queries and must be explicitly requested.

---

## Private Key Export Flow

When a user clicks "Export Private Key":

1. Frontend prompts for the user's current password (never stored client-side).
2. A `POST /api/v1/wallets/custodial/export-key` request is sent with the password.
3. The backend:
   a. Loads the wallet record (with sensitive fields via explicit `addSelect`).
   b. Re-derives the AES key using the stored Argon2 parameters + password + pepper.
   c. Decrypts the secret key with AES-256-GCM (auth tag verified).
   d. Returns the plaintext Stellar secret key in the response body.
4. The frontend displays it once in a blurred, copyable field with a prominent warning.

> [!IMPORTANT]
> The decrypted secret key is **never logged**, cached, or stored anywhere beyond the HTTP response. It exists in memory only for the duration of the decryption operation.

---

## Password Change Implications

When a user changes their password, the custodial wallet's encrypted private key becomes unrecoverable via the new password because the AES key is derived from the old password. 

**Recommended mitigation** (future work):
- During password change, require the old password.
- Re-derive the old AES key, decrypt the secret, then re-encrypt with a new AES key derived from the new password.
- This is a transactional operation and should be implemented atomically.

---

## Recovery Options

If a user forgets their password:
1. Standard password reset (email link) resets their auth password.
2. **However, the custodial wallet cannot be decrypted** because the AES key was derived from the old password.
3. Users who may forget their password are strongly encouraged to export their private key immediately after registration and store it securely (paper backup, password manager).

> [!WARNING]
> There is no platform-side recovery path for forgotten passwords on custodial wallets. This is intentional — it ensures the platform cannot access user funds.

---

## Compliance Notes

- **Zero-knowledge custody**: The platform cannot decrypt user private keys without the user's plaintext password.
- **Right to portability**: Users can always export their Stellar secret key and migrate to any self-custody wallet.
- **Key deletion**: When a user deletes their account, the `custodial_wallets` row is deleted via cascade (no backup retained by the platform).
- **Regulatory**: Operators must determine whether offering custodial wallets in their jurisdiction requires a money transmission licence or similar authorisation.
