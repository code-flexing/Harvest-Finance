# Requirements Document

## Introduction

This feature adds refresh token rotation to the Harvest Finance backend (NestJS). Every call to `POST /auth/refresh` issues a brand-new refresh token and atomically invalidates the one that was just presented. If a token that has already been used (i.e., is marked invalidated/replaced) is presented again, the system treats this as a theft signal and revokes the entire token family — every active token in that lineage — then logs a security event to the audit log and emails the affected user. Token families are tracked in the database via a `familyId` column, allowing the revocation sweep to be a single targeted query.

## Glossary

- **RefreshToken**: A database record representing one issued refresh token. Has columns `id` (uuid), `token` (hashed value), `familyId` (uuid), `isRevoked` (boolean), `replacedBy` (uuid | null), `userId` (FK), `expiresAt` (timestamp), `createdAt` (timestamp).
- **TokenFamily**: All `RefreshToken` records sharing the same `familyId`. A family starts when a user first logs in or performs a full re-authentication. Each `POST /auth/refresh` call continues the family by creating a child token.
- **Rotation**: The act of issuing a new `RefreshToken` for a family while setting `isRevoked = true` and `replacedBy = <new token id>` on the old one, in a single atomic operation.
- **Reuse Detection**: Detecting that a presented refresh token's `isRevoked` is already `true`, which indicates a previously rotated (now invalid) token is being replayed — a theft signal.
- **Family Revocation**: Setting `isRevoked = true` on every `RefreshToken` row sharing the same `familyId` as the detected replayed token.
- **AuditLog**: A database table (or append-only log store) that records security-relevant events with a timestamp, event type, userId, and contextual metadata (e.g., IP address, user-agent, familyId).
- **AuthService**: The NestJS service at `backend/src/auth/auth.service.ts` that owns all token-lifecycle logic.
- **AuthController**: The NestJS controller exposing `POST /auth/refresh`.
- **Session**: The existing record linking a user to their current refresh token; superseded by `RefreshToken` table but may co-exist during migration.

---

## Requirements

### Requirement 1: Refresh Token Rotation on Every Use

**User Story:** As a logged-in user, I want each use of my refresh token to produce a new one, so that my session stays secure even if an old token is captured in transit.

#### Acceptance Criteria

1. WHEN a valid, non-revoked refresh token is presented to `POST /auth/refresh`, THE AuthService SHALL issue a new `RefreshToken` record in the same `familyId` and return a new access token and refresh token pair; the old token SHALL be marked `isRevoked = true` with `replacedBy = <new token id>` if and only if the new token is successfully issued — no partial state shall be observable by the caller.
2. IF any step in the rotation operation fails, THE AuthService SHALL ensure the original refresh token record is left unchanged (still `isRevoked = false`, `replacedBy = null`) and SHALL return a `500 Internal Server Error` to the caller.
3. WHEN rotation succeeds, THE AuthService SHALL return a new access token signed with `JWT_SECRET` (expiry `1h`) and a new refresh token signed with `JWT_REFRESH_SECRET` (expiry `7d`).
4. WHEN rotation succeeds, THE AuthController SHALL set the new refresh token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie in addition to returning it in the response body, so that browser clients receive it automatically.
5. WHEN a refresh token's `expiresAt` is in the past, THE AuthService SHALL treat it as invalid, return a `401 Unauthorized` response, and SHALL NOT rotate it.
6. WHEN a refresh token's JWT signature is invalid or the token string cannot be decoded, THE AuthService SHALL return a `401 Unauthorized` response without querying the database.

---

### Requirement 2: Reuse Detection and Family Revocation

**User Story:** As a security-conscious operator, I want the system to detect when a previously rotated refresh token is replayed and immediately revoke the entire token family, so that a stolen token grants at most one additional use before the attacker is locked out.

#### Acceptance Criteria

1. WHEN a refresh token is presented to `POST /auth/refresh` and the corresponding `RefreshToken` record has `isRevoked = true`, THE AuthService SHALL identify the `familyId` of that record and set `isRevoked = true` on every `RefreshToken` row sharing that `familyId` in a single atomic UPDATE.
2. IF the bulk revocation UPDATE fails, THE AuthService SHALL return a `401 Unauthorized` to the caller immediately and SHALL retry the revocation asynchronously up to 3 times within a 60-second window; IF all 3 retries are exhausted, THE AuthService SHALL emit an error-level log entry with the `familyId` and SHALL NOT attempt further retries.
3. WHEN family revocation is triggered, THE AuthService SHALL write an `AuditLog` entry with event type `REFRESH_TOKEN_REUSE_DETECTED`, the affected `userId`, `familyId`, the presented (replayed) token `id`, the request IP address, and the current UTC timestamp.
4. WHEN family revocation is triggered, THE AuthService SHALL send an email to the affected user's registered email address notifying them of suspected token theft and advising them to change their password.
5. IF the theft-alert email send fails, THE AuthService SHALL emit a warning-level log entry containing the `userId` and the failure reason, and SHALL NOT block the family revocation or the `401` response.
6. WHEN family revocation completes, THE AuthController SHALL return a `401 Unauthorized` response; the response body SHALL NOT contain any of the following: the word "reuse", the word "replay", the `familyId`, the `replayedTokenId`, or any description of the detection mechanism.
7. WHEN all `RefreshToken` records for a `familyId` have `isRevoked = true`, any subsequent `POST /auth/refresh` presenting any token from that family SHALL return `401 Unauthorized` without triggering another revocation sweep or dispatching another theft-alert email.

---

### Requirement 3: Token Family Lifecycle

