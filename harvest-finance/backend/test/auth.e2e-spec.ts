import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/database/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePass123!',
    role: UserRole.FARMER,
    full_name: 'Test User',
    phone_number: '+1234567890',
    stellar_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  };

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should reject invalid email format', async () => {
      const invalidUser = {
        ...testUser,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should reject weak password', async () => {
      const weakPasswordUser = {
        email: `new_${Date.now()}@example.com`,
        password: 'weak',
        role: UserRole.FARMER,
        full_name: 'Test User',
        phone_number: '+1234567890',
        stellar_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(weakPasswordUser)
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user).toHaveProperty('email', testUser.email);
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      refreshToken = response.body.refresh_token;
    });

    it('should refresh access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid_token' })
        .expect(401);
    });
  });

  describe('/api/v1/auth/logout (POST)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = response.body.access_token;
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  describe('/api/v1/auth/forgot-password (POST)', () => {
    it('should return success for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return success for non-existent user (prevent enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('/api/v1/auth/reset-password (POST)', () => {
    let userRepository;
    const plaintextToken = 'valid-test-token-12345';
    const expiredToken = 'expired-test-token-12345';
    const testUserEmail = `reset_user_${Date.now()}@example.com`;
    const expiredUserEmail = `expired_user_${Date.now()}@example.com`;

    beforeAll(async () => {
      userRepository = app.get(getRepositoryToken(User));

      // Create a user with a valid reset token
      const hashedValidToken = await bcrypt.hash(plaintextToken, 10);
      const validUser = userRepository.create({
        email: testUserEmail,
        password: await bcrypt.hash('OldPassword123!', 10),
        role: UserRole.FARMER,
        firstName: 'Reset',
        lastName: 'User',
        isActive: true,
        resetPasswordToken: hashedValidToken,
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour in future
      });
      await userRepository.save(validUser);

      // Create a user with an expired reset token
      const hashedExpiredToken = await bcrypt.hash(expiredToken, 10);
      const expiredUser = userRepository.create({
        email: expiredUserEmail,
        password: await bcrypt.hash('OldPassword123!', 10),
        role: UserRole.FARMER,
        firstName: 'Expired',
        lastName: 'User',
        isActive: true,
        resetPasswordToken: hashedExpiredToken,
        resetPasswordExpires: new Date(Date.now() - 3600000), // 1 hour in past
      });
      await userRepository.save(expiredUser);
    });

    it('should reject invalid signature (invalid token)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token-signature',
          new_password: 'NewSecurePass123!',
        })
        .expect(400); // BadRequestException
    });

    it('should reject expired token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: expiredToken,
          new_password: 'NewSecurePass123!',
        })
        .expect(400); // BadRequestException
    });

    it('should successfully reset password (happy path)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: plaintextToken,
          new_password: 'NewSecurePass123!',
        })
        .expect(201); // Created by default for POST unless overridden

      expect(response.body).toHaveProperty('success', true);

      // Verify the user can login with the new password
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: 'NewSecurePass123!',
        })
        .expect(200);
        
      expect(loginResponse.body).toHaveProperty('access_token');
    });

    it('should reject reused token', async () => {
      // Trying to reset again with the same token should fail
      // because the token was cleared in the happy path
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: plaintextToken,
          new_password: 'AnotherPassword123!',
        })
        .expect(400);
    });
  });
});
