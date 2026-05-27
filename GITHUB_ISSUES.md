# Harvest Finance GitHub Issues (200 Total)

## Wave 1: Good First Issues (1-50)
*Low-complexity, self-contained tasks suitable for new contributors*

### Documentation Issues (1-15)

1. **Add API response DTO for AppController endpoints**
   - Hint: `harvest-finance/backend/src/app.controller.ts` and `app.service.ts` return plain objects; create proper response DTOs in `src/app/dto/`

2. **Add README for auth module DTOs**
   - Hint: `harvest-finance/backend/src/auth/dto/` lacks inline documentation explaining field purposes

3. **Document vault state machine transitions**
   - Hint: `harvest-finance/backend/src/database/entities/vault.entity.ts` has VaultStatus enum; add state transition documentation

4. **Add JSDoc comments to InputSanitizerService**
   - Hint: `harvest-finance/backend/src/common/sanitization/input-sanitizer.service.ts` needs parameter/return type documentation

5. **Document SorobanExceptionFilter error mappings**
   - Hint: `harvest-finance/backend/src/common/filters/soroban-exception.filter.ts` lines 30-54; document error message matching logic

6. **Add inline comments to stellar-retry.ts**
   - Hint: `harvest-finance/backend/src/stellar/utils/stellar-retry.ts`; document the retry logic for different error codes

7. **Create API versioning documentation**
   - Hint: `harvest-finance/backend/src/common/config/versioning.config.ts`; document URI vs header versioning support

8. **Document rate-limit.decorator.ts usage**
   - Hint: `harvest-finance/backend/src/common/config/rate-limit.decorator.ts` is defined but never used; document its purpose

9. **Add README section for multi-chain adapters**
   - Hint: `harvest-finance/backend/src/multi-chain/adapters/stellar-yield.adapter.ts`; document how to add new chain adapters

10. **Document ThrottlerExceptionFilter behavior**
    - Hint: `harvest-finance/backend/src/common/filters/throttler-exception.filter.ts`; explain skip/countdown logic

11. **Add OpenAPI examples to StellarTransactionStatusDto**
    - Hint: `harvest-finance/backend/src/stellar/dto/stellar.dto.ts`; add example values for response DTOs

