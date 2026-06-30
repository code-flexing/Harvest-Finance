# Requirements Document

## Introduction

This feature adds OAuth2 social login via Google and GitHub as alternatives to the existing email/password authentication flow in the Harvest Finance backend (NestJS). Users can authenticate through their Google or GitHub accounts, reducing signup friction. The backend issues the same JWT access/refresh token pair regardless of the login method, ensuring full interoperability with existing protected routes. A separate `UserOAuthLink` entity stores provider-specific identifiers, allowing a single user account to be linked to multiple OAuth providers.

## Glossary

- **AuthController**: The NestJS controller at `backend/src/auth/auth.controller.ts` that exposes all authentication-related HTTP endpoints.
- **AuthService**: The NestJS service at `backend/src/auth/auth.service.ts` that contains all business logic for authentication, including OAuth user creation and token issuance.
- **GoogleStrategy**: The Passport strategy at `backend/src/auth/strategies/google.strategy.ts` implementing `passport-google-oauth20` for Google OAuth2.
- **GithubStrategy**: The Passport strategy at `backend/src/auth/strategies/github.strategy.ts` implementing `passport-github2` for GitHub OAuth2.
- **User**: The TypeORM entity representing an authenticated user account, stored in the `users` table.
- **UserOAuthLink**: The TypeORM entity stored in the `user_oauth_links` table. Each row represents a link between a `User` and one OAuth provider identified by `oauthProvider` (e.g., `"google"`, `"github"`) and `oauthId` (the provider-assigned user identifier).
- **JWT_Pair**: A pair of tokens — an access token (short-lived, 1 hour) and a refresh token (long-lived, 7 days) — signed with `JWT_SECRET` and `JWT_REFRESH_SECRET` respectively.
- **OAuthProvider**: A string identifier for an external identity provider. Valid values are `"google"` and `"github"`.
- **CallbackURL**: The backend endpoint to which the OAuth provider redirects the browser after the user grants consent.
- **Email_Matching**: The process of looking up an existing `User` by the email address returned in the OAuth profile to link accounts automatically.

---

## Requirements

### Requirement 1: Google OAuth2 Initiation

**User Story:** As a user, I want to click "Login with Google" and be redirected to Google's consent screen, so that I can authenticate without creating a separate password.

#### Acceptance Criteria

1. WHEN a request is received at `GET /auth/google`, THE AuthController SHALL issue an HTTP redirect to the Google OAuth2 authorization URL, including the `email` and `profile` scopes, the configured `client_id`, and the configured `redirect_uri` as query parameters.
2. WHEN the application starts and `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is absent or set to an empty string, THE GoogleStrategy SHALL start without crashing and SHALL emit a warning-level log entry identifying each missing variable by name.
3. IF a user attempts Google OAuth and `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is absent or set to an empty string, THE GoogleStrategy SHALL reject the attempt before redirecting and SHALL return an error response indicating the Google provider is unavailable, without exposing the missing variable names or their values.
4. IF `GOOGLE_CALLBACK_URL` is absent or set to an empty string, THE GoogleStrategy SHALL default the callback URL to `http://localhost:3000/auth/google/callback`.

---

### Requirement 2: GitHub OAuth2 Initiation

**User Story:** As a user, I want to click "Login with GitHub" and be redirected to GitHub's authorization page, so that I can authenticate using my GitHub account.

#### Acceptance Criteria

