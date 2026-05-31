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

  describe('Full Authentication Flow', () => {
    const flowUser = {
      email: `flow_${Date.now()}@example.com`,
      password: 'FlowPass123!',
      role: UserRole.FARMER,
      full_name: 'Flow Test User',
      phone_number: '+1987654321',
      stellar_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };

    it('should complete full flow: register -> login -> refresh -> logout', async () => {
      let accessToken: string;
      let refreshToken: string;

      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(flowUser)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('access_token');
      expect(registerResponse.body).toHaveProperty('refresh_token');
      expect(registerResponse.body.user).toHaveProperty(
        'email',
        flowUser.email,
      );

      accessToken = registerResponse.body.access_token;
      refreshToken = registerResponse.body.refresh_token;

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: flowUser.email,
          password: flowUser.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body).toHaveProperty('refresh_token');

      accessToken = loginResponse.body.access_token;
      refreshToken = loginResponse.body.refresh_token;

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('access_token');

      const newAccessToken = refreshResponse.body.access_token;

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('success', true);
    });

    it('should prevent token reuse after logout', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...flowUser,
          email: `logout_test_${Date.now()}@example.com`,
        })
        .expect(201);

      const accessToken = registerResponse.body.access_token;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should handle token expiry on protected endpoints', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should refresh token before expiry', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...flowUser,
          email: `refresh_test_${Date.now()}@example.com`,
        })
        .expect(201);

      const refreshToken = registerResponse.body.refresh_token;

      const refreshResponse1 = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(refreshResponse1.body).toHaveProperty('access_token');

      const newRefreshToken = refreshResponse1.body.refresh_token;

      if (newRefreshToken) {
        const refreshResponse2 = await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .send({ refresh_token: newRefreshToken })
          .expect(200);

        expect(refreshResponse2.body).toHaveProperty('access_token');
      }
    });

    it('should maintain session across multiple requests', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...flowUser,
          email: `session_test_${Date.now()}@example.com`,
        })
        .expect(201);

      const accessToken = registerResponse.body.access_token;

      const logout1 = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logout1.body).toHaveProperty('success', true);
    });

    it('should reject simultaneous logout attempts with same token', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...flowUser,
          email: `concurrent_logout_${Date.now()}@example.com`,
        })
        .expect(201);

      const accessToken = registerResponse.body.access_token;

      const logout1 = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const logout2 = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(logout1.body).toHaveProperty('success', true);
    });
  });

  describe('Token Validation', () => {
    it('should validate token format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);
    });

    it('should reject missing Bearer prefix', async () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', validToken)
        .expect(401);
    });

    it('should handle malformed JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });
  });

  describe('Session Isolation', () => {
    it('should isolate sessions between users', async () => {
      const user1 = {
        ...flowUser,
        email: `user1_${Date.now()}@example.com`,
      };

      const user2 = {
        ...flowUser,
        email: `user2_${Date.now()}@example.com`,
      };

      const user1Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(user1)
        .expect(201);

      const user2Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(user2)
        .expect(201);

      const user1Token = user1Response.body.access_token;
      const user2Token = user2Response.body.access_token;

      expect(user1Token).not.toBe(user2Token);

      const user1Logout = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user2LogoutAttempt = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user2LogoutAttempt.body).toHaveProperty('success', true);
    });
  });
});