12. **Document vault capacity calculation logic**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts` lines 112-116; document availableCapacity calculation

13. **Add README to export module**
    - Hint: `harvest-finance/backend/src/export/export.service.ts`; document CSV/Excel/PDF export options

14. **Document RealtimeGateway room structure**
    - Hint: `harvest-finance/backend/src/realtime/realtime.gateway.ts`; document admin vs farmer room patterns

15. **Add API documentation for error response format**
    - Hint: `harvest-finance/backend/src/common/filters/http-exception.filter.ts`; document consistent error response structure

### Test Issues (16-30)

16. **Add unit tests for InputSanitizerService.validateUUID**
    - Hint: `harvest-finance/backend/src/common/sanitization/input-sanitizer.service.ts`; test valid/invalid UUIDs

17. **Add unit tests for InputSanitizerService.validateStellarPublicKey**
    - Hint: Test valid G-addresses and invalid formats

18. **Add unit tests for InputSanitizerService.validateContractId**
    - Hint: Test hex format validation for Soroban contract IDs

19. **Add unit tests for InputSanitizerService.validateEmail**
    - Hint: Test various email formats including edge cases

20. **Add unit tests for InputSanitizerService.validateAmount**
    - Hint: Test boundary values, negative, NaN, infinity

21. **Add unit tests for InputSanitizerService.sanitizeString**
    - Hint: Test max length, null byte removal, whitespace trimming

22. **Add unit tests for stellar-retry.ts isRetryableStellarError**
    - Hint: `harvest-finance/backend/src/stellar/utils/stellar-retry.ts`; test status codes 429, 500-599, result_codes

23. **Add unit tests for throttler.config.ts**
    - Hint: `harvest-finance/backend/src/common/config/throttler.config.ts`; test TTL/limit configurations

24. **Add tests for stellar-yield.adapter.ts**
    - Hint: `harvest-finance/backend/src/multi-chain/adapters/stellar-yield.adapter.spec.ts` exists but needs edge cases for empty results

25. **Add integration tests for resetPassword flow**
    - Hint: `harvest-finance/backend/src/auth/auth.service.ts` lines 289-332; test expired tokens, invalid signatures

26. **Add unit tests for VaultsService.getUserTotalDeposits**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; test aggregation query

27. **Add tests for SorobanIndexerService.query filtering**
    - Hint: `harvest-finance/backend/src/soroban/soroban-indexer.service.ts` lines 249-268; test contractId, type, ledger range filters

28. **Add tests for HttpExceptionFilter error mapping**
    - Hint: `harvest-finance/backend/src/common/filters/http-exception.filter.ts`; test HttpException vs generic errors

29. **Add tests for RealtimeGateway alert broadcasting**
    - Hint: `harvest-finance/backend/src/realtime/realtime.gateway.ts` lines 74-78; test admin vs farmer targeting

30. **Add E2E tests for Stellar health endpoint**
    - Hint: `harvest-finance/backend/src/stellar/stellar.controller.ts` line 36-50; test connection check

### Code Quality Issues (31-50)

31. **Remove hardcoded JWT fallback secrets**
    - Hint: `harvest-finance/backend/src/auth/strategies/jwt.strategy.ts` line 26; throw error instead of using fallback

32. **Remove duplicate Stellar SDK dependencies**
    - Hint: `harvest-finance/backend/package.json` lines 52 and 76; keep only `@stellar/stellar-sdk`

33. **Fix CORS origin in RealtimeGateway**
    - Hint: `harvest-finance/backend/src/realtime/realtime.gateway.ts` line 26; replace `origin: '*'` with env variable

34. **Replace any type in stellar.service.ts**
    - Hint: `harvest-finance/backend/src/stellar/services/stellar.service.ts` line 121; add proper type for balance mapping

35. **Replace any type in retry.ts**
    - Hint: `harvest-finance/backend/src/common/utils/retry.ts`; add proper generic types

36. **Fix StellarStrategy placeholder inheritance**
    - Hint: `harvest-finance/backend/src/auth/strategies/stellar.strategy.ts` lines 14-16; remove unused placeholder class

37. **Add response DTO for logout endpoint**
    - Hint: `harvest-finance/backend/src/auth/auth.controller.ts` line 128; create proper response DTO

38. **Add response DTO for register endpoint**
    - Hint: `harvest-finance/backend/src/auth/auth.controller.ts` line 67; verify AuthResponseDto completeness

39. **Remove TODO comment in orders.service.ts**
    - Hint: `harvest-finance/backend/src/orders/orders.service.ts` line 92; implement asset support or create follow-up issue

40. **Fix magic numbers in vaults.service.ts**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts` line 95, 149; extract MAX_SAFE_DEPOSIT and large deposit threshold to constants

41. **Add index hints to SorobanIndexerService**
    - Hint: `harvest-finance/backend/src/soroban/soroban-indexer.service.ts`; add DB index recommendations for event queries

42. **Add missing role validation in StellarStrategy**
    - Hint: `harvest-finance/backend/src/auth/strategies/stellar.strategy.ts`; ensure role is set correctly for new users

43. **Improve error messages in InputSanitizerService**
    - Hint: Add more descriptive error messages with examples