1. WHEN a request is received at `GET /auth/github`, THE AuthController SHALL issue an HTTP redirect to the GitHub OAuth2 authorization URL with the `user:email` scope, the configured `client_id`, the configured `redirect_uri`, and a cryptographically random state nonce of at least 16 bytes encoded as a hex string.
2. WHEN the application starts and `GITHUB_CLIENT_ID` is absent or set to an empty string, THE GithubStrategy SHALL start without crashing and SHALL emit a warning-level log entry identifying the missing variable by name.
3. IF a user attempts GitHub OAuth and `GITHUB_CLIENT_ID` is absent or set to an empty string, THE GithubStrategy SHALL allow the authentication flow to proceed to the redirect without blocking.
4. WHEN the application starts and `GITHUB_CLIENT_SECRET` is absent or set to an empty string, THE GithubStrategy SHALL start without crashing and SHALL emit a warning-level log entry identifying the missing variable by name.
5. IF a user attempts GitHub OAuth and `GITHUB_CLIENT_SECRET` is absent or set to an empty string, THE GithubStrategy SHALL allow the authentication flow to proceed to the redirect without blocking.
6. IF `GITHUB_CALLBACK_URL` is absent or set to an empty string, THE GithubStrategy SHALL default the callback URL to `http://localhost:3000/auth/github/callback`.

---

### Requirement 3: OAuth2 Callback — Account Creation and Linking

**User Story:** As a user completing OAuth2 authorization for the first time, I want the system to create an account for me automatically, so that I can start using Harvest Finance without a separate registration step.

#### Acceptance Criteria

1. WHEN the OAuth provider callback is received and no `UserOAuthLink` exists for the matching `oauthProvider` and `oauthId`, AND no `User` exists with the same email address, THE AuthService SHALL create a new `User` record with `isActive` set to `true` and a randomly generated password of at least 32 characters that is bcrypt-hashed before storage, and SHALL create a corresponding `UserOAuthLink` record within the same database transaction; IF either write fails, THE AuthService SHALL roll back both writes and propagate the error to the caller.
2. WHEN the OAuth provider callback is received and no `UserOAuthLink` exists for the matching `oauthProvider` and `oauthId`, AND a `User` with the same email address already exists, THE AuthService SHALL create a new `UserOAuthLink` record linking the existing `User` to the new provider; the existing `User`'s `password`, `email`, `username`, and `role` fields SHALL remain unchanged.
3. WHEN the OAuth provider callback is received and a `UserOAuthLink` with the matching `oauthProvider` and `oauthId` already exists, THE AuthService SHALL return the associated `User` directly without creating any new `User` or `UserOAuthLink` records.
4. WHEN the OAuth callback from Google is processed and the Google profile contains no email address, THE GoogleStrategy SHALL throw an error causing Passport to fail the authentication and return an error response to the caller indicating no email was returned.
5. WHEN the OAuth callback from GitHub is processed and the GitHub profile contains no email address, THE GithubStrategy SHALL throw an error causing Passport to fail the authentication and return an error response to the caller indicating no email was returned and instructing the user to make their GitHub email public.

---

### Requirement 4: JWT Token Issuance on OAuth Login

**User Story:** As a user who authenticated via OAuth, I want to receive the same JWT access/refresh token pair as email/password users, so that I can access all protected API routes without special handling.

#### Acceptance Criteria

1. WHEN OAuth authentication succeeds and a `User` is resolved, THE AuthService SHALL issue a `JWT_Pair` containing the user's `id`, `email`, and `role` in the payload.
2. THE AuthService SHALL sign the access token with `JWT_SECRET` and an expiry of `1h`.
3. THE AuthService SHALL sign the refresh token with `JWT_REFRESH_SECRET` and an expiry of `7d`.
4. WHEN the `JWT_Pair` is generated via OAuth login, THE AuthService SHALL attempt to persist the hashed refresh token in a `Session` record, replacing any existing Session for that user; IF session persistence fails, THE AuthService SHALL still return the `JWT_Pair` to the caller.
5. WHEN OAuth authentication succeeds and a `JWT_Pair` is issued, THE AuthService SHALL return an `AuthResponseDto` containing `access_token`, `refresh_token`, and a `user` object with the user's `id`, `email`, and `role` to the OAuth callback endpoint.
6. IF `JWT_SECRET` or `JWT_REFRESH_SECRET` is absent or set to an empty string at the time of token issuance, THE AuthService SHALL throw an error and SHALL NOT return any tokens to the caller.

---

### Requirement 5: Multi-Provider Account Linking