**User Story:** As a backend developer, I want token families to be created at login and carried through rotations, so that revocation can target an entire lineage rather than individual tokens.

#### Acceptance Criteria

1. WHEN a user successfully authenticates (via email/password or OAuth), THE AuthService SHALL generate a new `familyId` (UUID v4) and store the first `RefreshToken` record with `isRevoked = false` and `replacedBy = null`.
2. WHEN a refresh token is rotated, THE AuthService SHALL copy the `familyId` from the old record to the new record and SHALL set the old record to `isRevoked = true` and `replacedBy = <new token id>`, ensuring the entire rotation chain shares one `familyId` and the old record's state transition is part of the same atomic operation as the new record creation.
3. WHEN a user explicitly calls `POST /auth/logout` and the presented refresh token has `isRevoked = false`, THE AuthService SHALL set `isRevoked = true` on that token only and SHALL NOT write a reuse-detection `AuditLog` entry or send a theft-alert email.
4. WHEN a user explicitly calls `POST /auth/logout` and the presented refresh token already has `isRevoked = true`, THE AuthService SHALL return an error response and SHALL NOT trigger reuse-detection logic, revoke the family, or send any email.
5. THE `refresh_tokens` table SHALL enforce a unique constraint on the `token` column (hashed value) to prevent duplicate token storage.
6. THE `refresh_tokens` table SHALL have a non-unique database index on `familyId` so that a family revocation sweep does not require a full table scan.

---

### Requirement 4: Audit Log

**User Story:** As a security operator, I want every family revocation to produce an immutable audit log entry, so that I can investigate suspected token theft incidents after the fact.

#### Acceptance Criteria

1. WHEN `REFRESH_TOKEN_REUSE_DETECTED` is logged, THE AuditLog entry SHALL contain at minimum: `eventType` (the string `"REFRESH_TOKEN_REUSE_DETECTED"`), `userId`, `familyId`, `replayedTokenId`, `ipAddress` (the string `"UNKNOWN"` if unavailable), `userAgent` (truncated to 512 characters, or the string `"UNKNOWN"` if unavailable), and `occurredAt` (UTC timestamp in ISO 8601 format).
2. No application-layer code path SHALL update or delete existing `AuditLog` rows; the table SHALL only support INSERT operations from application code.
3. IF writing the `AuditLog` entry fails, THE AuthService SHALL emit an error-level log entry to the application logger identifying the failed write and the associated `familyId`.
4. IF writing the `AuditLog` entry fails, THE AuthService SHALL still complete the family revocation and return `401 Unauthorized` to the caller, independently of the logging failure.
5. THE AuditLog table SHALL have a non-unique index on `userId` and a separate non-unique index on `occurredAt` to support incident queries without a full table scan.

---

### Requirement 5: Security Hardening

**User Story:** As a security engineer, I want the refresh token implementation to follow secure storage and transmission practices, so that token values are never exposed in plaintext in the database or logs.

#### Acceptance Criteria

1. THE AuthService SHALL store only the SHA-256 HMAC of the refresh token string (keyed with `JWT_REFRESH_SECRET`) in the `RefreshToken.token` column; the plaintext token string SHALL only appear in the HTTP response.
2. IF the performance profile of SHA-256 HMAC is inadequate, THE AuthService MAY substitute bcrypt hashing, provided the hashing algorithm is applied consistently at both storage and lookup time.
3. WHEN looking up a `RefreshToken` record, THE AuthService SHALL compute the hash of the presented token using the same algorithm used at storage time and query by hash value.
4. IF the presented token's hash does not match any record in the `refresh_tokens` table, THE AuthService SHALL return a `401 Unauthorized` response and SHALL NOT disclose whether the token was not found or was found but invalid.
5. The plaintext refresh token value SHALL NOT appear in any log statement, error message, audit log entry, or serialized object representation logged by the application.
6. WHEN generating a new refresh token string, THE AuthService SHALL use a cryptographically secure random source producing at least 32 bytes of entropy, with the output encoded as a base64url string of at least 43 characters.

---

### Requirement 6: Environment and Module Configuration

**User Story:** As a backend developer, I want the token rotation feature to be fully configurable via environment variables and properly wired into the NestJS module system.

#### Acceptance Criteria

1. THE AuthService SHALL read `JWT_REFRESH_SECRET` and `JWT_REFRESH_EXPIRES_IN` from the environment via `ConfigService`; IF either value is absent or resolves to an empty string at token issuance time, THE AuthService SHALL throw a configuration error and SHALL NOT issue any access or refresh tokens.
2. THE AuthModule SHALL import `TypeOrmModule.forFeature([RefreshToken, AuditLog])` so that both repositories are injectable at application startup.
3. IF the email provider dependency is not bound in the module (i.e., no value is resolvable for the email service injection token), THE AuthModule SHALL emit a warning-level log message indicating that theft-alert emails are disabled and SHALL continue starting up without throwing an exception.
4. THE `refresh_tokens` table SHALL support a configurable maximum family chain length via `MAX_TOKEN_FAMILY_DEPTH`; IF `MAX_TOKEN_FAMILY_DEPTH` is set to an integer value between 2 and 100 (inclusive) and a token family's chain length reaches that value, THE AuthService SHALL revoke the root token (depth 1, the token with no ancestor pointing to it via `replacedBy`) before completing the next rotation; IF `MAX_TOKEN_FAMILY_DEPTH` is set to a value outside the range 2–100 or to a non-integer value, THE AuthService SHALL throw a configuration error at startup and SHALL NOT issue tokens.