44. **Add null check for stellarTransactionId**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts` line 196; ensure proper null handling

45. **Add validation for pagination in soroban controller**
    - Hint: `harvest-finance/backend/src/soroban/soroban.controller.ts`; validate skip/limit bounds

46. **Fix auth.service.ts reset token query**
    - Hint: `harvest-finance/backend/src/auth/auth.service.ts` line 296; query should check resetPasswordExpires > now

47. **Add proper error for missing STELLAR_SERVER_SECRET**
    - Hint: `harvest-finance/backend/src/auth/strategies/stellar.strategy.ts` line 39; improve error message

48. **Add response DTO for refresh endpoint**
    - Hint: `harvest-finance/backend/src/auth/auth.controller.ts` line 110; verify TokenResponseDto format

49. **Add validation to forgotPassword email**
    - Hint: `harvest-finance/backend/src/auth/auth.service.ts`; add rate limiting per email

50. **Document rate limit tiers in auth.controller.ts**
    - Hint: `harvest-finance/backend/src/auth/auth.controller.ts`; explain short/medium/long throttling

## Wave 2: Intermediate Improvements (51-100)
*Refactors, missing features, DX improvements, and expanded test coverage*

### Testing & Coverage (51-65)

51. **Add integration tests for deposit flow**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; test successful deposit, duplicate idempotency, capacity exceeded

52. **Add integration tests for withdrawal flow**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; test sufficient balance, insufficient balance

53. **Add unit tests for ContractCacheService**
    - Hint: `harvest-finance/backend/src/common/cache/contract-cache.service.ts`; test cache hit/miss scenarios

54. **Add tests for notification creation in vault service**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; test large deposit notification threshold

55. **Add tests for vault WebSocket emissions**
    - Hint: `harvest-finance/backend/src/realtime/vault.gateway.ts`; test deposit/withdrawal event emission

56. **Add integration tests for Stellar escrow creation**
    - Hint: `harvest-finance/backend/src/stellar/services/stellar.service.ts`; test fee-bump and retry paths

57. **Add tests for SorobanIndexerService error handling**
    - Hint: `harvest-finance/backend/src/soroban/soroban-indexer.service.ts`; test RPC failures, malformed responses

58. **Add E2E tests for authentication flow**
    - Hint: Test register, login, refresh, logout sequence

59. **Add tests for multi-sig setup**
    - Hint: `harvest-finance/backend/src/stellar/services/stellar.service.ts`; test threshold validation

60. **Add tests for InputSanitizerService.validatePagination**
    - Hint: Test skip/limit boundaries, max limit enforcement

61. **Add tests for password reset token expiration**
    - Hint: `harvest-finance/backend/src/auth/auth.service.ts`; test token validity window

62. **Add integration tests for portfolio aggregation**
    - Hint: `harvest-finance/backend/src/portfolio/portfolio.service.ts`; test balance aggregation

63. **Add tests for export service formats**
    - Hint: `harvest-finance/backend/src/export/export.service.ts`; test CSV, Excel, PDF generation

64. **Add tests for community reactions**
    - Hint: `harvest-finance/backend/src/community/community.service.ts`; test reaction creation

65. **Add tests for achievement unlock conditions**
    - Hint: `harvest-finance/backend/src/achievements/achievements.service.ts`; test event triggers

### Architecture & Refactoring (66-80)

66. **Replace ConsoleLogService with structured logger**
    - Hint: Find and replace console.log statements with proper logging

67. **Add Repository pattern for Vault entity**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; extract data access to repository

68. **Create DepositRepository with custom queries**
    - Hint: Extract deposit queries from vaults.service.ts

69. **Add pagination support to getPublicVaults**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; add skip/limit parameters

70. **Extract notification logic to NotificationHelper**
    - Hint: `harvest-finance/backend/src/notifications/notifications.service.ts`; reduce duplication

71. **Add CircuitBreaker for Stellar network calls**
    - Hint: `harvest-finance/backend/src/stellar/services/stellar.service.ts`; add circuit breaker pattern

72. **Refactor SorobanExceptionFilter to use error codes**
    - Hint: Replace fragile string matching with error type mapping

73. **Add ResponseInterceptor for consistent API responses**
    - Hint: Wrap all responses in standard format

74. **Split StellarService into smaller services**
    - Hint: Separate escrow, payment, and account services

75. **Add Domain Events for key operations**
    - Hint: Emits events for deposits, withdrawals, escrow changes

76. **Implement Event Sourcing for deposit history**
    - Hint: Store deposit events instead of just state

77. **Add CQRS pattern for vault queries**
    - Hint: Separate read/write models for vault operations

78. **Create DTO factory for test data**
    - Hint: Reduce test boilerplate with factory pattern

79. **Add Mapper service for entity/DTO conversion**
    - Hint: Centralize mapping logic from vaults.service.ts

80. **Implement Specification pattern for queries**
    - Hint: Replace inline query conditions with reusable specs

### Developer Experience (81-100)

81. **Add pre-commit hooks configuration**
    - Hint: Add husky and lint-staged for code quality

82. **Add GitHub Codespaces devcontainer**
    - Hint: Create `.devcontainer/devcontainer.json` for consistent dev environment

83. **Add VSCode snippets for common DTOs**
    - Hint: Create `.vscode/snippets` for NestJS patterns

84. **Add Makefile for common dev commands**
    - Hint: Make targets for test, lint, build, db commands

85. **Add commit message convention documentation**
    - Hint: Document conventional commits format

86. **Add architecture decision records (ADRs)**
    - Hint: Document key decisions in `docs/adr/`

87. **Create CONTRIBUTING.md with detailed guidelines**
    - Hint: Expand current file with PR process, coding standards

88. **Add debug configuration for VSCode**
    - Hint: Create `.vscode/launch.json` for debugging tests

89. **Add npm scripts for database migrations**
    - Hint: Scripts for fresh DB setup in development

90. **Add Swagger customization for auth endpoints**
    - Hint: Better docs for JWT and Stellar auth

91. **Create seed script for test data**
    - Hint: CLI command to generate realistic test vaults and users

92. **Add npm script for type checking**
    - Hint: Separate script from build for faster type checking

93. **Add environment validation at startup**
    - Hint: Validate required env vars in main.ts

94. **Add logging configuration documentation**
    - Hint: Document pino configuration options

95. **Add health check endpoint for dependencies**
    - Hint: Extended health check for DB, Redis, Stellar RPC

96. **Add metrics endpoint for Prometheus**
    - Hint: Expose basic metrics for monitoring

97. **Add rate limit configuration per endpoint**
    - Hint: Document current rate limits and customization

98. **Add batch operations for deposits**
    - Hint: Process multiple deposits in single transaction

99. **Add async event handlers for withdrawals**
    - Hint: Fire events after withdrawal confirmation

100. **Add graceful shutdown for WebSocket connections**
    - Hint: Proper cleanup on app termination

## Wave 3: Feature Work & Integrations (101-150)
*New capabilities, API extensions, and cross-chain features*

### New Features (101-120)

101. **Add Polygon chain adapter**
    - Hint: `harvest-finance/backend/src/multi-chain/interfaces/chain-adapter.interface.ts`; implement PolygonYieldAdapter

102. **Add Ethereum chain adapter**
    - Hint: Implement EthereumYieldAdapter for L1 yields

103. **Add Solana chain adapter**
    - Hint: Implement SolanaYieldAdapter for SPL token vaults

104. **Create PaymentService for fiat on-ramp**
    - Hint: New service to integrate with payment providers

105. **Add webhook endpoint for external notifications**
    - Hint: Endpoint to receive payment confirmations, chain events

106. **Implement vault cloning feature**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; create new vault from existing template

107. **Add vault migration between chains**
    - Hint: Cross-chain vault position transfer feature

108. **Create AnalyticsService for yield comparisons**
    - Hint: Compare yields across different strategies

109. **Add scheduled vault rebalancing**
    - Hint: Auto-shift positions based on APY changes

110. **Implement yield compounding automation**
    - Hint: Auto-reinvest earned yields into vault

111. **Add batch withdrawal processing**
    - Hint: Process multiple withdrawals with single transaction

112. **Create referral system**
    - Hint: Track referrals and distribute rewards

113. **Add social sharing for vault performance**
    - Hint: Generate shareable vault performance cards

114. **Implement vault whitelisting**
    - Hint: Allow owners to restrict vault access

115. **Add time-based vault locking**
    - Hint: Lock deposits until specific date

116. **Create emergency withdrawal feature**
    - Hint: Allow withdrawal despite vault issues

117. **Add multi-signature vault approval**
    - Hint: Require multiple approvals for large operations

118. **Implement vault pause/resume**
    - Hint: Admin ability to pause vault operations

119. **Add gasless transaction support**
    - Hint: Meta-transactions for better UX

120. **Create vault performance oracle**
    - Hint: External data source for vault metrics

### API Extensions (121-140)

121. **Add GraphQL API layer**
    - Hint: Alternative to REST with flexible queries

122. **Create REST API pagination headers**
    - Hint: Link headers for next/prev pages

123. **Add async webhook delivery system**
    - Hint: Queue and retry webhook notifications

124. **Implement API key management**
    - Hint: Per-user API keys with permissions

125. **Add request signing for webhooks**
    - Hint: HMAC verification for payloads

126. **Create WebSocket room management**
    - Hint: Dynamic room creation for events

127. **Add file upload service**
    - Hint: Support document uploads for verification

128. **Implement search API for vaults**
    - Hint: Full-text search with filters

129. **Add bulk operations endpoint**
    - Hint: Process multiple operations in one request

130. **Create export scheduling feature**
    - Hint: Schedule recurring exports

131. **Add real-time price feed integration**
    - Hint: Connect to price oracle for vault valuation

132. **Implement subscription billing**
    - Hint: Tiered API access based on subscription

133. **Add IP allowlisting for API access**
    - Hint: Security feature for enterprise customers

134. **Create API usage analytics**
    - Hint: Track and report API consumption

135. **Add request replay protection**
    - Hint: Idempotency keys for all mutations

136. **Implement API response caching**
    - Hint: CDN-friendly cache headers

137. **Add data export rate limiting**
    - Hint: Prevent abuse of export endpoints

138. **Create custom field support**
    - Hint: Allow custom metadata on entities

139. **Add audit log API**
    - Hint: Retrieve audit history for compliance

140. **Implement soft delete for entities**
    - Hint: Recover deleted data within grace period

### Frontend Features (141-150)

141. **Add vault performance charting**
    - Hint: `harvest-finance/frontend/src/components/YieldChart.tsx`; enhance with historical data

142. **Create mobile-responsive vault list**
    - Hint: `harvest-finance/frontend/src/app/dashboard/mobile/page.tsx`; improve mobile UX

143. **Add wallet connection persistence**
    - Hint: Store wallet selection across sessions

144. **Implement push notifications**
    - Hint: Web Push API for deposit/withdrawal alerts

145. **Add dark mode toggle**
    - Hint: Use next-themes for theme switching

146. **Create vault comparison view**
    - Hint: Side-by-side vault performance comparison

147. **Add transaction history export**
    - Hint: Export user's transaction history

148. **Implement keyboard shortcuts**
    - Hint: Power user navigation shortcuts

149. **Add onboarding tutorial**
    - Hint: Interactive guide for new users

150. **Create vault health dashboard**
    - Hint: Show active/inactive vault status

## Wave 4: Advanced / Strategic (151-200)
*Performance optimization, security hardening, architecture, observability, and scalability*

### Security Issues (151-170)

151. **Fix CORS security in RealtimeGateway**
    - Hint: `harvest-finance/backend/src/realtime/realtime.gateway.ts`; replace `origin: '*'` with whitelist

152. **Add input sanitization for Stellar transaction XDR**
    - Hint: `harvest-finance/backend/src/auth/strategies/stellar.strategy.ts`; validate XDR size limits

153. **Implement rate limiting for password reset**
    - Hint: `harvest-finance/backend/src/auth/auth.service.ts`; add per-email rate limits

154. **Add SQL injection protection for dynamic queries**
    - Hint: `harvest-finance/backend/src/soroban/soroban-indexer.service.ts`; use parameterized queries

155. **Add request size limits for uploads**
    - Hint: `harvest-finance/backend/src/app.module.ts`; add body parser limits

156. **Implement CSRF protection for state-changing endpoints**
    - Hint: Add CSRF tokens for non-GET requests

157. **Add security headers middleware**
    - Hint: Helmet.js configuration for XSS, HSTS, CSP

158. **Audit JWT refresh token storage**
    - Hint: `harvest-finance/backend/src/auth/auth.service.ts`; hash tokens in database

159. **Add vault access control checks**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; verify owner permissions

160. **Implement secret rotation mechanism**
    - Hint: Key rotation for JWT secrets and Stellar keys

161. **Add audit logging for sensitive operations**
    - Hint: Log all vault modifications and fund transfers

162. **Implement IP-based anomaly detection**
    - Hint: Alert on suspicious login patterns

163. **Add two-factor authentication support**
    - Hint: TOTP integration for user accounts

164. **Implement session invalidation on password change**
    - Hint: Revoke all sessions when password is changed

165. **Add validation for Stellar network passphrase**
    - Hint: Prevent testnet/mainnet confusion attacks

166. **Add secrets encryption at rest**
    - Hint: Encrypt sensitive values in database

167. **Implement role-based access control**
    - Hint: Fine-grained permissions for vault operations

168. **Add audit log tamper detection**
    - Hint: Hash chain for log integrity verification

169. **Implement device fingerprint tracking**
    - Hint: Track devices for suspicious activity

170. **Add transaction replay protection**
    - Hint: Nonce tracking for Stellar transactions

### Performance Issues (171-190)

171. **Add database connection pooling optimization**
    - Hint: `harvest-finance/backend/src/database/data-source.ts`; tune pool settings

172. **Implement query result caching for vault lists**
    - Hint: Cache public vault queries for 60 seconds

173. **Add Redis caching for expensive calculations**
    - Hint: `harvest-finance/backend/src/vaults/vaults.service.ts`; cache APY history

174. **Optimize SorobanIndexerService batch inserts**
    - Hint: `harvest-finance/backend/src/soroban/soroban-indexer.service.ts`; use COPY for bulk inserts

175. **Add database indexes for frequent queries**
    - Hint: Index vault owner_id, deposit user_id, status

176. **Implement background job for notifications**
    - Hint: Use Bull queue for async notification sending

177. **Add pagination cursor optimization**
    - Hint: Keyset pagination instead of offset for large datasets

178. **Implement lazy loading for vault deposits**
    - Hint: Only load deposits when requested

179. **Add compression for API responses**
    - Hint: Enable gzip compression in main.ts

180. **Optimize Stellar SDK calls with connection pooling**
    - Hint: Reuse HTTP agents for Horizon connections

181. **Add memory profiling for large operations**
    - Hint: Monitor heap usage during batch processing

182. **Implement streaming responses for large exports**
    - Hint: `harvest-finance/backend/src/export/export.service.ts`; use streams instead of buffers

183. **Add query complexity limits**
    - Hint: Prevent overly complex GraphQL queries

184. **Optimize WebSocket connection handling**
    - Hint: Use rooms efficiently, limit broadcast size

185. **Add CDN caching for static assets**
    - Hint: Cache frontend assets with long TTL

186. **Add request timeouts for external API calls**
    - Hint: Prevent hanging on unresponsive services

187. **Implement query result streaming**
    - Hint: Stream large query results to avoid memory spikes

188. **Add database read replica support**
    - Hint: Route read queries to replicas

189. **Optimize vault aggregation queries**
    - Hint: Pre-compute totals with materialized views

190. **Add connection timeout configuration**
    - Hint: Configure timeouts for all external connections

### Architecture & Observability (191-200)

191. **Add distributed tracing with OpenTelemetry**
    - Hint: Trace requests across services

192. **Implement custom metrics for business KPIs**
    - Hint: Track deposits, withdrawals, vault creations

193. **Add structured logging for audit trail**
    - Hint: JSON logs with correlation IDs

194. **Implement circuit breaker dashboard**
    - Hint: Monitor Stellar service health

195. **Add health check aggregation**
    - Hint: Single endpoint for all dependency health

196. **Implement graceful degradation for services**
    - Hint: Fallback responses when services are down

197. **Add performance benchmarks CI check**
    - Hint: Fail CI on performance regressions

198. **Create system architecture diagram**
    - Hint: Document component interactions and data flow

199. **Add deployment runbook**
    - Hint: Document rollback, scaling procedures

200. **Implement chaos engineering tests**
    - Hint: Regular failure injection testing