**User Story:** As a user, I want to link multiple OAuth providers to my single account, so that I can log in with either Google or GitHub and reach the same profile and data.

#### Acceptance Criteria

1. THE `user_oauth_links` table SHALL enforce a unique constraint on the combination of `oauthProvider` and `oauthId`, preventing duplicate provider links.
2. THE `user_oauth_links` table SHALL allow a single `User` to have multiple `UserOAuthLink` records with different `oauthProvider` values.
3. WHEN a `User` has linked both `"google"` and `"github"` providers, THE AuthService SHALL return the `User` with the same `userId` regardless of which provider was used to authenticate.
4. WHEN a `UserOAuthLink` record is deleted, THE `user_oauth_links` table SHALL remove only that link record and SHALL NOT delete or modify the associated `User` record.
5. WHEN the AuthService attempts to create a `UserOAuthLink` and no `User` exists for the given `userId`, THE AuthService SHALL throw an error and SHALL NOT create a dangling `UserOAuthLink` record.
6. WHEN the AuthService receives an OAuth callback and a `UserOAuthLink` for the given `oauthProvider` and `oauthId` already exists but is linked to a different `User` than the one identified by the email, THE AuthService SHALL reject the link attempt and return an error indicating the provider account is already associated with another user.

---

### Requirement 6: Last Login Tracking

**User Story:** As a system operator, I want the last login timestamp updated on every OAuth authentication, so that I can audit user activity consistently across login methods.

#### Acceptance Criteria

1. WHEN a user successfully authenticates via OAuth and an existing `UserOAuthLink` is found, THE AuthService SHALL update the `lastLogin` field on the associated `User` to the current UTC timestamp.
2. WHEN a new `User` is created via OAuth, THE AuthService SHALL set the `lastLogin` field to the current UTC timestamp as part of the same transaction that creates the `User` and `UserOAuthLink`.
3. WHEN an existing `User` is linked to a new OAuth provider, THE AuthService SHALL update the `lastLogin` field on the `User` to the current UTC timestamp after the `UserOAuthLink` is successfully saved.
4. IF the `lastLogin` update fails after a successful authentication, THE AuthService SHALL log a warning-level entry and SHALL still return the `JWT_Pair` to the caller without failing the login.

---

### Requirement 7: Environment Configuration

**User Story:** As a backend developer, I want all OAuth credentials to be loaded from environment variables, so that secrets are never hard-coded and the application can be configured per environment.

#### Acceptance Criteria

1. THE GoogleStrategy SHALL read `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` from the environment via `ConfigService`.
2. THE GithubStrategy SHALL read `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL` from the environment via `ConfigService`.
3. WHEN the application starts and any of the six OAuth environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`) is absent or set to an empty string, THE AuthModule SHALL emit a warning-level log entry identifying each missing variable by name.
4. IF a user attempts to authenticate via an OAuth provider whose required credentials are absent or set to an empty string, THE AuthController SHALL return an error response indicating the requested provider is unavailable, without exposing the missing variable names or their values.

---

### Requirement 8: Module Registration

**User Story:** As a backend developer, I want the OAuth strategies to be properly registered in the NestJS dependency injection container, so that Passport can resolve them automatically on application startup.

#### Acceptance Criteria

1. THE AuthModule SHALL register `GoogleStrategy` and `GithubStrategy` as providers in the NestJS module, making them injectable at application startup.
2. THE AuthModule SHALL import `TypeOrmModule.forFeature([User, UserOAuthLink])` so that both the `UserRepository` and `UserOAuthLinkRepository` are injectable at application startup.
3. THE AuthModule SHALL import `PassportModule` with the default strategy set to `"jwt"`.
4. THE AuthModule SHALL import `JwtModule` registered with the signing secret and token expiry configuration required for `AuthService` to sign access and refresh tokens.
5. THE AuthModule SHALL export `GoogleStrategy`, `GithubStrategy`, and `PassportModule` so they are available to other modules that import `AuthModule`.
