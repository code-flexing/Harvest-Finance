const fs = require('fs');
const path = require('path');

const authServicePath = path.join(__dirname, 'backend/src/auth/auth.service.ts');
let authService = fs.readFileSync(authServicePath, 'utf8');

authService = authService.replace(
  "import { RegisterDto } from './dto/register.dto';",
  "import * as zxcvbn from 'zxcvbn';\nimport * as crypto from 'crypto';\nimport { Session } from '../database/entities/session.entity';\nimport { RegisterDto } from './dto/register.dto';"
);

authService = authService.replace(
  "@InjectRepository(UserOAuthLink)\n    private oauthLinkRepository: Repository<UserOAuthLink>,",
  "@InjectRepository(UserOAuthLink)\n    private oauthLinkRepository: Repository<UserOAuthLink>,\n    @InjectRepository(Session)\n    private sessionRepository: Repository<Session>,"
);

authService = authService.replace(
  "    // Hash password\n    const hashedPassword = await bcrypt.hash(password, this.saltRounds);",
  "    await this.validatePasswordStrength(password);\n\n    // Hash password\n    const hashedPassword = await bcrypt.hash(password, this.saltRounds);"
);

authService = authService.replace(
  "    // Store refresh token in database\n    const hashedRefreshToken = await bcrypt.hash(refreshToken, this.saltRounds);\n    await this.userRepository.update(user.id, {\n      refreshToken: hashedRefreshToken,\n    });",
  "    // Store refresh token in database (Session)\n    const hashedRefreshToken = await bcrypt.hash(refreshToken, this.saltRounds);\n    const session = this.sessionRepository.create({\n      user,\n      refreshToken: hashedRefreshToken,\n      userAgent: 'Unknown', // Typically passed from request\n      ipAddress: 'Unknown', // Typically passed from request\n      lastUsedAt: new Date(),\n      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),\n    });\n    await this.sessionRepository.save(session);"
);

// Add the new methods before the last closing brace
authService = authService.replace(/}\s*$/, `
  async validatePasswordStrength(password: string): Promise<void> {
    const result = zxcvbn(password);
    if (result.score < 3 || password.length < 12) {
      throw new BadRequestException('Password is too weak. Must be at least 12 characters.');
    }
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    try {
      const response = await fetch(\`https://api.pwnedpasswords.com/range/\${prefix}\`);
      const text = await response.text();
      if (text.includes(suffix)) {
        throw new BadRequestException('Password has been found in a data breach. Please choose another.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn('Failed to check HIBP API', 'AuthService');
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: this.configService.get('JWT_SECRET') || 'super_secret_jwt_key' });
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (user) {
        user.emailVerifiedAt = new Date();
        await this.userRepository.save(user);
        return { success: true };
      }
    } catch (e) {
      throw new BadRequestException('Invalid or expired token');
    }
    throw new BadRequestException('User not found');
  }

  async resendVerification(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const token = await this.jwtService.signAsync({ sub: user.id }, { secret: this.configService.get('JWT_SECRET') || 'super_secret_jwt_key', expiresIn: '24h' });
    this.logger.log(\`Resending verification to \${user.email}: \${token}\`, 'AuthService');
    return { success: true };
  }

  async getSessions(userId: string, page: number, limit: number) {
    const [items, total] = await this.sessionRepository.findAndCount({
      where: { user: { id: userId } },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.sessionRepository.delete({ id: sessionId, user: { id: userId } });
    return { success: true };
  }

  async revokeAllSessions(userId: string, currentSessionId?: string) {
    const query = this.sessionRepository.createQueryBuilder().delete().where('user_id = :userId', { userId });
    if (currentSessionId) {
      query.andWhere('id != :currentSessionId', { currentSessionId });
    }
    await query.execute();
    return { success: true };
  }
}
`);

fs.writeFileSync(authServicePath, authService);

const authControllerPath = path.join(__dirname, 'backend/src/auth/auth.controller.ts');
let authController = fs.readFileSync(authControllerPath, 'utf8');

if (!authController.includes('verify-email')) {
    authController = authController.replace(/}\s*$/, `
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  async resendVerification(@Request() req) {
    return this.authService.resendVerification(req.user.id);
  }
}
`);
    authController = authController.replace(
      "import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Get, Req } from '@nestjs/common';",
      "import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Get, Req, Query } from '@nestjs/common';"
    );
    fs.writeFileSync(authControllerPath, authController);
}
console.log("Patched auth module");
