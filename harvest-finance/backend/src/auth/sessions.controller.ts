import { Controller, Get, Delete, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async getSessions(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.authService.getSessions(req.user.id, page, limit);
  }

  @Delete(':sessionId')
  async revokeSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.authService.revokeSession(req.user.id, sessionId);
  }

  @Delete()
  async revokeAllSessions(@Request() req) {
    // Pass current access token or current session ID if available, to exempt it
    // For simplicity, assuming req.user has the current sessionId attached
    const currentSessionId = req.user.sessionId;
    return this.authService.revokeAllSessions(req.user.id, currentSessionId);
  }
}
