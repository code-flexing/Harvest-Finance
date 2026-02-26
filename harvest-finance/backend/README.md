<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>

## Description

Harvest Finance Backend - Agricultural Marketplace API with JWT Authentication and Role-Based Access Control (RBAC).

## Project Setup

```bash
# Install dependencies
$ npm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

```env
# Application
PORT=5000

# Database (TypeORM + PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=harvest_finance

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=super_secret_jwt_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

## Authentication Guide

### Overview

The system implements JWT-based authentication with Role-Based Access Control (RBAC) supporting four roles:

- **FARMER** - Agricultural product sellers
- **BUYER** - Product purchasers
- **INSPECTOR** - Quality verification personnel
- **ADMIN** - System administrators

### User Registration

Register a new user with the following endpoint:

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "farmer@example.com",
  "password": "SecurePass123!",
  "role": "FARMER",
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "stellar_address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "farmer@example.com",
    "role": "FARMER",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "stellar_address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

### User Login

Login with email and password:

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "farmer@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "farmer@example.com",
    "role": "FARMER",
    "full_name": "John Doe"
  }
}
```

### Token Usage

The access token should be included in the Authorization header for protected routes:

```bash
GET /api/v1/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiration:**
- Access Token: 1 hour
- Refresh Token: 7 days

### Refresh Token Flow

When the access token expires, use the refresh token to get a new one:

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

To logout and invalidate the current token:

```bash
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Password Reset

Request a password reset:

```bash
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "farmer@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, a reset link will be sent"
}
```

Reset password with token:

```bash
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "abc123def456...",
  "new_password": "NewSecurePass123!"
}
```

### Role-Based Access Control

Use the `@Roles()` decorator to protect routes based on user roles:

```typescript
import { Roles } from './auth/decorators/roles.decorator';
import { UserRole } from './database/entities/user.entity';
import { RolesGuard } from './auth/guards/roles.guard';

@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  // Only FARMER and ADMIN can create orders
  @Post()
  @Roles(UserRole.FARMER, UserRole.ADMIN)
  async createOrder() {
    // ...
  }

  // All authenticated users can view orders
  @Get()
  async getOrders() {
    // ...
  }

  // Only ADMIN can delete orders
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteOrder() {
    // ...
  }
}
```

### Rate Limiting

The API implements rate limiting to prevent brute force attacks:

- **Registration:** 5 requests per 15 minutes
- **Login:** 10 requests per 15 minutes
- **General:** Configurable via ThrottlerModule

## API Documentation

Interactive API documentation is available at `/api/docs` when the server is running.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Security Checklist

✅ Passwords are hashed using bcrypt (salt rounds = 10)  
✅ Secrets stored in environment variables  
✅ Input validation using class-validator  
✅ SQL injection prevention via TypeORM parameterized queries  
✅ JWT tokens signed with secure secrets  
✅ Token blacklist for logout  
✅ Rate limiting for brute force protection  
✅ Passwords never returned in responses  

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
