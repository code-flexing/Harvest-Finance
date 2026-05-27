# Stellar Authentication Implementation

This document describes the implementation of "Sign-in with Stellar" authentication using SEP-10 standard for the Harvest Finance platform.

## Overview

The implementation provides secure, passwordless authentication using Stellar wallet signatures. Users can authenticate by signing a challenge transaction with their Stellar wallet (Freighter, MetaMask, or other compatible wallets).

## Architecture

### Backend Components

1. **Stellar Strategy** (`src/auth/strategies/stellar.strategy.ts`)
   - Implements SEP-10 challenge generation and verification
   - Handles cryptographic validation of Stellar signatures
   - Manages user creation and authentication flow

2. **Authentication Controller** (`src/auth/auth.controller.ts`)
   - Provides `/api/v1/auth/stellar/challenge` endpoint
   - Provides `/api/v1/auth/stellar/verify` endpoint
   - Integrates with existing JWT token system

3. **DTOs and Validation** (`src/auth/dto/stellar-auth.dto.ts`)
   - Request/response validation schemas
   - API documentation with Swagger

### Frontend Components

1. **StellarAuth Component** (`src/components/auth/StellarAuth.tsx`)
   - Wallet connection interface
   - Challenge signing flow
   - Error handling and user feedback

2. **Auth Store Integration** (`src/lib/stores/auth-store.ts`)
   - Stellar authentication methods
   - JWT token management
   - State management for wallet connection

3. **Login Page Enhancement** (`src/app/login/page.tsx`)
   - Toggle between email and Stellar authentication
   - Seamless user experience

## Authentication Flow

### Step 1: Challenge Request
```
POST /api/v1/auth/stellar/challenge
{
  "public_key": "G..."
}
```

### Step 2: Challenge Response
```
{
  "server_public_key": "G...",
  "transaction": "AAAA...",
  "network_passphrase": "Test SDF Network ; September 2015"
}
```

### Step 3: Client Signing
- User receives challenge transaction
- Client validates server signature
- User signs transaction with their private key
- Client sends signed transaction back

### Step 4: Verification
```
POST /api/v1/auth/stellar/verify
{
  "transaction": "AAAA..."
}
```

### Step 5: Authentication Success
```
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid",
    "stellar_address": "G...",
    "role": "USER",
    "full_name": "Stellar User"
  }
}
```

## Security Features

1. **SEP-10 Compliance**: Follows Stellar ecosystem standard for authentication
2. **Challenge Expiration**: 5-minute timeout for challenge transactions
3. **Signature Verification**: Both server and client signatures validated
4. **Replay Attack Prevention**: Nonce-based challenges
5. **Network Validation**: Ensures transactions use correct network

## Configuration

### Backend Environment Variables

```env
# Stellar Authentication (SEP-10)
STELLAR_SERVER_SECRET=SBX7SARQOFS6IM2HS2N5TVK54AEF55E3FHOXBTWA6IPEEJJ4W5WJWE6W
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

## Supported Wallets

- **Freighter**: Primary wallet for Stellar network
- **MetaMask**: Through Stellar-compatible extensions
- **Other wallets**: Any wallet supporting Stellar transaction signing

## User Experience

1. User selects "Stellar" authentication method
2. Clicks "Connect Freighter Wallet"
3. Wallet prompts for connection approval
4. User sees connected wallet address
5. Clicks "Sign in with Stellar"
6. Wallet prompts for signature approval
7. User is authenticated and redirected

## Error Handling

- Wallet not installed
- Connection rejected by user
- Signature rejected by user
- Network errors
- Invalid signatures
- Expired challenges

## Testing

### Unit Tests
- Challenge generation validation
- Signature verification logic
- User creation flow

### Integration Tests
- End-to-end authentication flow
- Wallet connection scenarios
- Error handling paths

### Manual Testing
1. Install Freighter wallet
2. Create test account
3. Test authentication flow
4. Verify JWT tokens
5. Test error scenarios

## Dependencies

### Backend
- `@stellar/stellar-sdk`: Stellar SDK for transaction handling
- `@nestjs/passport`: Passport integration
- `passport-jwt`: JWT strategy

### Frontend
- `@stellar/freighter-api`: Freighter wallet integration
- `stellar-sdk`: Stellar SDK for frontend
- `zustand`: State management

## Future Enhancements

1. **Multi-wallet support**: Additional wallet integrations
2. **Mobile support**: Mobile wallet connections
3. **Biometric authentication**: Wallet biometrics integration
4. **Account linking**: Link multiple Stellar addresses
5. **Delegation support**: Support for delegated signing

## Troubleshooting

### Common Issues

1. **"Freighter not installed"**
   - User needs to install Freighter browser extension
   - Provide download link in error message

2. **"Invalid signature"**
   - Check network configuration
   - Verify server keypair setup
   - Ensure correct network passphrase

3. **"Challenge expired"**
   - User took too long to sign
   - Request new challenge automatically

4. **"Connection failed"**
   - Check wallet availability
   - Verify network connectivity
   - Ensure proper wallet permissions

## Security Considerations

1. **Private Key Security**: Server secret key must be securely stored
2. **Network Configuration**: Use correct network for environment
3. **Rate Limiting**: Implement proper rate limiting on endpoints
4. **Logging**: Log authentication attempts for security monitoring
5. **Token Security**: Use secure JWT secrets and proper expiration

## Compliance

- **SEP-10**: Stellar Ecosystem Proposal for authentication
- **GDPR**: User data protection considerations
- **Security Best Practices**: Industry-standard security measures

## Migration Guide

Existing users can continue using email/password authentication. New users can choose either method. Future migrations can link accounts across authentication methods.
