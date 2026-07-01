import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  RevokeSessionResponseDto,
  SessionListResponseDto,
  SessionPaginationQueryDto,
} from './dto/session.dto';

@ApiTags('Sessions')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'auth/sessions',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly authService: AuthService) {}

  /**
   * List all active sessions for the authenticated user.
   *
   * Each item includes device name, IP address, User-Agent, and the
   * last-used timestamp so the user can identify unfamiliar devices.
   * The caller's own current session is flagged with `isCurrent: true`.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List active sessions',
    description:
      'Returns all active refresh-token sessions for the current user, ' +
      'paginated. Each entry includes device name, IP address, and last-used ' +
      'timestamp. The caller\'s current session is marked with `isCurrent: true`.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiQuery({ name: 'limit', required: false, example: 10, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of active sessions',
    type: SessionListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(
    @Req() req: Request,
    @Query() query: SessionPaginationQueryDto,
  ): Promise<SessionListResponseDto> {
    const user = req.user as any;
    const currentSessionId: string | undefined = user?.sessionId;

    return this.authService.getSessions(
      user.id,
      query.page,
      query.limit,
      currentSessionId,
    );
  }

  /**
   * Revoke a specific session by its ID.
   *
   * A user can only revoke sessions that belong to them. Attempting to revoke
   * a session owned by another user returns 404.
   */
  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke a specific session',
    description:
      'Permanently invalidates the refresh token associated with the given ' +
      'session ID. The affected device will need to log in again.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'UUID of the session to revoke',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    type: RevokeSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @Req() req: Request,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<RevokeSessionResponseDto> {
    const user = req.user as any;
    return this.authService.revokeSession(user.id, sessionId);
  }

  /**
   * Revoke all sessions except the current one.
   *
   * Designed for "sign out all other devices" functionality. The caller
   * remains signed in; every other active session is deleted so those
   * refresh tokens can no longer be used.
   *
   * The current session is identified via the `sessionId` claim in the JWT.
   * If no `sessionId` claim is present (tokens issued before this feature),
   * all sessions are revoked.
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all other sessions',
    description:
      'Invalidates every active refresh-token session for the current user ' +
      'except the one used to make this request. ' +
      'Other devices will need to log in again.',
  })
  @ApiResponse({
    status: 200,
    description: 'All other sessions revoked',
    type: RevokeSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeAllSessions(
    @Req() req: Request,
  ): Promise<RevokeSessionResponseDto> {
    const user = req.user as any;
    // sessionId is embedded in the JWT payload by AuthService.generateTokens
    const currentSessionId: string | undefined = user?.sessionId;
    return this.authService.revokeAllSessions(user.id, currentSessionId);
  }
}
